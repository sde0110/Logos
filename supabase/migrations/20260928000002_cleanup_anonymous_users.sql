-- 빈 익명 계정 주기적 정리 (pg_cron, 매일 04:00 KST)
-- 기록(reading_logs)이 하나라도 있는 계정은 삭제하지 않는다.

create extension if not exists pg_cron;

-- Data API로 노출되지 않는 스키마에 둔다
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.cleanup_anonymous_users()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  deleted integer;
begin
  delete from auth.users u
  where u.is_anonymous
    and not exists (select 1 from public.reading_logs r where r.user_id = u.id)
    and (
      -- 1) 카카오 계정으로 기록을 옮기며 로그아웃된 익명 계정: 하루 뒤 삭제
      (u.created_at < now() - interval '1 day'
        and not exists (select 1 from auth.sessions s where s.user_id = u.id))
      -- 2) 30일 동안 활동이 없는 빈 익명 계정
      or (u.created_at < now() - interval '30 days'
        and not exists (
          select 1 from auth.sessions s
          where s.user_id = u.id
            and coalesce(s.refreshed_at, s.updated_at, s.created_at) > now() - interval '30 days'
        ))
    );
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

revoke all on function private.cleanup_anonymous_users() from public, anon, authenticated;

-- 같은 이름이면 기존 예약을 덮어쓴다 (19:00 UTC = 04:00 KST)
select cron.schedule(
  'cleanup-anonymous-users',
  '0 19 * * *',
  $$select private.cleanup_anonymous_users()$$
);
