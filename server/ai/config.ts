// Cấu hình chung cho toàn bộ backend AI.
// Dùng chung cho server.ts (chạy local) và api/ai/*.ts (chạy trên Vercel).

export type Route = 'chat' | 'code' | 'search' | 'file';

export const ROUTE_LABEL: Record<Route, string> = {
  chat: 'Trò chuyện',
  code: 'Lập trình',
  search: 'Tra cứu',
  file: 'Xử lý tệp',
};

// Giới hạn yêu cầu & chi phí (lớp "Backend — trung tâm điều khiển")
export const LIMITS = {
  requestsPerMinute: 20, // mỗi người dùng
  dailyTokensPerUser: 300_000, // ngân sách token mỗi ngày (đặt lại khi server khởi động lại)
  maxMessages: 20, // số tin nhắn gần nhất gửi cho AI
  maxMessageChars: 6000,
  maxAttachmentBytes: 4 * 1024 * 1024,
  maxTextAttachmentChars: 30_000,
  maxNotesInContext: 30,
  maxNoteChars: 400,
  maxOutputChars: 12_000,
  routerTimeoutMs: 3000, // quá thời gian này, bước phân loại bằng AI bị bỏ qua và dùng luật từ khóa
};

// Thử lần lượt từng model trong danh sách nếu model đứng trước bị lỗi
export const MODELS = {
  fast: ['gemini-3.1-flash-lite', 'gemini-flash-latest'],
  smart: ['gemini-flash-latest', 'gemini-3.1-flash-lite'],
};

// Đọc lúc gọi hàm (không đọc lúc import) vì dotenv nạp file .env sau khi import xong.
export function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://yadogitxzcbioudjhonp.supabase.co',
    // Publishable key: an toàn để công khai, bảo mật nhờ Row Level Security
    key:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      'sb_publishable__CMdYreSvsFtOzXg3y5tKQ_x-3CfB24',
  };
}
