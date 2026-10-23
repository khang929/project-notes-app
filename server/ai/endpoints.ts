import { authenticate, AuthContext } from './auth.js';
import { AiError, toAiError } from './gemini.js';
import { addUsage, checkBudget, checkRate } from './limits.js';
import { logUsage } from './store.js';
import { assistantTask } from './assistant.js';
import { analyzeImageTask, summarizeTask, suggestTagsTask, TaskResult } from './tasks.js';

export type EndpointName = 'assistant' | 'summarize' | 'suggest-tags' | 'analyze-image';

export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
}

export interface ApiResponse {
  status: number;
  json: any;
}

const TASKS: Record<EndpointName, (auth: AuthContext, body: any) => Promise<TaskResult>> = {
  assistant: assistantTask,
  summarize: summarizeTask,
  'suggest-tags': suggestTagsTask,
  'analyze-image': analyzeImageTask,
};

/**
 * "Cổng" duy nhất của backend AI (lớp Backend — trung tâm điều khiển):
 * xác thực → giới hạn tốc độ → giới hạn chi phí → chạy tác vụ → ghi nhật ký → xử lý lỗi.
 * server.ts (local) và api/ai/*.ts (Vercel) đều chỉ gọi hàm này.
 */
export async function runEndpoint(name: EndpointName, req: ApiRequest): Promise<ApiResponse> {
  if (req.method && req.method !== 'POST') return { status: 405, json: { error: 'Method not allowed' } };

  const started = Date.now();
  let auth: AuthContext | undefined;
  try {
    auth = await authenticate(req.headers);
    checkRate(auth.userId);
    checkBudget(auth.userId);

    const result = await TASKS[name](auth, req.body || {});

    addUsage(auth.userId, result.meta.totalTokens || 0);
    await logUsage(auth, {
      route: result.meta.route,
      model: result.meta.model,
      promptTokens: result.meta.promptTokens,
      outputTokens: result.meta.outputTokens,
      totalTokens: result.meta.totalTokens,
      latencyMs: Date.now() - started,
      status: 'ok',
    });
    return { status: 200, json: result.json };
  } catch (err: any) {
    const e = err instanceof AiError ? err : toAiError(err);
    console.error(`[AI:${name}] ${e.status} ${e.message}`);
    if (auth) {
      await logUsage(auth, { route: name, latencyMs: Date.now() - started, status: 'error', error: e.message });
    }
    return { status: e.status, json: { error: e.message } };
  }
}
