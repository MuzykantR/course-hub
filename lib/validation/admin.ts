import { z } from 'zod';

// Russian fallback messages for anything without an explicit one below.
z.config(z.locales.ru());

// Shared field builders. Form values arrive as strings; empty strings mean "not set".

const empty = (v: unknown) => (v === '' || v === null ? undefined : v);
const bytes = (s: string) => new TextEncoder().encode(s).length;

const text = (max: number, label = 'Поле') =>
  z
    .string()
    .trim()
    .min(1, `${label}: обязательно`)
    .max(max, `${label}: не длиннее ${max} символов`);

const markdown = (maxBytes: number) =>
  z
    .string()
    .transform((s) => s.replace(/\r\n?/g, '\n'))
    .refine((s) => bytes(s) <= maxBytes, `Не больше ${Math.round(maxBytes / 1024)} КБ`);

const id = z.coerce.number('Выберите значение').int().positive('Выберите значение');
const optionalId = z.preprocess(empty, id.optional());
const ids = z.array(id).default([]);
const checkbox = z.preprocess((v) => v === 'on' || v === 'true', z.boolean());
const slug = z.preprocess(
  empty,
  z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,100}$/, 'Только латиница, цифры и дефис')
    .optional(),
);

export const tagsField = z
  .string()
  .default('')
  .transform((s) => [
    ...new Set(
      s
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean),
    ),
  ])
  .refine((tags) => tags.length <= 10, 'Не больше 10 тегов')
  .refine(
    (tags) => tags.every((t) => /^[\p{L}\p{N}][\p{L}\p{N}+#.-]{0,29}$/u.test(t)),
    'Тег: буквы, цифры, дефис; до 30 символов',
  );

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const TASK_STATUSES = ['draft', 'assigned', 'solved'] as const;
export const VERDICTS = [
  'not_checked',
  'accepted',
  'wrong_answer',
  'tle',
  'runtime_error',
] as const;
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;

export const lessonSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату'),
  number: z.coerce
    .number('Укажите номер')
    .int('Целое число')
    .min(1, 'Номер от 1')
    .max(999, 'Номер до 999'),
  title: text(200, 'Название'),
  description_md: markdown(100_000).default(''),
  groupIds: ids,
});
export const LESSON_ARRAYS = ['groupIds'] as const;

export const taskSchema = z.object({
  lesson_id: id,
  order: z.coerce.number('Укажите номер').int('Целое число').min(1, 'От 1').max(99, 'До 99'),
  title: text(200, 'Название'),
  statement_md: markdown(100_000).default(''),
  difficulty: z.enum(DIFFICULTIES),
  tags: tagsField,
  assigned_student_id: optionalId,
  status: z.enum(TASK_STATUSES),
  verdict: z.enum(VERDICTS),
  runtime_ms: z.preprocess(
    empty,
    z.coerce
      .number('Число')
      .int('Целое число мс')
      .min(0, 'Не меньше 0')
      .max(1_000_000, 'Слишком много')
      .optional(),
  ),
  memory_mb: z.preprocess(
    empty,
    z.coerce.number('Число').min(0, 'Не меньше 0').max(100_000, 'Слишком много').optional(),
  ),
});

export const solutionSchema = z.object({
  task_id: id,
  author_student_id: id,
  code: z
    .string()
    .transform((s) => s.replace(/\r\n?/g, '\n'))
    .refine((s) => s.trim().length > 0, 'Код: обязательно')
    .refine((s) => bytes(s) <= 20 * 1024, 'Код: не больше 20 КБ'),
  explanation_md: z.preprocess(empty, markdown(100 * 1024).optional()),
  is_featured: checkbox,
  status: z.enum(REVIEW_STATUSES),
  review_comment: z.preprocess(empty, z.string().trim().max(2000).optional()),
});

export const reportSchema = z.object({
  title: text(200, 'Название'),
  slug,
  library: text(100, 'Библиотека'),
  summary: z.string().trim().max(1000).default(''),
  content_md: markdown(100 * 1024).refine((s) => s.trim().length > 0, 'Текст доклада: обязательно'),
  group_id: id,
  lesson_id: optionalId,
  tags: tagsField,
  authorIds: ids,
  status: z.enum(REVIEW_STATUSES),
  review_comment: z.preprocess(empty, z.string().trim().max(2000).optional()),
});
export const REPORT_ARRAYS = ['authorIds'] as const;

export const groupSchema = z.object({ name: text(100, 'Название'), slug });

export const studentSchema = z.object({
  full_name: text(200, 'ФИО'),
  group_id: id,
  slug,
  submissions_blocked: checkbox,
});

export const importStudentsSchema = z.object({
  group_id: id,
  names: z
    .string()
    .transform((s) => [
      ...new Set(
        s
          .split('\n')
          .map((l) =>
            l
              .replace(/^\s*\d+[.)]\s*/, '')
              .replace(/\s+/g, ' ')
              .trim(),
          )
          .filter(Boolean),
      ),
    ])
    .refine((names) => names.length > 0, 'Вставьте хотя бы одно ФИО')
    .refine((names) => names.length <= 200, 'За раз — не больше 200 студентов')
    .refine((names) => names.every((n) => n.length <= 200), 'Слишком длинная строка'),
});

export const passwordChangeSchema = z
  .object({
    password: z.string().min(8, 'Минимум 8 символов').max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Пароли не совпадают', path: ['confirm'] });

export const settingsTogglesSchema = z.object({
  submissions_open: checkbox,
  github_export_enabled: checkbox,
});
