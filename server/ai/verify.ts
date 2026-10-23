import { LIMITS, Route } from './config.js';

export interface Verdict {
  ok: boolean;
  text: string;
  issues: string[];
}

/**
 * Lớp "Kiểm tra kết quả và giám sát": đánh giá đầu ra trước khi trả cho người dùng.
 *  - Rỗng            -> không đạt (để điều phối thử lại bằng chế độ khác)
 *  - Quá dài         -> cắt bớt
 *  - Tra cứu mà không có nguồn -> cảnh báo
 */
export function verifyOutput(text: string, route: Route, sourceCount: number): Verdict {
  const issues: string[] = [];
  let out = (text || '').trim();

  if (!out) return { ok: false, text: '', issues: ['Câu trả lời rỗng'] };

  if (out.length > LIMITS.maxOutputChars) {
    out = out.slice(0, LIMITS.maxOutputChars).trimEnd() + '\n\n…(đã cắt bớt vì quá dài)';
    issues.push('Câu trả lời quá dài, đã cắt bớt');
  }
  if (route === 'search' && sourceCount === 0) {
    issues.push('Không có nguồn tham khảo kèm theo, hãy tự kiểm chứng thông tin');
  }
  return { ok: true, text: out, issues };
}
