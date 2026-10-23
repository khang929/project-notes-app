import type { Route } from './config.js';

// Luật chọn công cụ bằng từ khóa. File này KHÔNG phụ thuộc thư viện nào nên chạy tức thì.
// Mục đích: với những yêu cầu đã rõ ràng (chào hỏi, hỏi về ghi chú, viết code, tra cứu tin tức...)
// thì chọn công cụ ngay, không cần tốn thêm một lượt gọi AI chỉ để phân loại.
// Yêu cầu mơ hồ -> trả về null để orchestrator hỏi model nhỏ như trước.

export interface QuickRoute {
  route: Route;
  reason: string;
  /** Có cần nạp ghi chú của người dùng vào ngữ cảnh không (chỉ áp dụng cho route 'chat'). */
  needsNotes: boolean;
}

/** Bỏ dấu tiếng Việt + chữ thường, để "ghi chú" và "ghi chu" đều khớp. */
export const fold = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Khớp nguyên cụm từ (không khớp nửa chừng, ví dụ "tim tin" không khớp trong "tim tinh"). */
const matcher = (terms: string[]) =>
  new RegExp(`(^|[^a-z0-9])(${terms.map(escapeRe).join('|')})($|[^a-z0-9])`);

// Các từ khóa dưới đây đã viết ở dạng không dấu.
const CODE_RE = matcher([
  'code', 'python', 'javascript', 'typescript', 'java', 'sql', 'regex', 'react', 'html', 'css',
  'bug', 'debug', 'function', 'algorithm', 'unit test', 'c++', 'c#',
  'lap trinh', 'viet ham', 'viet code', 'sua code', 'loi cu phap', 'thuat toan', 'chay thu',
]);

// Từ khóa tra cứu RÕ RÀNG (thông tin bên ngoài, thay đổi theo thời gian)
const SEARCH_STRONG_RE = matcher([
  'google', 'internet', 'search', 'tren mang', 'tin tuc', 'thoi tiet', 'ty gia', 'gia vang',
  'gia bitcoin', 'gia usd', 'nguon tham khao', 'kiem chung', 'tin moi nhat', 'tim tin',
]);

// Từ khóa tra cứu MƠ HỒ: chỉ dùng cho bước dự phòng khi AI định tuyến không phản hồi
const SEARCH_WEAK_RE = matcher(['hom nay', 'moi nhat', 'tim kiem', 'tra cuu', 'hien tai', 'gan day']);

// Nhắc tới ghi chú của chính người dùng
const NOTES_RE = matcher(['ghi chu', 'note', 'notes']);

const GREETING_RE =
  /^(xin chao|chao|hello|hi|hey|alo|good morning|good evening|good afternoon|cam on|thanks|thank you|thank|ok|oke|okay|tam biet|bye|hen gap lai)( [a-z ]{1,15})?$/;
const ABOUT_BOT_RE = /^ban (la ai|lam duoc gi|co the lam gi|co khoe khong|khoe khong)$/;

/**
 * Chọn công cụ ngay lập tức nếu yêu cầu đủ rõ ràng; ngược lại trả về null.
 * Thứ tự: mâu thuẫn/mơ hồ -> null (để AI quyết định) · code · tra cứu · hỏi về ghi chú · chào hỏi.
 */
export function quickRoute(text: string): QuickRoute | null {
  const t = fold(text);
  const fenced = text.includes('```');
  const code = fenced || CODE_RE.test(t);
  const search = SEARCH_STRONG_RE.test(t);
  const notes = NOTES_RE.test(t);

  if (code && search) return null;

  if (code) {
    // "Tóm tắt ghi chú về lập trình Python của tôi" là hỏi về ghi chú, không phải nhờ viết code -> để AI quyết định
    if (notes && !fenced) return null;
    return { route: 'code', reason: 'Nhận diện nhanh: yêu cầu liên quan đến lập trình', needsNotes: false };
  }

  if (search) {
    if (notes) return null; // "tìm trên mạng" hay "tìm trong ghi chú"? -> để AI quyết định
    return { route: 'search', reason: 'Nhận diện nhanh: cần tra cứu thông tin bên ngoài', needsNotes: false };
  }

  if (notes) {
    return { route: 'chat', reason: 'Nhận diện nhanh: hỏi về ghi chú của bạn', needsNotes: true };
  }

  const clean = t.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length > 0 && clean.length <= 40 && (GREETING_RE.test(clean) || ABOUT_BOT_RE.test(clean))) {
    return { route: 'chat', reason: 'Nhận diện nhanh: chào hỏi thông thường', needsNotes: false };
  }

  return null;
}

/** Dự phòng khi bộ định tuyến AI lỗi hoặc quá chậm: đoán chế độ bằng từ khóa. */
export function guessRoute(text: string): Route {
  const t = fold(text);
  if (text.includes('```') || CODE_RE.test(t)) return 'code';
  if (NOTES_RE.test(t)) return 'chat';
  if (SEARCH_STRONG_RE.test(t) || SEARCH_WEAK_RE.test(t)) return 'search';
  return 'chat';
}
