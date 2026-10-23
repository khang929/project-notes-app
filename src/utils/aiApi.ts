import { supabase } from '../lib/supabase';
import { AiRoute, AiSource, AiStep, ChatMessage } from '../types';

/**
 * Gửi yêu cầu tới backend AI kèm phiên đăng nhập (JWT của Supabase).
 * Backend dùng token này để xác thực, phân quyền và đọc đúng ghi chú của người dùng.
 */
export async function aiPost(path: string, body: unknown): Promise<Response> {
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    /* không có phiên -> server sẽ trả 401 */
  }
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const ROUTE_LABELS: Record<AiRoute, string> = {
  chat: 'Trò chuyện',
  code: 'Lập trình',
  search: 'Tra cứu',
  file: 'Xử lý tệp',
};

/** Tải cuộc trò chuyện gần nhất từ Supabase (bảng ai_conversations / ai_messages). */
export async function loadLatestConversation(): Promise<{ conversationId: string; messages: ChatMessage[] } | null> {
  try {
    const { data: conv, error } = await supabase
      .from('ai_conversations')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !conv) return null;

    const { data: rows, error: msgError } = await supabase
      .from('ai_messages')
      .select('id, role, content, route, sources, steps, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (msgError || !rows) return null;

    const messages: ChatMessage[] = rows.map((r: any) => {
      const route = (['chat', 'code', 'search', 'file'] as AiRoute[]).includes(r.route) ? (r.route as AiRoute) : undefined;
      return {
        id: String(r.id),
        role: r.role === 'user' ? 'user' : 'model',
        text: String(r.content ?? ''),
        timestamp: timeOf(r.created_at),
        route,
        routeLabel: route ? ROUTE_LABELS[route] : undefined,
        steps: Array.isArray(r.steps) ? (r.steps as AiStep[]) : undefined,
        sources: Array.isArray(r.sources) ? (r.sources as AiSource[]) : undefined,
      };
    });
    return { conversationId: conv.id as string, messages };
  } catch {
    return null; // bảng chưa tạo hoặc chưa đăng nhập: bỏ qua, chat vẫn dùng được
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    await supabase.from('ai_conversations').delete().eq('id', id);
  } catch {
    /* bỏ qua */
  }
}
