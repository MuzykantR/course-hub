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

-- ───────── demo content (skipped when lessons already exist) ─────────
do $seed$
declare
  g1 bigint := (select id from public.groups where slug = 'group-1');
  g2 bigint := (select id from public.groups where slug = 'group-2');
  anna bigint := (select id from public.students where slug = 'anna-ivanova');
  boris bigint := (select id from public.students where slug = 'boris-petrov');
  vera bigint := (select id from public.students where slug = 'vera-smirnova');
  gleb bigint := (select id from public.students where slug = 'gleb-kuznetsov');
  darya bigint := (select id from public.students where slug = 'darya-popova');
  l1 bigint; l2 bigint; l3 bigint;
  t1 bigint; t2 bigint; t3 bigint; t4 bigint;
  r1 bigint; r2 bigint;
begin
  if exists (select 1 from public.lessons) then return; end if;

  insert into public.lessons (date, number, title, description_md) values
    ('2026-09-05', 1, 'Списки и два указателя',
     E'Разбираем приёмы работы со списками: срезы, `enumerate`, `zip` и технику **двух указателей**.\n\n- сложность $O(n)$ вместо $O(n^2)$\n- инварианты цикла')
    returning id into l1;
  insert into public.lessons (date, number, title, description_md) values
    ('2026-09-12', 2, 'Словари и множества',
     E'Хеш-таблицы в Python: `dict`, `set`, `collections.Counter`, `defaultdict`.')
    returning id into l2;
  insert into public.lessons (date, number, title, description_md) values
    ('2026-09-19', 3, 'Рекурсия и мемоизация', E'`functools.lru_cache`, глубина рекурсии, динамическое программирование сверху вниз.')
    returning id into l3;
  insert into public.lesson_groups values (l1, g1), (l1, g2), (l2, g1), (l2, g2), (l3, g1);

  insert into public.tasks (lesson_id, "order", title, statement_md, difficulty, tags, assigned_student_id, status)
  values (l1, 1, 'Два числа с заданной суммой',
    E'Дан **отсортированный** список `nums` и число `target`. Верните индексы двух элементов, сумма которых равна `target`.\n\n```python\n>>> two_sum([1, 3, 4, 6, 9], 13)\n(2, 4)\n```\n\nОграничения: $2 \le n \le 10^5$.',
    'easy', '{arrays,two-pointers}', anna, 'solved')
  returning id into t1;
  update public.tasks set tests = '[
    {"type": "assert", "name": "пример из условия", "code": "assert two_sum([1, 3, 4, 6, 9], 13) == (2, 4)"},
    {"type": "assert", "name": "два элемента", "code": "assert two_sum([2, 5], 7) == (0, 1)"},
    {"type": "assert", "name": "отрицательные", "code": "assert two_sum([-5, -1, 0, 3], -6) == (0, 1)"}
  ]'::jsonb where id = t1;
  insert into public.tasks (lesson_id, "order", title, statement_md, difficulty, tags, assigned_student_id, status)
  values (l1, 2, 'Слияние отсортированных списков',
    E'Слейте два отсортированных списка в один отсортированный за $O(n + m)$.',
    'medium', '{arrays,two-pointers,sorting}', boris, 'solved')
  returning id into t2;
  insert into public.tasks (lesson_id, "order", title, statement_md, difficulty, tags, assigned_student_id, status)
  values (l2, 1, 'Анаграммы',
    E'Сгруппируйте слова, являющиеся анаграммами друг друга.\n\n| вход | выход |\n|---|---|\n| `[\"eat\", \"tea\", \"tan\"]` | `[[\"eat\", \"tea\"], [\"tan\"]]` |',
    'medium', '{hash-map,strings}', gleb, 'assigned')
  returning id into t3;
  insert into public.tasks (lesson_id, "order", title, statement_md, difficulty, tags, status)
  values (l3, 1, 'Числа Фибоначчи (черновик)', 'Черновик — не должен быть виден студентам.', 'easy', '{recursion}', 'draft')
  returning id into t4;

  insert into public.solutions (task_id, author_student_id, code, explanation_md, is_featured, status, content_hash, reviewed_at) values
    (t1, anna, E'def two_sum(nums: list[int], target: int) -> tuple[int, int]:\n    left, right = 0, len(nums) - 1\n    while left < right:\n        s = nums[left] + nums[right]\n        if s == target:\n            return left, right\n        if s < target:\n            left += 1\n        else:\n            right -= 1\n    raise ValueError("no pair")\n',
     E'Сдвигаем левый указатель, если сумма мала, и правый — если велика. Каждый шаг отбрасывает один элемент, поэтому $O(n)$.', true, 'approved', 'seed-1', now()),
    (t1, vera, E'def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return seen[target - x], i\n        seen[x] = i\n',
     'Решение через словарь — работает и для неотсортированного списка.', false, 'approved', 'seed-2', now()),
    (t2, boris, E'def merge(a, b):\n    return sorted(a + b)\n', null, true, 'approved', 'seed-3', now()),
    (t3, darya, E'from collections import defaultdict\n\ndef group(words):\n    groups = defaultdict(list)\n    for w in words:\n        groups["".join(sorted(w))].append(w)\n    return list(groups.values())\n',
     null, false, 'pending', 'seed-4', null);

  insert into public.reports (slug, title, library, summary, content_md, group_id, lesson_id, tags, status, content_hash, reviewed_at)
  values ('numpy-basics', 'NumPy: массивы без циклов', 'NumPy',
    'Векторизация, broadcasting и почему NumPy быстрее списков.',
    E'# NumPy\n\n## Установка\n\n```bash\npip install numpy\n```\n\n## Массивы\n\n```python\nimport numpy as np\n\na = np.arange(6).reshape(2, 3)\nprint(a * 2)\n```\n\n### Broadcasting\n\nОперации над массивами разной формы: $(2, 3) + (3,) \to (2, 3)$.\n\n## Сравнение скорости\n\n| операция | list | ndarray |\n|---|---|---|\n| сумма $10^6$ | 45 мс | 0.6 мс |\n\n> Совет: избегайте циклов `for` по элементам массива.\n\nПодробнее — в [документации](https://numpy.org/doc/).',
    g1, l1, '{numpy,performance}', 'approved', 'seed-r1', now())
  returning id into r1;
  insert into public.reports (slug, title, library, summary, content_md, group_id, tags, status, content_hash, reviewed_at)
  values ('requests-http', 'requests: HTTP для людей', 'requests',
    'GET/POST, сессии, таймауты и обработка ошибок.',
    E'## Первый запрос\n\n```python\nimport requests\n\nr = requests.get("https://api.github.com", timeout=5)\nr.raise_for_status()\nprint(r.json()["current_user_url"])\n```\n\n## Сессии\n\n`requests.Session()` переиспользует соединения.\n\n## Переменные окружения\n\nТокен берём из `${GITHUB_TOKEN}`, а не из кода.',
    g2, '{http,networking}', 'approved', 'seed-r2', now())
  returning id into r2;
  insert into public.report_authors values (r1, anna), (r1, boris), (r2, gleb);
end
$seed$;

-- Demo rows above use placeholder hashes; recompute them exactly like lib/hash.ts
-- (CRLF → LF, trim, sha256) so duplicate detection works on seeded content too.
update public.solutions
set content_hash = encode(sha256(convert_to(btrim(replace(code, E'\r\n', E'\n'), E' \n\t\r'), 'UTF8')), 'hex')
where content_hash like 'seed-%';
update public.reports
set content_hash = encode(sha256(convert_to(btrim(replace(content_md, E'\r\n', E'\n'), E' \n\t\r'), 'UTF8')), 'hex')
where content_hash like 'seed-%';
