import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Loader2, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Paperclip,
  MessageSquare,
  Code,
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { AiRoute, ChatMessage, Note } from '../types';
import { MarkdownText } from './MarkdownText';
import { aiPost, deleteConversation, loadLatestConversation } from '../utils/aiApi';
import { prepareChatAttachment } from '../utils/importFiles';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  userId?: string;
  onCreateNoteFromAi: (title: string, content: string) => void;
}

const nowTime = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const welcomeMessage = (text?: string): ChatMessage => ({
  id: `welcome-${Date.now()}`,
  role: 'model',
  text:
    text ||
    'Xin chào! Tôi là Trợ lý AI Ghi Chú. Tôi tự chọn cách xử lý phù hợp cho từng yêu cầu: **trò chuyện** về ghi chú của bạn, **lập trình** (có thể chạy thử code), **tra cứu** thông tin trên mạng kèm nguồn, hoặc **đọc tệp** bạn đính kèm (ảnh, PDF, văn bản). Bạn cần giúp gì hôm nay?',
  timestamp: nowTime(),
});

const ROUTE_ICON: Record<AiRoute, React.ReactNode> = {
  chat: <MessageSquare className="w-3 h-3" />,
  code: <Code className="w-3 h-3" />,
  search: <Search className="w-3 h-3" />,
  file: <FileText className="w-3 h-3" />,
};

