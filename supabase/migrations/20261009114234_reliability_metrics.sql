-- SLI data for the «Надёжность» page. Aggregates only: no students, IPs or query text.

-- One row per server render of a key page (`/kb` with a query is kind 'search').
create table public.page_metrics (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('page', 'search')),
  route text not null check (char_length(route) <= 100),
  duration_ms integer not null check (duration_ms >= 0),
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index page_metrics_created_at_idx on public.page_metrics (created_at);

-- Successful health checks from the external pinger (UptimeRobot, every 5 minutes).
create table public.health_checks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);
create index health_checks_created_at_idx on public.health_checks (created_at);

alter table public.page_metrics enable row level security;
alter table public.health_checks enable row level security;
revoke all on public.page_metrics, public.health_checks from anon, authenticated;

-- Records a health check unless one was recorded in the last 4 minutes (so the 5-minute pinger
-- counts once per interval and nobody can inflate the SLI), and prunes data older than 35 days.
-- Returns true when a row was written.
create function public.record_health_check()
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_written boolean := false;
begin
  -- Serialize concurrent pings so the 4-minute rule holds.
  perform pg_advisory_xact_lock(hashtext('record_health_check'));
  if not exists (
    select 1 from public.health_checks where created_at > now() - interval '4 minutes'
  ) then
    insert into public.health_checks default values;
    v_written := true;
    delete from public.health_checks where created_at < now() - interval '35 days';
    delete from public.page_metrics where created_at < now() - interval '35 days';
  end if;
  return v_written;
end;
$$;

revoke execute on function public.record_health_check() from public, anon, authenticated;
grant execute on function public.record_health_check() to service_role;
