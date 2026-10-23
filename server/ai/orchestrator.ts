import { Type, generate } from './gemini.js';
import { LIMITS, MODELS, Route } from './config.js';
import { guessRoute, quickRoute } from './route-rules.js';

export interface Decision {
  route: Route;
  reason: string;
  via: 'rule' | 'ai';
  totalTokens: number;
  /** Có cần nạp ghi chú của người dùng vào ngữ cảnh không (chỉ có ý nghĩa với route 'chat'). */
  needsNotes: boolean;
}

// Giữ lại để các nơi khác (nếu có) vẫn import được từ orchestrator.
export { guessRoute };

/** Chạy promise nhưng bỏ cuộc sau `ms` mili-giây (để một lượt phân loại chậm không kéo dài cả câu trả lời). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Bộ định tuyến AI phản hồi quá chậm')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Bước 1 (tức thì, không gọi mạng): chọn công cụ nếu yêu cầu đã rõ ràng.
 *  - Có tệp đính kèm  -> file
 *  - Chào hỏi / hỏi về ghi chú / viết code / tra cứu tin tức rõ ràng -> theo luật từ khóa
 * Trả về null nếu yêu cầu mơ hồ -> cần hỏi AI (aiPlan).
 */
export function quickPlan(lastUserText: string, hasAttachment: boolean): Decision | null {
  if (hasAttachment) {
    return { route: 'file', reason: 'Yêu cầu có kèm tệp cần đọc/phân tích', via: 'rule', totalTokens: 0, needsNotes: false };
  }
  const quick = quickRoute(lastUserText);
  return quick ? { ...quick, via: 'rule', totalTokens: 0 } : null;
}

/** Bước 2 (chỉ khi mơ hồ): hỏi một model nhỏ, rẻ để phân loại: chat / code / search. */
export async function aiPlan(lastUserText: string): Promise<Decision> {
  try {
    const res = await withTimeout(
      generate({
        models: MODELS.fast,
        contents: `Yêu cầu của người dùng:\n"""\n${lastUserText.slice(0, 1500)}\n"""`,
        config: {
          systemInstruction: `Bạn là bộ điều phối của ứng dụng ghi chú cá nhân. Chọn đúng MỘT công cụ cho yêu cầu:
- "chat": hỏi đáp, giải thích, viết nội dung, hoặc hỏi về/tìm trong CHÍNH các ghi chú của người dùng.
- "code": viết, sửa, giải thích code, thuật toán, lập trình, cần chạy thử/tính toán.
- "search": cần thông tin mới hoặc có thật ở bên ngoài (tin tức, giá cả, sự kiện, số liệu hiện tại) và nên kiểm chứng trên mạng.
Trả lời JSON gồm "route" và "reason" (một câu ngắn tiếng Việt).`,
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              route: { type: Type.STRING, enum: ['chat', 'code', 'search'] },
              reason: { type: Type.STRING },
            },
            required: ['route', 'reason'],
          },
        },
      }),
      LIMITS.routerTimeoutMs,
    );
    const parsed = JSON.parse(res.text || '{}');
    if (parsed.route === 'chat' || parsed.route === 'code' || parsed.route === 'search') {
      return {
        route: parsed.route,
        reason: String(parsed.reason || '').slice(0, 160) || 'AI phân loại yêu cầu',
        via: 'ai',
        totalTokens: res.totalTokens,
        needsNotes: true,
      };
    }
  } catch {
    // lỗi hoặc quá chậm -> rơi xuống đoán bằng từ khóa
  }
  const route = guessRoute(lastUserText);
  return {
    route,
    reason: 'Phân loại bằng từ khóa (bộ định tuyến AI không phản hồi kịp)',
    via: 'rule',
    totalTokens: 0,
    needsNotes: true,
  };
}

/**
 * Lớp "AI Orchestrator": hiểu yêu cầu và chọn công cụ phù hợp.
 * Ưu tiên luật nhanh (0 ms); chỉ hỏi AI khi yêu cầu thật sự mơ hồ.
 */
export async function plan(lastUserText: string, hasAttachment: boolean): Promise<Decision> {
  return quickPlan(lastUserText, hasAttachment) ?? aiPlan(lastUserText);
}
