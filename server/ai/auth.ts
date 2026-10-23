import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AiError } from './gemini.js';
import { supabaseConfig } from './config.js';

export interface AuthContext {
  userId: string;
  email: string;
  /** Client Supabase chạy với quyền của chính người dùng này (Row Level Security tự lọc dữ liệu). */
  db: SupabaseClient;
}

type Headers = Record<string, string | string[] | undefined>;

// Mỗi tin nhắn chat trước đây đều phải gọi mạng tới Supabase chỉ để hỏi "token này của ai?".
// Nay nhớ kết quả trong tối đa 60 giây (và không bao giờ quá hạn của chính token), nên các tin nhắn
// liên tiếp bỏ qua được bước này. Đổi lại, token bị thu hồi có thể còn dùng được tối đa ~60 giây.
// Mọi truy vấn dữ liệu vẫn chạy bằng chính token của người dùng (RLS), nên không mở rộng quyền truy cập.
const AUTH_CACHE_MS = 60_000;
const AUTH_CACHE_MAX = 500;
const authCache = new Map<string, { userId: string; email: string; until: number }>();

/** Đọc thời điểm hết hạn (ms) trong JWT; 0 nếu không đọc được. Chỉ dùng để giới hạn cache, không dùng để tin token. */
function tokenExpiryMs(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8'));
    return typeof payload?.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/** Lớp "Xác thực & phân quyền": chỉ người đã đăng nhập mới được gọi AI. */
export async function authenticate(headers: Headers): Promise<AuthContext> {
  const raw = headers['authorization'] ?? headers['Authorization'];
  const header = Array.isArray(raw) ? raw[0] : raw;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new AiError('Bạn cần đăng nhập để dùng tính năng AI.', 401);

  const { url, key } = supabaseConfig();
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const cached = authCache.get(token);
  if (cached && cached.until > Date.now()) return { userId: cached.userId, email: cached.email, db };

  let user: any = null;
  try {
    const { data, error } = await db.auth.getUser(token);
    if (!error) user = data?.user;
  } catch {
    throw new AiError('Không kết nối được Supabase để xác thực. Hãy kiểm tra mạng.', 503);
  }
  if (!user) throw new AiError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.', 401);

  const until = Math.min(Date.now() + AUTH_CACHE_MS, tokenExpiryMs(token) - 5_000);
  if (until > Date.now()) {
    if (authCache.size >= AUTH_CACHE_MAX) authCache.clear();
    authCache.set(token, { userId: user.id, email: user.email || '', until });
  }

  return { userId: user.id, email: user.email || '', db };
}
