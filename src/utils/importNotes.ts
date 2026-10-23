import { Note, NoteColor } from '../types';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMPORT_NOTES = 1000;

const VALID_COLORS: NoteColor[] = ['default', 'blue', 'emerald', 'amber', 'purple', 'rose'];

function cleanIso(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

/** Chuẩn hóa một phần tử bất kỳ thành ghi chú hợp lệ; trả về null nếu không dùng được. */
function normalizeNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw as Record<string, unknown>;

  const title = typeof n.title === 'string' ? n.title.trim() : '';
  const content = typeof n.content === 'string' ? n.content : '';
  if (!title && !content.trim()) return null; // ghi chú trống hoàn toàn

  const tags = Array.isArray(n.tags)
    ? Array.from(
        new Set(
          n.tags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      )
    : [];

  const now = new Date().toISOString();
  const createdAt = cleanIso(n.createdAt) ?? now;

  return {
    id: typeof n.id === 'string' ? n.id : '',
    title,
    content,
    tags,
    isPinned: n.isPinned === true,
    color: VALID_COLORS.includes(n.color as NoteColor) ? (n.color as NoteColor) : 'default',
    summary: typeof n.summary === 'string' && n.summary.trim() ? n.summary : undefined,
    createdAt,
    updatedAt: cleanIso(n.updatedAt) ?? createdAt,
  };
}

/**
 * Đọc nội dung file JSON và trả về danh sách ghi chú hợp lệ.
 * Chấp nhận: mảng ghi chú, hoặc đối tượng dạng { notes: [...] }.
 * Ném Error với thông báo tiếng Việt nếu file không dùng được.
 */
export function parseNotesJson(text: string): { notes: Note[]; skipped: number } {
  // Bỏ ký tự BOM đầu file (Notepad/Excel hay thêm) vì JSON.parse sẽ lỗi
  const cleaned = text.replace(/^﻿/, '').trim();
  if (!cleaned) throw new Error('Tệp rỗng, không có ghi chú nào để nhập.');

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error('Tệp không phải JSON hợp lệ. Hãy dùng file do nút "Sao lưu" tạo ra.');
  }

  const list: unknown[] | null = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { notes?: unknown }).notes)
    ? (data as { notes: unknown[] }).notes
    : null;

  if (!list) throw new Error('Tệp JSON không đúng định dạng danh sách ghi chú.');
  if (list.length > MAX_IMPORT_NOTES) {
    throw new Error(`Tệp có quá nhiều ghi chú (tối đa ${MAX_IMPORT_NOTES} ghi chú mỗi lần nhập).`);
  }

  const notes = list.map(normalizeNote).filter((n): n is Note => n !== null);
  if (notes.length === 0) throw new Error('Không tìm thấy ghi chú hợp lệ nào trong tệp.');
  return { notes, skipped: list.length - notes.length };
}
