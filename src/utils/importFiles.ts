import { Note } from '../types';
import { parseNotesJson } from './importNotes';
import { aiPost } from './aiApi';

/**
 * Nhập nhiều loại tệp thành ghi chú:
 *  - JSON sao lưu của app        -> khôi phục nhiều ghi chú
 *  - Văn bản (txt, md, csv, html, mã nguồn, log...) -> 1 ghi chú / tệp
 *  - DOCX                        -> đọc chữ trong tài liệu Word
 *  - Ảnh (png, jpg, webp...)     -> AI quét chữ (OCR)
 *  - PDF                         -> AI đọc nội dung
 */

export const MAX_TEXT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_AI_FILE_BYTES = 3 * 1024 * 1024; // PDF gửi lên AI (Vercel giới hạn ~4,5 MB sau base64)
const MAX_IMAGE_SIDE = 1600;

// Chuỗi dùng cho thuộc tính accept của <input type="file">
export const IMPORT_ACCEPT = '*/*';

const UNSUPPORTED_EXT = new Set([
  'doc', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'pages', 'numbers', 'key',
  'zip', 'rar', '7z', 'tar', 'gz', 'exe', 'dll', 'msi', 'iso', 'dmg', 'apk',
  'mp3', 'wav', 'm4a', 'flac', 'mp4', 'mkv', 'avi', 'mov', 'webm',
]);

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function baseName(name: string): string {
  const i = name.lastIndexOf('.');
  return (i > 0 ? name.slice(0, i) : name).trim() || 'Tệp không tên';
}

function makeNote(title: string, content: string, tags: string[]): Note {
  const now = new Date().toISOString();
  return {
    id: '',
    title: title.slice(0, 200),
    content,
    tags,
    isPinned: false,
    color: 'default',
    createdAt: now,
    updatedAt: now,
  };
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(new Error('Không đọc được tệp.'));
    r.readAsText(file, 'utf-8');
  });
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(new Error('Không đọc được tệp.'));
    r.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(new Error('Không đọc được tệp.'));
    r.readAsArrayBuffer(file);
  });
}

/** Tệp nhị phân thường chứa byte NUL; văn bản thì không. */
async function looksBinary(file: File): Promise<boolean> {
  const buf = new Uint8Array(await readAsArrayBuffer(file.slice(0, 4096) as File));
  return buf.includes(0);
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
  const title = doc.querySelector('title')?.textContent?.trim() || '';
  const text = (doc.body?.innerText || doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  return title && !text.startsWith(title) ? `${title}\n\n${text}` : text;
}

/** Thu nhỏ ảnh để không vượt giới hạn dung lượng khi gửi lên AI. */
export async function imageToJpegDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không mở được ảnh (định dạng không được trình duyệt hỗ trợ).'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
    ctx.fillStyle = '#ffffff'; // nền trắng cho ảnh PNG trong suốt
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function askAi(dataUrl: string, mimeType: string, fallbackTitle: string, fallbackTag: string): Promise<Note> {
  let res: Response;
  try {
    res = await aiPost('/api/ai/analyze-image', { imageBase64: dataUrl, mimeType });
  } catch {
    throw new Error('Không kết nối được máy chủ AI.');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* phản hồi không phải JSON */
  }
  if (!res.ok) throw new Error(data?.error || `Máy chủ AI báo lỗi (${res.status}).`);

  const content = typeof data?.content === 'string' ? data.content : '';
  if (!content.trim()) throw new Error('AI không đọc được nội dung nào trong tệp.');
  const tags: string[] = Array.isArray(data?.tags)
    ? data.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim() !== '').map((t: string) => t.trim())
    : [];
  if (!tags.includes(fallbackTag)) tags.push(fallbackTag);
  return makeNote(
    (typeof data?.title === 'string' && data.title.trim()) || fallbackTitle,
    content,
    tags
  );
}

