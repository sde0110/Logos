-- LOGOS web MVP: 읽기 기록 테이블
-- Supabase SQL Editor에서 한 번 실행하세요. (Authentication → Sign In / Providers → Anonymous sign-ins 활성화 필요)

create table if not exists public.reading_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  read_on date not null,
  book_index smallint not null check (book_index between 0 and 65),
  from_chapter smallint not null check (from_chapter > 0),
  to_chapter smallint not null check (to_chapter >= from_chapter),
  from_verse smallint check (from_verse > 0),
  to_verse smallint check (to_verse > 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  mood text check (char_length(mood) <= 20),
  created_at timestamptz not null default now()
);

create index if not exists reading_logs_user_created_idx
  on public.reading_logs (user_id, created_at);

alter table public.reading_logs enable row level security;

drop policy if exists "reading_logs are private" on public.reading_logs;
create policy "reading_logs are private" on public.reading_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
