-- Tasks no longer record an external judge result (verdict / runtime / memory): seminars are
-- online and the site has no judge of its own. The KB view selected `verdict`, so it is rebuilt.
-- Reports: the library becomes optional (the submit form no longer asks for it).

drop view public.kb_items;

alter table public.tasks
  drop column verdict,
  drop column runtime_ms,
  drop column memory_mb;

alter table public.reports
  alter column library set default '',
  drop constraint reports_library_check,
  add constraint reports_library_check check (char_length(library) <= 100);

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
  r.lesson_id,
  r.search
from public.reports r
left join public.lessons l on l.id = r.lesson_id
where r.status = 'approved';

revoke all on public.kb_items from anon, authenticated;