const STEP_DOT: Record<string, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  skip: 'bg-slate-400',
};

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  notes,
  userId,
  onCreateNoteFromAi,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedFor = useRef<string | null>(null);

  // Đổi tài khoản -> bắt đầu lại, không để lộ cuộc trò chuyện của người trước
  useEffect(() => {
    loadedFor.current = null;
    setConversationId(null);
    setMessages([welcomeMessage()]);
  }, [userId]);

  // Mở khung chat lần đầu -> nạp lịch sử trò chuyện gần nhất từ database
  useEffect(() => {
    if (!isOpen || !userId || loadedFor.current === userId) return;
    loadedFor.current = userId;
    loadLatestConversation().then((conv) => {
      if (loadedFor.current !== userId || !conv || conv.messages.length === 0) return;
      setConversationId(conv.conversationId);
      setMessages(conv.messages);
    });
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    'Tóm tắt các đầu việc cần làm trong ghi chú của tôi',
    'Viết hàm Python kiểm tra số nguyên tố và chạy thử',
    'Tìm tin mới nhất về trí tuệ nhân tạo',
  ];

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttachError(null);
    setAttachment(file);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if ((!text && !attachment) || isLoading) return;

    const file = attachment;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text || 'Hãy tóm tắt tệp này.',
      timestamp: nowTime(),
      attachmentName: file?.name,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setAttachment(null);
    setAttachError(null);
    setIsLoading(true);

    try {
      const attachmentPayload = file ? await prepareChatAttachment(file) : undefined;

      // Ghi chú KHÔNG gửi từ trình duyệt: server tự đọc ghi chú của đúng người dùng từ database
      const res = await aiPost('/api/ai/assistant', {
        messages: nextMessages
          .filter((m) => !m.id.startsWith('err-'))
          .map((m) => ({ role: m.role, text: m.text }))
          .slice(-20), // server cũng chỉ dùng 20 tin gần nhất -> không gửi thừa
        conversationId,
        attachment: attachmentPayload,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        /* không phải JSON */
      }
      if (!res.ok) {
        throw new Error(data?.error || `Máy chủ AI báo lỗi (${res.status})`);
      }

      if (data.conversationId) setConversationId(data.conversationId);

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Tôi đã tiếp nhận thông tin.',
        timestamp: nowTime(),
        route: data.route,
        routeLabel: data.routeLabel,
        steps: Array.isArray(data.steps) ? data.steps : undefined,
        sources: Array.isArray(data.sources) ? data.sources : undefined,
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `Đã xảy ra lỗi: ${err.message || 'Không thể kết nối đến máy chủ AI.'}`,
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateNoteFromMessage = (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const titleCandidate = lines[0]?.replace(/^[#*-\s]+/, '').slice(0, 60) || 'Ghi chú từ Trợ lý AI';
    onCreateNoteFromAi(titleCandidate, text);
  };

  const handleClearHistory = async () => {
    if (conversationId && !window.confirm('Xóa toàn bộ lịch sử cuộc trò chuyện này?')) return;
    if (conversationId) await deleteConversation(conversationId);
    setConversationId(null);
    setOpenSteps({});
    setMessages([welcomeMessage('Lịch sử trò chuyện đã được xóa. Bạn muốn hỏi gì tiếp theo?')]);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Trợ lý Ghi Chú AI
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tự chọn: Trò chuyện • Lập trình • Tra cứu • Tệp · {notes.length} ghi chú
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            title="Xóa lịch sử trò chuyện"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {isUser && m.attachmentName && (
                    <div className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-[11px]">
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[220px]">{m.attachmentName}</span>
                    </div>
                  )}
                  {isUser ? <p className="whitespace-pre-line">{m.text}</p> : <MarkdownText text={m.text} />}
                </div>

                {/* Chế độ AI đã chọn, tiến trình và nguồn tham khảo */}
                {!isUser && m.route && (
                  <div className="space-y-1.5 px-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                        {ROUTE_ICON[m.route]}
                        {m.routeLabel}
                      </span>
                      {m.steps && m.steps.length > 0 && (
                        <button
                          onClick={() => setOpenSteps((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                          className="inline-flex items-center gap-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <span>Tiến trình xử lý</span>
                          {openSteps[m.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    {openSteps[m.id] && m.steps && (
                      <ol className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-3">
                        {m.steps.map((st, idx) => (
                          <li key={`${st.key}-${idx}`} className="flex gap-2">
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${STEP_DOT[st.status] || 'bg-slate-400'}`} />
                            <span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">{st.label}</span>
                              {st.detail && <span className="block">{st.detail}</span>}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {m.sources && m.sources.length > 0 && (
                      <div className="text-[11px] space-y-0.5">
                        <div className="font-semibold text-slate-500 dark:text-slate-400">Nguồn tham khảo</div>
                        {m.sources
                          .filter((src) => /^https?:\/\//i.test(src.url))
                          .slice(0, 6)
                          .map((src, idx) => (
                            <a
                              key={idx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{src.title}</span>
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-actions for AI message */}
                {!isUser && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                    <span className="font-mono tabular-nums">{m.timestamp}</span>
                    <button
                      onClick={() => handleCopy(m.id, m.text)}
                      className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-0.5"
                      title="Sao chép câu trả lời"
                    >
                      {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === m.id ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                    <button
                      onClick={() => handleCreateNoteFromMessage(m.text)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                      title="Lưu thành ghi chú mới"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Lưu thành ghi chú</span>
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-slate-400 text-xs py-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-2xl">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>AI đang điều phối, chọn công cụ và trả lời...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 bg-slate-50/50 dark:bg-slate-900/50">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp)}
            disabled={isLoading}
            className="text-[11px] px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-full"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        {(attachment || attachError) && (
          <div className="flex items-center gap-2 text-[11px]">
            {attachment && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 max-w-full">
                <Paperclip className="w-3 h-3 shrink-0" />
                <span className="truncate">{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} title="Bỏ tệp đính kèm" className="ml-0.5 hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {attachError && <span className="text-rose-500">{attachError}</span>}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePickFile}
            accept="image/*,application/pdf,text/*,.md,.csv,.json,.txt"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Đính kèm ảnh, PDF hoặc tệp văn bản (tối đa 3 MB)"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 disabled:opacity-40 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi về ghi chú, nhờ viết code, tra cứu hoặc đính kèm tệp..."
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            type="submit"
            disabled={(!input.trim() && !attachment) || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
