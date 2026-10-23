import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runEndpoint, EndpointName } from './server/ai/endpoints';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '25mb' }));

// Toàn bộ logic AI nằm trong server/ai/*. Mỗi endpoint chỉ chuyển yêu cầu vào "cổng" chung
// (xác thực -> giới hạn -> điều phối -> công cụ -> kiểm tra -> lưu trữ). Trên Vercel,
// các file api/ai/*.ts gọi cùng cổng này.
const AI_ENDPOINTS: EndpointName[] = ['assistant', 'summarize', 'suggest-tags', 'analyze-image'];
for (const name of AI_ENDPOINTS) {
  app.post(`/api/ai/${name}`, async (req, res) => {
    const result = await runEndpoint(name, { method: req.method, headers: req.headers, body: req.body });
    res.status(result.status).json(result.json);
  });
}

// Khi chạy từ bản build (dist/server.js) thì __dirname chính là thư mục dist,
// nên file giao diện nằm ngay cạnh; khi chạy dev (tsx server.ts) thì nằm ở ./dist.
const RUNNING_FROM_DIST = path.basename(__dirname) === 'dist';
const STATIC_DIR = RUNNING_FROM_DIST ? __dirname : path.resolve(__dirname, 'dist');

// Setup Vite or static serving
async function setupServer() {
  // Chạy từ dist/ luôn là production (không cần đặt NODE_ENV, tiện cho cả Windows)
  const isProduction = process.env.NODE_ENV === 'production' || RUNNING_FROM_DIST;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const fs = await import('fs');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      // Do not intercept API requests
      if (url.startsWith('/api/')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        next(e);
      }
    });
  } else {
    app.use(express.static(STATIC_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(STATIC_DIR, 'index.html'));
    });
  }

  // Các nền tảng hosting (Render, Railway, Heroku...) cấp cổng qua biến PORT
  const port = Number(process.env.PORT) || 3000;

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (mode: ${isProduction ? 'prod' : 'dev'})`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
