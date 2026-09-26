-- Initial schema for course-hub.
-- Access model: all reads/writes go through the server with the service-role key.
-- RLS is enabled on every table with NO policies, and anon/authenticated lose all grants,
-- so the public API exposes nothing even if the anon key leaks.

-- ───────────────────────── helpers ─────────────────────────

-- array_to_string() is STABLE, so it can't be used in generated columns; tags are plain text,
-- which makes this wrapper safe to mark IMMUTABLE.
create function public.tags_to_text(tags text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$ select coalesce(pg_catalog.array_to_string(tags, ' '), '') $$;

-- ───────────────────────── people ─────────────────────────

create table public.groups (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now()
);

create table public.students (
  id bigint generated always as identity primary key,
  group_id bigint not null references public.groups (id) on delete restrict,
  full_name text not null check (char_length(full_name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  pin_hash text,
  pin_failed_count integer not null default 0 check (pin_failed_count >= 0),
  pin_locked_until timestamptz,
  submissions_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (group_id, full_name)
);
create index students_group_id_idx on public.students (group_id);

-- ───────────────────────── lessons & tasks ─────────────────────────

create table public.lessons (
  id bigint generated always as identity primary key,
  date date not null,
  number integer not null check (number > 0),
  title text not null check (char_length(title) between 1 and 200),
  description_md text not null default '' check (char_length(description_md) <= 100000),
  created_at timestamptz not null default now()
);
create index lessons_date_idx on public.lessons (date desc);

create table public.lesson_groups (
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  group_id bigint not null references public.groups (id) on delete cascade,
  primary key (lesson_id, group_id)
);
create index lesson_groups_group_id_idx on public.lesson_groups (group_id);

create table public.tasks (
  id bigint generated always as identity primary key,
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  "order" integer not null default 1 check ("order" > 0),
  title text not null check (char_length(title) between 1 and 200),
  statement_md text not null default '' check (char_length(statement_md) <= 100000),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  tags text[] not null default '{}',
  assigned_student_id bigint references public.students (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'assigned', 'solved')),
  verdict text not null default 'not_checked'
    check (verdict in ('not_checked', 'accepted', 'wrong_answer', 'tle', 'runtime_error')),
  runtime_ms integer check (runtime_ms >= 0),
  memory_mb numeric(8, 2) check (memory_mb >= 0),
  tests jsonb,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('russian', title), 'A')
    || setweight(to_tsvector('simple', title), 'A')
    || setweight(to_tsvector('simple', public.tags_to_text(tags)), 'B')
    || setweight(to_tsvector('russian', statement_md), 'C')
  ) stored
);
create index tasks_lesson_id_idx on public.tasks (lesson_id, "order");
create index tasks_assigned_student_id_idx on public.tasks (assigned_student_id);
create index tasks_search_idx on public.tasks using gin (search);
create index tasks_tags_idx on public.tasks using gin (tags);

create table public.solutions (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks (id) on delete cascade,
  author_student_id bigint not null references public.students (id) on delete cascade,
  code text not null check (octet_length(code) <= 20480),
  explanation_md text check (octet_length(explanation_md) <= 102400),
  is_featured boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_comment text check (char_length(review_comment) <= 2000),
  content_hash text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (task_id, content_hash)
);
create index solutions_task_id_idx on public.solutions (task_id);
create index solutions_author_idx on public.solutions (author_student_id, created_at desc);
create index solutions_pending_idx on public.solutions (created_at) where status = 'pending';

-- ───────────────────────── reports ─────────────────────────

