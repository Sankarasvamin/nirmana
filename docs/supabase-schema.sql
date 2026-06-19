-- Minimal schema used by Nirmana.
-- Review row-level security policies before using this in production.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text default 'user',
  department text,
  display_name text,
  username text,
  created_at timestamptz default now()
);

create table if not exists public.chat_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text,
  status text default 'success',
  response_time_ms integer,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.chat_records enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "chat_records_select_own" on public.chat_records;
create policy "chat_records_select_own"
on public.chat_records for select
using (auth.uid() = user_id);

drop policy if exists "chat_records_insert_own" on public.chat_records;
create policy "chat_records_insert_own"
on public.chat_records for insert
with check (auth.uid() = user_id);

drop policy if exists "chat_records_delete_own" on public.chat_records;
create policy "chat_records_delete_own"
on public.chat_records for delete
using (auth.uid() = user_id);
