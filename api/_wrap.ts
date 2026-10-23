import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runEndpoint, EndpointName } from '../server/ai/endpoints.js';

// Chuyển yêu cầu của Vercel vào "cổng" AI dùng chung với server.ts.
export function vercelHandler(name: EndpointName) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const result = await runEndpoint(name, { method: req.method, headers: req.headers, body: req.body });
    res.status(result.status).json(result.json);
  };
}