/** Chuyển một tệp bất kỳ thành danh sách ghi chú. Ném Error (tiếng Việt) nếu không được. */
export async function fileToNotes(file: File): Promise<Note[]> {
  const ext = extOf(file.name);
  const name = baseName(file.name);

  // 1) Ảnh -> OCR
  if (file.type.startsWith('image/')) {
    const dataUrl = await imageToJpegDataUrl(file);
    return [await askAi(dataUrl, 'image/jpeg', name, 'Hình ảnh')];
  }

  // 2) PDF -> AI
  if (file.type === 'application/pdf' || ext === 'pdf') {
    if (file.size > MAX_AI_FILE_BYTES) throw new Error('PDF quá lớn (tối đa 3 MB).');
    const dataUrl = await readAsDataUrl(file);
    return [await askAi(dataUrl, 'application/pdf', name, 'PDF')];
  }

  // 3) DOCX -> mammoth
  if (ext === 'docx') {
    if (file.size > MAX_TEXT_BYTES) throw new Error('Tệp quá lớn (tối đa 5 MB).');
    const mammoth: any = await import('mammoth/mammoth.browser');
    const result = await mammoth.extractRawText({ arrayBuffer: await readAsArrayBuffer(file) });
    const text = String(result?.value ?? '').trim();
    if (!text) throw new Error('Tài liệu Word không có nội dung chữ.');
    return [makeNote(name, text, ['Word'])];
  }

  if (UNSUPPORTED_EXT.has(ext)) {
    throw new Error(`Chưa hỗ trợ định dạng .${ext}. Hãy lưu sang .docx, .pdf hoặc .txt rồi nhập lại.`);
  }

  // 4) Còn lại: coi là văn bản
  if (file.size > MAX_TEXT_BYTES) throw new Error('Tệp quá lớn (tối đa 5 MB).');
  if (file.size === 0) throw new Error('Tệp rỗng.');
  if (await looksBinary(file)) throw new Error('Đây là tệp nhị phân, không đọc được thành chữ.');

  let text = await readAsText(file);
  text = text.replace(/^﻿/, '');

  // JSON sao lưu của app
  if (ext === 'json') {
    try {
      return parseNotesJson(text).notes;
    } catch (err: any) {
      // JSON không phải dạng ghi chú -> nhập nguyên văn như một ghi chú
      if (!/không phải JSON|không đúng định dạng|Không tìm thấy ghi chú/.test(err?.message || '')) throw err;
      if (!text.trim()) throw err;
      return [makeNote(name, text, ['JSON'])];
    }
  }

  if (ext === 'html' || ext === 'htm') {
    text = htmlToText(text);
  }

  if (!text.trim()) throw new Error('Tệp không có nội dung.');
  const tag = ext ? ext.toUpperCase() : 'Văn bản';
  return [makeNote(name, text, [tag])];
}

export interface ImportResult {
  notes: Note[];
  errors: { fileName: string; message: string }[];
}

/** Xử lý lần lượt nhiều tệp; tệp lỗi không làm hỏng các tệp còn lại. */
export async function filesToNotes(files: File[]): Promise<ImportResult> {
  const result: ImportResult = { notes: [], errors: [] };
  for (const file of files) {
    try {
      result.notes.push(...(await fileToNotes(file)));
    } catch (err: any) {
      result.errors.push({ fileName: file.name, message: err?.message || 'Lỗi không xác định' });
    }
  }
  return result;
}

export interface ChatAttachment {
  name: string;
  mimeType: string;
  data: string; // base64, không có tiền tố data:
}

const TEXT_MIME_BY_EXT: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  html: 'text/html',
  htm: 'text/html',
  xml: 'text/xml',
  log: 'text/plain',
};

/** Chuẩn bị tệp đính kèm trong khung chat AI (ảnh, PDF hoặc văn bản, tối đa 3 MB). */
export async function prepareChatAttachment(file: File): Promise<ChatAttachment> {
  const ext = extOf(file.name);
  if (file.size > MAX_AI_FILE_BYTES) throw new Error('Tệp quá lớn (tối đa 3 MB).');

  let dataUrl: string;
  let mimeType: string;
  if (file.type.startsWith('image/')) {
    dataUrl = await imageToJpegDataUrl(file);
    mimeType = 'image/jpeg';
  } else if (file.type === 'application/pdf' || ext === 'pdf') {
    dataUrl = await readAsDataUrl(file);
    mimeType = 'application/pdf';
  } else if (TEXT_MIME_BY_EXT[ext] || file.type.startsWith('text/')) {
    dataUrl = await readAsDataUrl(file);
    mimeType = TEXT_MIME_BY_EXT[ext] || file.type;
  } else {
    throw new Error('Chỉ đính kèm được ảnh, PDF hoặc tệp văn bản (txt, md, csv, json...).');
  }
  return { name: file.name, mimeType, data: dataUrl.replace(/^data:[^;]*;base64,/, '') };
}
