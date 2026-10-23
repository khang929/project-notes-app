-- Bảng ghi chú cho project Supabase RIÊNG của bạn.
-- Cách chạy: Supabase Dashboard -> SQL Editor -> New query -> dán toàn bộ file này -> Run.
-- Chạy file này TRƯỚC, rồi mới chạy supabase/ai_schema.sql. Chạy lại nhiều lần vẫn an toàn.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  tags text[] not null default '{}',
  pinned boolean not null default false,
  color text not null default 'default',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

-- Row Level Security: mỗi người chỉ xem/sửa/xóa được ghi chú của chính mình
alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_select_own" on public.notes for select using (user_id = auth.uid());
create policy "notes_insert_own" on public.notes for insert with check (user_id = auth.uid());
create policy "notes_update_own" on public.notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notes_delete_own" on public.notes for delete using (user_id = auth.uid());
