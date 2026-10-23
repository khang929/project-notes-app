-- Bảng cho lớp "Cơ sở dữ liệu" của trợ lý AI: lịch sử trò chuyện và nhật ký sử dụng.
-- Cách chạy: Supabase Dashboard -> SQL Editor -> New query -> dán toàn bộ file này -> Run.
-- Chạy lại nhiều lần vẫn an toàn.

-- 1) Cuộc trò chuyện
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Cuộc trò chuyện mới',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations (user_id, updated_at desc);

-- 2) Tin nhắn trong cuộc trò chuyện
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'model')),
  content text not null,
  route text,
  sources jsonb,
  steps jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at);

-- 3) Nhật ký lỗi & chi phí (token) cho mỗi yêu cầu AI
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  route text not null,
  model text,
  prompt_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  latency_ms integer not null default 0,
  status text not null check (status in ('ok', 'error')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_logs_user_created_idx
  on public.ai_usage_logs (user_id, created_at desc);

-- 4) Row Level Security: mỗi người chỉ thấy và sửa dữ liệu của chính mình
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_logs enable row level security;

drop policy if exists "conv_select_own" on public.ai_conversations;
drop policy if exists "conv_insert_own" on public.ai_conversations;
drop policy if exists "conv_update_own" on public.ai_conversations;
drop policy if exists "conv_delete_own" on public.ai_conversations;
create policy "conv_select_own" on public.ai_conversations for select using (user_id = auth.uid());
create policy "conv_insert_own" on public.ai_conversations for insert with check (user_id = auth.uid());
create policy "conv_update_own" on public.ai_conversations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "conv_delete_own" on public.ai_conversations for delete using (user_id = auth.uid());

drop policy if exists "msg_select_own" on public.ai_messages;
drop policy if exists "msg_insert_own" on public.ai_messages;
drop policy if exists "msg_delete_own" on public.ai_messages;
create policy "msg_select_own" on public.ai_messages for select using (user_id = auth.uid());
create policy "msg_insert_own" on public.ai_messages for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  )
);
create policy "msg_delete_own" on public.ai_messages for delete using (user_id = auth.uid());

-- Nhật ký chỉ cho phép xem và thêm, không cho sửa/xóa
drop policy if exists "usage_select_own" on public.ai_usage_logs;
drop policy if exists "usage_insert_own" on public.ai_usage_logs;
create policy "usage_select_own" on public.ai_usage_logs for select using (user_id = auth.uid());
create policy "usage_insert_own" on public.ai_usage_logs for insert with check (user_id = auth.uid());

-- 5) Bảng ghi chú (nếu bạn chưa có). Bỏ qua phần này nếu bảng notes đã hoạt động.
-- create table if not exists public.notes (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
--   title text not null default '',
--   content text not null default '',
--   tags text[] not null default '{}',
--   pinned boolean not null default false,
--   color text not null default 'default',
--   summary text,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );
-- alter table public.notes enable row level security;
-- create policy "notes_own" on public.notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
