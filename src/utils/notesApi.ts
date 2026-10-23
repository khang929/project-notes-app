import { supabase } from '../lib/supabase';
import { Note, NoteColor } from '../types';

interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[] | null;
  pinned: boolean;
  color: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

const VALID_COLORS: NoteColor[] = ['default', 'blue', 'emerald', 'amber', 'purple', 'rose'];

function rowToNote(row: NoteRow): Note {
  const color = VALID_COLORS.includes(row.color as NoteColor) ? (row.color as NoteColor) : 'default';
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    isPinned: row.pinned,
    color,
    summary: row.summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Chỉ gửi những trường thực sự có giá trị
function noteToRow(note: Partial<Note>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (note.title !== undefined) row.title = note.title;
  if (note.content !== undefined) row.content = note.content;
  if (note.tags !== undefined) row.tags = note.tags;
  if (note.isPinned !== undefined) row.pinned = note.isPinned;
  if (note.color !== undefined) row.color = note.color;
  if (note.summary !== undefined) row.summary = note.summary;
  return row;
}

function validIso(value?: string): string | undefined {
  if (!value) return undefined;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

export async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as NoteRow[]).map(rowToNote);
}

export async function insertNote(note: Partial<Note>): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(noteToRow(note))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToNote(data as NoteRow);
}

// Dùng cho nhập file JSON và thêm ghi chú mẫu: id cũ bị bỏ, database tự tạo id mới
export async function insertManyNotes(notes: Partial<Note>[]): Promise<Note[]> {
  // Luôn gửi created_at/updated_at: supabase-js đặt cột thiếu thành NULL (không dùng default),
  // nên ghi chú thiếu ngày sẽ làm cả lô nhập bị lỗi.
  const nowIso = new Date().toISOString();
  const rows = notes
    .filter((n) => n && typeof n === 'object' && (typeof n.title === 'string' || typeof n.content === 'string'))
    .map((n) => ({
      ...noteToRow({
        title: n.title ?? '',
        content: n.content ?? '',
        tags: Array.isArray(n.tags) ? n.tags.filter((t) => typeof t === 'string') : [],
        isPinned: Boolean(n.isPinned),
        color: VALID_COLORS.includes(n.color as NoteColor) ? n.color : 'default',
        summary: typeof n.summary === 'string' ? n.summary : undefined,
      }),
      created_at: validIso(n.createdAt) ?? nowIso,
      updated_at: validIso(n.updatedAt) ?? validIso(n.createdAt) ?? nowIso,
    }));

  const saved: Note[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const { data, error } = await supabase.from('notes').insert(rows.slice(i, i + 100)).select();
    if (error) throw new Error(error.message);
    saved.push(...(data as NoteRow[]).map(rowToNote));
  }
  return saved;
}

export async function updateNote(
  id: string,
  changes: Partial<Note>,
  touchUpdatedAt = true
): Promise<Note> {
  const row = noteToRow(changes);
  if (touchUpdatedAt) row.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('notes')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToNote(data as NoteRow);
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
