import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for reliable Gemini generation with retries
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
      } catch (err: any) {
        lastError = err;
        // If 503 or transient, wait briefly before next attempt
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

// Endpoint: AI Note Summarization
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!content && !title) {
      return res.status(400).json({ error: 'Nội dung hoặc tiêu đề không được để trống' });
    }

    const prompt = `Hãy tóm tắt ngắn gọn và súc tích nội dung ghi chú sau đây bằng tiếng Việt:
Tiêu đề: ${title || '(Không có tiêu đề)'}
Nội dung:
${content || '(Không có nội dung)'}

Yêu cầu:
- Tóm tắt thành 2-4 gạch đầu dòng các điểm mấu chốt quan trọng nhất hoặc 1 đoạn ngắn súc tích.
- Nêu rõ hành động cần thực hiện nếu có.
- Trình bày dạng văn bản định dạng rõ ràng, chuyên nghiệp.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction: 'Bạn là chuyên gia phân tích và tóm tắt thông tin ghi chú cá nhân bằng tiếng Việt.',
        temperature: 0.3,
      },
    });

    const summary = response.text?.trim() || 'Không thể tạo tóm tắt vào lúc này.';
    return res.json({ summary });
  } catch (error: any) {
    console.error('Error in /api/ai/summarize:', error);
    return res.status(500).json({
      error: error?.message || 'Lỗi xử lý tóm tắt với Gemini AI',
    });
  }
});

// Endpoint: AI Tag Suggestions
app.post('/api/ai/suggest-tags', async (req, res) => {
  try {
    const { title, content, existingTags } = req.body;
    if (!content && !title) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tiêu đề hoặc nội dung để gợi ý thẻ' });
    }

    const prompt = `Phân tích tiêu đề và nội dung ghi chú sau đây để gợi ý từ 3 đến 5 thẻ (tags) phân loại phù hợp nhất bằng tiếng Việt:
Tiêu đề: ${title || ''}
Nội dung: ${content || ''}
${existingTags && existingTags.length ? `Các thẻ hiện tại của ứng dụng: ${existingTags.join(', ')}` : ''}

Quy tắc:
- Mỗi thẻ chỉ từ 1 đến 3 từ (ví dụ: 'Công việc', 'Học tập', 'Ý tưởng', 'Kế hoạch', 'Mua sắm', 'Tài chính', 'Sức khỏe').
- Tránh thẻ dài hoặc câu hoàn chỉnh.
- Ưu tiên tái sử dụng các thẻ thông dụng nếu phù hợp.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Danh sách 3 đến 5 thẻ ngắn gọn phù hợp',
            },
          },
          required: ['tags'],
        },
      },
    });

    let tags: string[] = [];
    try {
      const parsed = JSON.parse(response.text || '{}');
      if (Array.isArray(parsed.tags)) {
        tags = parsed.tags.map((t: string) => t.trim()).filter(Boolean);
      }
    } catch {
      tags = ['Công việc', 'Ghi nhớ', 'Ý tưởng'];
    }

    return res.json({ tags });
  } catch (error: any) {
    console.error('Error in /api/ai/suggest-tags:', error);
    return res.status(500).json({
      error: error?.message || 'Lỗi khi gợi ý thẻ với Gemini AI',
    });
  }
});

// Endpoint: Multi-turn Note Chatbot
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, notesContext } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Danh sách tin nhắn không hợp lệ' });
    }

    let notesSummaryText = 'Danh sách ghi chú hiện tại của người dùng trong ứng dụng:\n';
    if (notesContext && Array.isArray(notesContext) && notesContext.length > 0) {
      notesSummaryText += notesContext
        .slice(0, 30)
        .map(
          (n: any, idx: number) =>
            `${idx + 1}. [${n.isPinned ? 'ĐÃ GHIM' : 'Bình thường'}] Tiêu đề: "${n.title || 'Không tiêu đề'}" | Thẻ: ${
              n.tags ? n.tags.join(', ') : 'Không'
            } | Cập nhật: ${n.updatedAt || ''}\nNội dung: ${
              n.content ? n.content.slice(0, 400) + (n.content.length > 400 ? '...' : '') : '(Trống)'
            }`
        )
        .join('\n---\n');
    } else {
      notesSummaryText += '(Hiện tại người dùng chưa có ghi chú nào hoặc ghi chú trống)';
    }

    const systemInstruction = `Bạn là Trợ lý AI Quản Lý Ghi Chú Cá Nhân thông minh và tận tâm, giao tiếp bằng tiếng Việt.
Bạn có quyền truy cập vào danh mục ghi chú của người dùng được cung cấp dưới đây để trả lời câu hỏi, tìm kiếm thông tin, tóm tắt, đề xuất ý tưởng, lên kế hoạch hoặc giúp soạn thảo ghi chú mới.

NGỮ CẢNH GHI CHÚ CỦA NGƯỜI DÙNG:
${notesSummaryText}

Hướng dẫn:
- Trả lời bằng tiếng Việt tự nhiên, thân thiện, rõ ràng và sử dụng định dạng Markdown đẹp mắt.
- Khi người dùng hỏi về thông tin có trong ghi chú, hãy trích dẫn tiêu đề ghi chú tương ứng để họ dễ tìm kiếm.
- Nếu người dùng yêu cầu tạo mới hoặc viết tiếp một ghi chú, hãy cung cấp tiêu đề gợi ý và nội dung mẫu chu đáo.
- Không bịa đặt thông tin nếu không có trong ghi chú mà hãy nói rõ.`;

    // Map messages to Gemini format
    const contents = messages.map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({ reply: response.text || 'Xin lỗi, tôi chưa thể trả lời lúc này.' });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Lỗi khi trò chuyện với Gemini AI',
    });
  }
});

// Endpoint: Analyze Image / OCR Note
app.post('/api/ai/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Chưa có dữ liệu hình ảnh' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const actualMimeType = mimeType || 'image/jpeg';

    const prompt = `Hãy đóng vai trò là chuyên gia quét tài liệu & nhận diện chữ (OCR).
Hãy đọc hình ảnh này (có thể là chữ viết tay, văn bản in, biên lai, bảng trắng, slide hoặc ảnh chụp màn hình ghi chú) và trích xuất thành một ghi chú hoàn chỉnh bằng tiếng Việt.
Cung cấp:
1. "title": Tiêu đề súc tích, phản ánh đúng chủ đề của ảnh.
2. "content": Toàn bộ nội dung hoặc tóm lược chi tiết có cấu trúc Markdown (gạch đầu dòng, tiêu đề con nếu có).
3. "tags": Danh sách 2-4 thẻ phân loại phù hợp (ví dụ: 'Tài liệu', 'Học tập', 'Hóa đơn', 'Viết tay', 'Ý tưởng').`;

    const response = await generateContentWithFallback({
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: actualMimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Tiêu đề ghi chú' },
            content: { type: Type.STRING, description: 'Nội dung trích xuất dạng Markdown' },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Danh sách thẻ phù hợp',
            },
          },
          required: ['title', 'content', 'tags'],
        },
      },
    });

    let result = { title: 'Ghi chú từ hình ảnh', content: '', tags: ['Hình ảnh'] };
    try {
      result = JSON.parse(response.text || '{}');
    } catch {
      result.content = response.text || '';
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/ai/analyze-image:', error);
    return res.status(500).json({
      error: error?.message || 'Lỗi khi phân tích hình ảnh với Gemini AI',
    });
  }
});

// Setup Vite or static serving
async function setupServer() {
  const isProduction = process.env.NODE_ENV === 'production';

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
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = 3000;

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (mode: ${isProduction ? 'prod' : 'dev'})`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
