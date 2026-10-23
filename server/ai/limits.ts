import { AiError } from './gemini.js';
import { LIMITS } from './config.js';

// Bộ đếm lưu trong bộ nhớ của server. Trên Vercel (serverless) chúng được đặt lại khi
// hàm "ngủ"; số liệu chính xác nằm ở bảng ai_usage_logs trong Supabase.
const hits = new Map<string, number[]>();
const daily = new Map<string, { day: string; tokens: number }>();

const today = () => new Date().toISOString().slice(0, 10);

/** Giới hạn tốc độ: tối đa N yêu cầu AI mỗi phút cho mỗi người dùng. */
export function checkRate(userId: string): void {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < 60_000);
  if (recent.length >= LIMITS.requestsPerMinute) {
    throw new AiError(`Bạn gửi yêu cầu AI quá nhanh (tối đa ${LIMITS.requestsPerMinute} lần/phút). Hãy đợi một chút.`, 429);
  }
  recent.push(now);
  hits.set(userId, recent);
}

/** Quản lý chi phí: chặn khi người dùng dùng hết ngân sách token trong ngày. */
export function checkBudget(userId: string): void {
  const entry = daily.get(userId);
  if (entry && entry.day === today() && entry.tokens >= LIMITS.dailyTokensPerUser) {
    throw new AiError('Bạn đã dùng hết hạn mức AI của hôm nay. Hãy quay lại vào ngày mai.', 429);
  }
}

export function addUsage(userId: string, tokens: number): void {
  const day = today();
  const entry = daily.get(userId);
  if (!entry || entry.day !== day) daily.set(userId, { day, tokens });
  else entry.tokens += tokens;
}
