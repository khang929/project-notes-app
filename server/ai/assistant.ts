import type { AuthContext } from './auth.js';
import { AiError } from './gemini.js';
import { LIMITS, ROUTE_LABEL, Route } from './config.js';
import { aiPlan, quickPlan } from './orchestrator.js';
import { Attachment, ChatMsg, HandlerOutput, runRoute } from './handlers.js';
import { verifyOutput } from './verify.js';
import { NoteBrief, loadNotesContext, saveExchange } from './store.js';
import type { TaskResult } from './tasks.js';

export interface Step {
  key: 'auth' | 'plan' | 'run' | 'verify' | 'save';
  label: string;
  detail?: string;
  status: 'ok' | 'warn' | 'skip';
}

function sanitizeMessages(raw: unknown): ChatMsg[] {
  if (!Array.isArray(raw)) throw new AiError('Danh sách tin nhắn không hợp lệ', 400);
  const msgs: ChatMsg[] = raw
    .filter((m: any) => m && typeof m.text === 'string' && m.text.trim())
    .map((m: any) => ({
      role: m.role === 'model' ? ('model' as const) : ('user' as const),
      text: String(m.text).slice(0, LIMITS.maxMessageChars),
    }))
    .slice(-LIMITS.maxMessages);
  while (msgs.length && msgs[0].role === 'model') msgs.shift(); // lượt đầu phải là của người dùng
  if (msgs.length === 0 || msgs[msgs.length - 1].role !== 'user') {
    throw new AiError('Tin nhắn cuối cùng phải là của người dùng', 400);
  }
  return msgs;
}

const ATTACHMENT_MIME = /^(image\/(png|jpe?g|webp|gif|heic|heif)|application\/(pdf|json)|text\/.+)$/;

function sanitizeAttachment(raw: any): Attachment | undefined {
  if (!raw) return undefined;
  if (typeof raw.data !== 'string' || !raw.data) throw new AiError('Tệp đính kèm không hợp lệ', 400);
  const mimeType = String(raw.mimeType || '').toLowerCase();
  if (!ATTACHMENT_MIME.test(mimeType)) {
    throw new AiError('Chỉ hỗ trợ đính kèm ảnh, PDF hoặc tệp văn bản.', 400);
  }
  const data = raw.data.replace(/^data:[^;]+;base64,/, '');
  if ((data.length * 3) / 4 > LIMITS.maxAttachmentBytes) throw new AiError('Tệp đính kèm quá lớn (tối đa 4 MB).', 413);
  return { name: String(raw.name || 'tệp').slice(0, 120), mimeType, data };
}

/**
 * Luồng xử lý của trợ lý chat, bám theo sơ đồ kiến trúc:
 *   (Giao diện) -> Backend đã xác thực + giới hạn -> Điều phối -> Công cụ -> Kiểm tra kết quả -> Lưu trữ
 */
export async function assistantTask(auth: AuthContext, body: any): Promise<TaskResult> {
  const messages = sanitizeMessages(body?.messages);
  const attachment = sanitizeAttachment(body?.attachment);
  const lastUserText = messages[messages.length - 1].text;
  const steps: Step[] = [{ key: 'auth', label: 'Xác thực & phân quyền', detail: auth.email || undefined, status: 'ok' }];

  // Ghi chú lấy từ database (không tin dữ liệu từ trình duyệt). Việc đọc được khởi động SỚM và chạy
  // song song với bước điều phối, nên khi cần dùng thì thường đã có sẵn; kết quả được dùng lại nếu cần thử lại.
  let notesPromise: Promise<NoteBrief[]> | null = null;
  const getNotes = () => {
    if (!notesPromise) notesPromise = loadNotesContext(auth);
    return notesPromise;
  };

  // 1) Điều phối: hiểu yêu cầu, chọn công cụ. Yêu cầu rõ ràng -> chọn ngay (0 ms); mơ hồ -> hỏi AI.
  const quick = quickPlan(lastUserText, !!attachment);
  const needsNotesEarly = quick ? quick.route === 'chat' && quick.needsNotes : true; // mơ hồ -> đọc trước phòng khi là chat
  if (needsNotesEarly) void getNotes();
  const decision = quick ?? (await aiPlan(lastUserText));
  let route: Route = decision.route;
  steps.push({ key: 'plan', label: `Điều phối → ${ROUTE_LABEL[route]}`, detail: decision.reason, status: 'ok' });

  let totalTokens = decision.totalTokens;
  let promptTokens = 0;
  let outputTokens = 0;
  const addUsage = (o: HandlerOutput) => {
    totalTokens += o.totalTokens;
    promptTokens += o.promptTokens;
    outputTokens += o.outputTokens;
  };

  // Ghi chú của người dùng chỉ nạp khi cần (chế độ Trò chuyện, trừ chào hỏi thông thường)
  const notes: NoteBrief[] | null = route === 'chat' && decision.needsNotes ? await getNotes() : null;

  // 2) Chạy công cụ
  let out = await runRoute(route, { messages, notes, attachment });
  addUsage(out);
  steps.push({
    key: 'run',
    label: `${ROUTE_LABEL[route]} · ${out.model}`,
    detail: out.degraded ? 'Công cụ bổ trợ không dùng được, đã trả lời không kèm công cụ' : undefined,
    status: out.degraded ? 'warn' : 'ok',
  });

  // 3) Kiểm tra kết quả; nếu không đạt thì thử lại bằng chế độ Trò chuyện
  let verdict = verifyOutput(out.text, route, out.sources.length);
  if (!verdict.ok && route !== 'chat' && route !== 'file') {
    route = 'chat';
    out = await runRoute('chat', { messages, notes: await getNotes() });
    addUsage(out);
    verdict = verifyOutput(out.text, route, out.sources.length);
    steps.push({ key: 'run', label: `Thử lại bằng ${ROUTE_LABEL.chat} · ${out.model}`, status: 'warn' });
  }
  if (!verdict.ok) throw new AiError('AI không tạo được câu trả lời hợp lệ. Hãy thử diễn đạt lại câu hỏi.', 502);
  steps.push({
    key: 'verify',
    label: 'Kiểm tra kết quả',
    detail: verdict.issues.length ? verdict.issues.join('; ') : 'Đạt',
    status: verdict.issues.length ? 'warn' : 'ok',
  });

  // 4) Lưu lịch sử trò chuyện
  const sources = out.sources;
  const userLabel = attachment ? `[Đính kèm: ${attachment.name}] ${lastUserText}` : lastUserText;
  const conversationId = await saveExchange(auth, {
    conversationId: typeof body?.conversationId === 'string' ? body.conversationId : undefined,
    userText: userLabel,
    reply: verdict.text,
    route,
    sources,
    steps,
  });
  steps.push({
    key: 'save',
    label: 'Lưu lịch sử trò chuyện',
    detail: conversationId ? undefined : 'Chưa lưu được (kiểm tra bảng ai_* trong Supabase)',
    status: conversationId ? 'ok' : 'skip',
  });

  return {
    json: {
      reply: verdict.text,
      route,
      routeLabel: ROUTE_LABEL[route],
      model: out.model,
      steps,
      sources,
      conversationId,
      usage: { totalTokens },
    },
    meta: { route: `assistant:${route}`, model: out.model, promptTokens, outputTokens, totalTokens },
  };
}