create table public.reports (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,100}$'),
  title text not null check (char_length(title) between 1 and 200),
  library text not null check (char_length(library) between 1 and 100),
  summary text not null default '' check (char_length(summary) <= 1000),
  content_md text not null check (octet_length(content_md) <= 102400),
  group_id bigint not null references public.groups (id) on delete restrict,
  lesson_id bigint references public.lessons (id) on delete set null,
  tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_comment text check (char_length(review_comment) <= 2000),
  content_hash text not null unique,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('russian', title), 'A')
    || setweight(to_tsvector('simple', title || ' ' || library), 'A')
    || setweight(to_tsvector('simple', public.tags_to_text(tags)), 'B')
    || setweight(to_tsvector('russian', summary), 'B')
    || setweight(to_tsvector('russian', content_md), 'D')
  ) stored
);
create index reports_group_id_idx on public.reports (group_id);
create index reports_lesson_id_idx on public.reports (lesson_id);
create index reports_search_idx on public.reports using gin (search);
create index reports_tags_idx on public.reports using gin (tags);
create index reports_pending_idx on public.reports (created_at) where status = 'pending';

create table public.report_authors (
  report_id bigint not null references public.reports (id) on delete cascade,
  student_id bigint not null references public.students (id) on delete cascade,
  primary key (report_id, student_id)
);
create index report_authors_student_id_idx on public.report_authors (student_id);

create table public.report_assets (
  id bigint generated always as identity primary key,
  report_id bigint not null references public.reports (id) on delete cascade,
  path text not null unique,
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp')),
  size integer not null check (size between 1 and 2097152),
  created_at timestamptz not null default now()
);
create index report_assets_report_id_idx on public.report_assets (report_id);

-- ───────────────────────── settings, rate limits, audit ─────────────────────────

create table public.settings (
  id boolean primary key default true check (id),
  course_password_hash text not null,
  pwd_version integer not null default 1 check (pwd_version > 0),
  submissions_open boolean not null default true,
  github_export_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.rate_events (
  id bigint generated always as identity primary key,
  key text not null check (char_length(key) <= 200),
  created_at timestamptz not null default now()
);
create index rate_events_key_created_at_idx on public.rate_events (key, created_at desc);
create index rate_events_created_at_idx on public.rate_events (created_at);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor text not null check (actor ~ '^(teacher|student:[0-9]+|anonymous)$'),
  action text not null check (char_length(action) <= 100),
  entity text not null check (char_length(entity) <= 50),
  entity_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

-- ───────────────────────── knowledge-base feed ─────────────────────────

-- One row per published item. Tasks appear once they leave draft; reports once approved.
create view public.kb_items
with (security_invoker = true)
as
select
  'task'::text as type,
  t.id,
  null::text as slug,
  t.title,
  l.date,
  t.created_at,
  coalesce(
    (select array_agg(lg.group_id order by lg.group_id) from public.lesson_groups lg where lg.lesson_id = l.id),
    '{}'
  ) as group_ids,
  coalesce(
    (
      select array_agg(distinct sid order by sid)
      from (
        select t.assigned_student_id as sid where t.assigned_student_id is not null
        union
        select s.author_student_id from public.solutions s where s.task_id = t.id and s.status = 'approved'
      ) ids
    ),
    '{}'
  ) as student_ids,
  t.tags,
  t.difficulty,
  t.verdict,
  t.lesson_id,
  t.search
from public.tasks t
join public.lessons l on l.id = t.lesson_id
where t.status <> 'draft'
union all
select
  'report'::text,
  r.id,
  r.slug,
  r.title,
  coalesce(l.date, r.created_at::date),
  r.created_at,
  array[r.group_id],
  coalesce(
    (select array_agg(ra.student_id order by ra.student_id) from public.report_authors ra where ra.report_id = r.id),
    '{}'
  ),
  r.tags,
  null::text,
  null::text,
  r.lesson_id,
  r.search
from public.reports r
left join public.lessons l on l.id = r.lesson_id
where r.status = 'approved';

-- ───────────────────────── lock down ─────────────────────────

alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_groups enable row level security;
alter table public.tasks enable row level security;
alter table public.solutions enable row level security;
alter table public.reports enable row level security;
alter table public.report_authors enable row level security;
alter table public.report_assets enable row level security;
alter table public.settings enable row level security;
alter table public.rate_events enable row level security;
alter table public.audit_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Private bucket for report images; served only through /api/assets with a session check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-assets', 'report-assets', false, 2097152, array['image/png', 'image/jpeg', 'image/webp']);
