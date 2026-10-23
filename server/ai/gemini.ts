import { GoogleGenAI } from '@google/genai';

export { Type } from '@google/genai';

/** Lỗi có mã HTTP kèm thông báo tiếng Việt để trả thẳng cho người dùng. */
export class AiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'AiError';
    this.status = status;
  }
}

const MISSING_KEY_MESSAGE =
  'Máy chủ chưa có GEMINI_API_KEY. Hãy tạo file .env với dòng GEMINI_API_KEY=... rồi chạy lại server.';

let client: GoogleGenAI | null = null;
let clientKey = '';

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') throw new AiError(MISSING_KEY_MESSAGE, 503);
  if (!client || clientKey !== key) {
    client = new GoogleGenAI({ apiKey: key });
    clientKey = key;
  }
  return client;
}

export function toAiError(err: any): AiError {
  if (err instanceof AiError) return err;
  const raw = String(err?.message || err || '');
  const status = Number(err?.status ?? err?.code) || 0;

  if (/default credentials|API key should be set/i.test(raw)) return new AiError(MISSING_KEY_MESSAGE, 503);
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(raw)) {
    return new AiError('AI đang quá tải hoặc đã hết hạn mức miễn phí. Hãy thử lại sau ít phút.', 429);
  }
  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(raw)) {
    return new AiError('GEMINI_API_KEY không hợp lệ hoặc không có quyền. Hãy kiểm tra lại khóa trong file .env.', 502);
  }
  if (status === 404 || /models\/.+ is not found|not found for API version/i.test(raw)) {
    return new AiError('Model Gemini không tồn tại hoặc không còn được hỗ trợ (xem MODELS trong server/ai/config.ts).', 502);
  }
  return new AiError(raw.slice(0, 300) || 'Lỗi không xác định khi gọi AI.', 500);
}

export interface Source {
  title: string;
  url: string;
}

export interface GenResult {
  text: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  sources: Source[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toResult(response: any, model: string): GenResult {
  const usage = response?.usageMetadata || {};
  const chunks: any[] = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const c of chunks) {
    const url = c?.web?.uri;
    if (url && !seen.has(url)) {
      seen.add(url);
      sources.push({ title: c.web.title || url, url });
    }
  }
  const prompt = Number(usage.promptTokenCount) || 0;
  const output = Number(usage.candidatesTokenCount) || 0;
  return {
    text: String(response?.text ?? '').trim(),
    model,
    promptTokens: prompt,
    outputTokens: output,
    totalTokens: Number(usage.totalTokenCount) || prompt + output,
    sources,
  };
}

/**
 * Gọi Gemini, thử lần lượt các model; lỗi tạm thời (429/500/503) được thử lại 1 lần.
 * Ném AiError (đã dịch sang tiếng Việt) nếu tất cả đều thất bại.
 */
export async function generate(params: { models: string[]; contents: any; config?: any }): Promise<GenResult> {
  const ai = getClient();
  let lastError: any = null;
  for (const model of params.models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return toResult(response, model);
      } catch (err: any) {
        lastError = err;
        const status = Number(err?.status) || 0;
        const transient = status === 429 || status === 500 || status === 503;
        if (!transient) break; // đổi sang model kế tiếp
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw toAiError(lastError);
}
