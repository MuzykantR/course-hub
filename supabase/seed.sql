-- Dev-only seed. Course password: `python-dev` (DEV_COURSE_PASSWORD in .env.example).
-- Never run against prod: prod gets its real password via the admin settings page.

insert into public.settings (id, course_password_hash)
values (true, '$2b$12$ySnIX5Smm6rXohKW2S4ipeLe8XnOFcbDyEHliLbbgYUPbZL0mXr3K')
on conflict (id) do update set course_password_hash = excluded.course_password_hash;

insert into public.groups (name, slug) values
  ('Группа 1', 'group-1'),
  ('Группа 2', 'group-2')
on conflict (slug) do nothing;

insert into public.students (group_id, full_name, slug)
select g.id, s.full_name, s.slug
from (values
  ('group-1', 'Анна Иванова', 'anna-ivanova'),
  ('group-1', 'Борис Петров', 'boris-petrov'),
  ('group-1', 'Вера Смирнова', 'vera-smirnova'),
  ('group-2', 'Глеб Кузнецов', 'gleb-kuznetsov'),
  ('group-2', 'Дарья Попова', 'darya-popova'),
  ('group-2', 'Егор Соколов', 'egor-sokolov')
) as s (group_slug, full_name, slug)
join public.groups g on g.slug = s.group_slug
on conflict (slug) do nothing;
