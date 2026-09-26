import { z } from 'zod';
import { MAX_COAUTHORS } from '@/lib/submissions-core';
import { tagsField } from './admin';

const bytes = (s: string) => new TextEncoder().encode(s).length;
const empty = (v: unknown) => (v === '' || v === null ? undefined : v);
const normalize = (s: string) => s.replace(/\r\n?/g, '\n');
const id = z.coerce.number('Выберите значение').int().positive('Выберите значение');

export const solutionSubmitSchema = z.object({
  task_id: id,
  code: z
    .string()
    .transform(normalize)
    .refine((s) => s.trim().length > 0, 'Вставьте код решения')
    .refine((s) => bytes(s) <= 20 * 1024, 'Код больше 20 КБ'),
  explanation_md: z.preprocess(
    empty,
    z
      .string()
      .transform(normalize)
      .refine((s) => bytes(s) <= 100 * 1024, 'Пояснение больше 100 КБ')
      .optional(),
  ),
});

export const reportSubmitSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Название: минимум 3 символа')
    .max(200, 'Название: до 200 символов'),
  library: z.string().trim().min(1, 'Укажите библиотеку').max(100, 'Библиотека: до 100 символов'),
  summary: z.string().trim().max(1000, 'Кратко: до 1000 символов').default(''),
  lesson_id: z.preprocess(empty, id.optional()),
  tags: tagsField,
  coauthorIds: z
    .array(id)
    .default([])
    .refine((a) => a.length <= MAX_COAUTHORS, `Не больше ${MAX_COAUTHORS} соавторов`),
  content_md: z
    .string()
    .transform(normalize)
    .refine((s) => s.trim().length >= 50, 'Текст доклада слишком короткий')
    .refine((s) => bytes(s) <= 100 * 1024, 'Текст больше 100 КБ'),
});
export const REPORT_SUBMIT_ARRAYS = ['coauthorIds'] as const;
