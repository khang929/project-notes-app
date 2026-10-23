import { AuthContext } from './auth.js';
import { LIMITS } from './config.js';
import type { Source } from './gemini.js';

// Lớp "Cơ sở dữ liệu và kho tệp". Mọi truy vấn chạy bằng quyền của người dùng (RLS),
// nên không thể đọc hay ghi dữ liệu của người khác. Nếu bảng AI chưa được tạo trong
// Supabase (chưa chạy supabase/ai_schema.sql) thì chỉ cảnh báo, AI vẫn trả lời bình thường.

export interface NoteBrief {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  pinned: boolean;
  updated_at: string;
}

let warned = false;
function warnOnce(what: string, err: unknown) {
  if (warned) return;
  warned = true;
  console.warn(`[AI] Không ${what} được (đã chạy supabase/ai_schema.sql chưa?):`, (err as any)?.message || err);
}

/** Lấy ghi chú của CHÍNH người dùng từ database — không tin dữ liệu do trình duyệt gửi lên. */
export async function loadNotesContext(auth: AuthContext): Promise<NoteBrief[]> {
  try {
    const { data, error } = await auth.db
      .from('notes')
      .select('id,title,content,tags,pinned,updated_at')
      .eq('user_id', auth.userId)
      .order('updated_at', { ascending: false })
      .limit(LIMITS.maxNotesInContext);
    if (error) throw error;
    return (data as NoteBrief[]) || [];
  } catch (err) {
    console.warn('[AI] Không tải được ghi chú để làm ngữ cảnh:', (err as any)?.message || err);
    return [];
  }
}

export interface SaveExchangeInput {
  conversationId?: string;
  userText: string;
  reply: string;
  route: string;
  sources: Source[];
  steps: unknown[];
}

/**
 * Lưu một lượt hỏi-đáp vào lịch sử trò chuyện. Trả về id cuộc trò chuyện (hoặc undefined nếu không lưu được).
 * Tối ưu số lượt gọi mạng nối tiếp:
 *  - Cuộc trò chuyện mới: tạo (kèm updated_at luôn) -> thêm tin nhắn          (2 lượt, trước đây 3)
 *  - Cuộc trò chuyện cũ : thêm tin nhắn  ∥  cập nhật updated_at, chạy song song (1 lượt, trước đây 2)
 */
export async function saveExchange(auth: AuthContext, input: SaveExchangeInput): Promise<string | undefined> {
  try {
    let conversationId = input.conversationId;
    const now = Date.now();
    // Đặt created_at khác nhau để thứ tự hiển thị luôn đúng (câu hỏi trước, câu trả lời sau)
    const userAt = new Date(now).toISOString();
    const modelAt = new Date(now + 1).toISOString();
    const isNew = !conversationId;

    if (!conversationId) {
      const { data, error } = await auth.db
        .from('ai_conversations')
        .insert({
          title: input.userText.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Cuộc trò chuyện mới',
          updated_at: modelAt,
        })
        .select('id')
        .single();
      if (error) throw error;
      conversationId = (data as any).id as string;
    }

    const insertMessages = auth.db.from('ai_messages').insert([
      {
        conversation_id: conversationId,
        role: 'user',
        content: input.userText,
        created_at: userAt,
      },
      {
        conversation_id: conversationId,
        role: 'model',
        content: input.reply,
        route: input.route,
        sources: input.sources,
        steps: input.steps,
        created_at: modelAt,
      },
    ]);
    const touchConversation = isNew
      ? Promise.resolve({ error: null })
      : auth.db.from('ai_conversations').update({ updated_at: modelAt }).eq('id', conversationId);

    const [{ error: msgError }] = await Promise.all([insertMessages, touchConversation]);
    if (msgError) throw msgError;
    return conversationId;
  } catch (err) {
    warnOnce('lưu lịch sử trò chuyện', err);
    return undefined;
  }
}

export interface UsageLog {
  route: string;
  model?: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  status: 'ok' | 'error';
  error?: string;
}

/** Ghi nhật ký lỗi & chi phí (token) cho mỗi yêu cầu AI. */
export async function logUsage(auth: AuthContext, log: UsageLog): Promise<void> {
  try {
    const { error } = await auth.db.from('ai_usage_logs').insert({
      route: log.route,
      model: log.model ?? null,
      prompt_tokens: log.promptTokens ?? 0,
      output_tokens: log.outputTokens ?? 0,
      total_tokens: log.totalTokens ?? 0,
      latency_ms: log.latencyMs,
      status: log.status,
      error: log.error ? log.error.slice(0, 500) : null,
    });
    if (error) throw error;
  } catch (err) {
    warnOnce('ghi nhật ký sử dụng', err);
  }
}
