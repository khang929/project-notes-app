import React, { useState, useEffect } from 'react';
import { aiPost } from '../utils/aiApi';
import { 
  X, 
  Sparkles, 
  Pin, 
  Tag as TagIcon, 
  Loader2, 
  Bold, 
  Italic, 
  List, 
  CheckSquare, 
  Heading, 
  Clock,
  Palette,
  Check,
  Trash2
} from 'lucide-react';
import { Note, NoteColor } from '../types';
import { COLOR_SCHEMES } from '../utils/format';
import { MarkdownText } from './MarkdownText';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<boolean> | boolean | void;
  onDeleteNote?: (note: Note) => void;
  editingNote?: Note | null;
  existingAppTags: string[];
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDeleteNote,
  editingNote,
  existingAppTags,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState<NoteColor>('default');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // AI states
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState<string | null>(null);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [modalSummary, setModalSummary] = useState<string | null>(null);

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title);
      setContent(editingNote.content);
      setTags(editingNote.tags || []);
      setIsPinned(editingNote.isPinned);
      setColor(editingNote.color || 'default');
      setModalSummary(editingNote.summary || null);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
      setIsPinned(false);
      setColor('default');
      setModalSummary(null);
    }
    setSuggestedTags([]);
    setTagError(null);
    setValidationError(null);
  }, [editingNote, isOpen]);

  // Handle ESC and Ctrl+Enter / Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleFormSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, content, tags, isPinned, color, isSaving]);

  if (!isOpen) return null;

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // AI: Gợi ý thẻ bằng AI
  const handleSuggestTags = async () => {
    if (!title.trim() && !content.trim()) {
      setTagError('Hãy nhập tiêu đề hoặc nội dung trước khi gợi ý thẻ!');
      return;
    }

    setIsSuggestingTags(true);
    setTagError(null);
    try {
      const res = await aiPost('/api/ai/suggest-tags', { title, content, existingTags: existingAppTags });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi yêu cầu gợi ý thẻ');
      }
      if (Array.isArray(data.tags)) {
        // filter out already existing tags
        const newSuggestions = data.tags.filter((t: string) => !tags.includes(t));
        setSuggestedTags(newSuggestions);
      }
    } catch (err: any) {
      console.error(err);
      setTagError(err.message || 'Không thể lấy gợi ý thẻ từ AI');
    } finally {
      setIsSuggestingTags(false);
    }
  };

  // AI: Tóm tắt nhanh nội dung
  const handleSummarizeContent = async () => {
    if (!content.trim() && !title.trim()) {
      setValidationError('Vui lòng nhập nội dung hoặc tiêu đề để tóm tắt!');
      return;
    }

    setIsSummarizing(true);
    setValidationError(null);
    try {
      const res = await aiPost('/api/ai/summarize', { title, content });
      const data = await res.json();
      if (res.ok && data.summary) {
        setModalSummary(data.summary);
      } else {
        setValidationError(data.error || 'Lỗi khi tóm tắt');
      }
    } catch {
      setValidationError('Lỗi kết nối AI khi tóm tắt');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Insert markdown helpers into textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('note-content-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = prefix + selectedText + suffix;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const handleFormSubmit = async () => {
    if (isSaving) return;
    if (!title.trim() && !content.trim()) {
      setValidationError('Vui lòng nhập tiêu đề hoặc nội dung ghi chú!');
      return;
    }

    setIsSaving(true);
    try {
      const ok = await onSave({
        id: editingNote?.id,
        title: title.trim(),
        content: content.trim(),
        tags,
        isPinned,
        color,
        summary: modalSummary || undefined,
      });
      // Chỉ đóng khi lưu thành công; nếu lỗi thì giữ nguyên nội dung để người dùng thử lại
      if (ok !== false) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Stats
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editingNote ? 'Chỉnh sửa ghi chú' : 'Tạo ghi chú mới'}
            </span>

            {/* Pin Toggle Button */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Bỏ ghim' : 'Ghim ghi chú lên đầu'}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                isPinned
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{isPinned ? 'Đã ghim' : 'Ghim'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Title Input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề ghi chú..."
              className="w-full text-lg sm:text-xl font-bold text-slate-900 dark:text-white placeholder-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
              autoFocus
            />
          </div>

          {/* Quick Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1 py-1.5 px-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 text-xs">
            <button
              type="button"
              onClick={() => insertFormatting('**', '**')}
              title="In đậm"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*')}
              title="In nghiêng"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('## ')}
              title="Tiêu đề đề mục (H2)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- ')}
              title="Gạch đầu dòng"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- [ ] ')}
              title="Danh sách việc cần làm (Checkbox)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting(`[${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}] `)}
              title="Chèn giờ hiện tại"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* AI Summarize in Editor */}
            <button
              type="button"
              onClick={handleSummarizeContent}
              disabled={isSummarizing}
              className="px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-md transition-colors flex items-center gap-1 font-medium ml-auto"
            >
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Tóm tắt AI</span>
            </button>
          </div>

          {/* Content Textarea */}
          <div>
            <textarea
              id="note-content-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung ghi chú ở đây... (hỗ trợ danh sách, gạch đầu dòng, việc cần làm)"
              rows={8}
              className="w-full text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 leading-relaxed resize-y font-normal"
            />
          </div>

          {/* AI Summary in Modal */}
          {modalSummary && (
            <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Bản tóm tắt bằng Gemini AI:
                </span>
                <button
                  type="button"
                  onClick={() => setModalSummary(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px]"
                >
                  Xóa tóm tắt
                </button>
              </div>
              <MarkdownText
                text={modalSummary}
                className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium"
              />
            </div>
          )}

          {/* Tag Section & "Gợi ý thẻ bằng AI" */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-indigo-500" />
                Thẻ phân loại
              </label>

              {/* Requirement 6: Nút "Gợi ý thẻ bằng AI" */}
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={isSuggestingTags}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSuggestingTags ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{isSuggestingTags ? 'Đang gợi ý thẻ...' : 'Gợi ý thẻ bằng AI'}</span>
              </button>
            </div>

            {/* Current Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Add tag input */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(newTagInput);
                    }
                  }}
                  placeholder="+ Thêm thẻ..."
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {newTagInput.trim() && (
                  <button
                    type="button"
                    onClick={() => handleAddTag(newTagInput)}
                    className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg font-medium"
                  >
                    Thêm
                  </button>
                )}
              </div>
            </div>

            {/* AI Suggested Tags List */}
            {suggestedTags.length > 0 && (
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-1.5">
                <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                  Thẻ được AI đề xuất (bấm để thêm):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        handleAddTag(st);
                        setSuggestedTags(suggestedTags.filter((item) => item !== st));
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
                    >
                      <span>+ #{st}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tagError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{tagError}</p>
            )}
          </div>

          {/* Color Palette Selector */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              Màu sắc ghi chú
            </label>
            <div className="flex items-center gap-2">
              {(Object.keys(COLOR_SCHEMES) as NoteColor[]).map((cKey) => {
                const s = COLOR_SCHEMES[cKey];
                const isSelected = color === cKey;
                return (
                  <button
                    key={cKey}
                    type="button"
                    onClick={() => setColor(cKey)}
                    title={s.label}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${s.indicator} ${
                      isSelected ? 'ring-2 ring-offset-2 ring-indigo-600 dark:ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {validationError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
              {validationError}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {editingNote && onDeleteNote && (
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(editingNote);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ghi chú này</span>
              </button>
            )}
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              <span>{wordCount} từ</span> · <span>{charCount} ký tự</span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleFormSubmit}
              disabled={isSaving}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSaving ? 'Đang lưu...' : editingNote ? 'Cập nhật ghi chú' : 'Lưu ghi chú'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
