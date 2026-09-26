'use client';

import { useActionState, useRef } from 'react';
import { FileUp } from 'lucide-react';
import { FormMessage, SubmitButton } from '@/components/admin/FormBits';
import { EnumOptions, REVIEW_STATUS_LABELS } from '@/components/admin/Options';
import { Card } from '@/components/ui/Card';
import { Checkbox, Field, Textarea, valueOf, valuesOf } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import type { GroupRef, StudentRef } from '@/lib/db/queries/people';
import { formKey, initialFormState } from '@/lib/forms';
import { formatDate } from '@/lib/format';
import { saveReport } from './actions';

export type ReportFormValues = {
  id?: number;
  title: string;
  slug: string;
  library: string;
  summary: string;
  content_md: string;
  group_id: number | null;
  lesson_id: number | null;
  tags: string[];
  authorIds: number[];
  status: string;
  review_comment: string | null;
};

type LessonOption = { id: number; number: number; title: string; date: string };

export function ReportForm({
  report,
  groups,
  students,
  lessons,
}: {
  report: ReportFormValues;
  groups: GroupRef[];
  students: StudentRef[];
  lessons: LessonOption[];
}) {
  const [state, action] = useActionState(saveReport, initialFormState);
  const fe = state.fieldErrors ?? {};
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const authors = valuesOf(state, 'authorIds', report.authorIds);

  // Load a .md file into the textarea locally — nothing is uploaded until "Save".
  const loadMarkdown = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contentRef.current) return;
    if (file.size > 100 * 1024) {
      alert('Файл больше 100 КБ');
      return;
    }
    contentRef.current.value = await file.text();
    e.target.value = '';
  };

  return (
    <Card size="lg">
      <form key={formKey(state)} action={action} className="flex flex-col gap-5">
        {report.id && <input type="hidden" name="id" value={report.id} />}
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <Field label="Название" htmlFor="title" error={fe.title}>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              defaultValue={valueOf(state, 'title', report.title)}
            />
          </Field>
          <Field label="Библиотека" htmlFor="library" error={fe.library}>
            <Input
              id="library"
              name="library"
              required
              maxLength={100}
              defaultValue={valueOf(state, 'library', report.library)}
            />
          </Field>
        </div>

        <Field
          label="Кратко"
          htmlFor="summary"
          error={fe.summary}
          hint="Одно-два предложения для ленты."
        >
          <Input
            id="summary"
            name="summary"
            maxLength={1000}
            defaultValue={valueOf(state, 'summary', report.summary)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Группа" htmlFor="group_id" error={fe.group_id}>
            <Select
              id="group_id"
              name="group_id"
              required
              defaultValue={valueOf(state, 'group_id', report.group_id)}
            >
              <option value="" disabled>
                Выберите группу
              </option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Занятие" htmlFor="lesson_id" error={fe.lesson_id}>
            <Select
              id="lesson_id"
              name="lesson_id"
              defaultValue={valueOf(state, 'lesson_id', report.lesson_id)}
            >
              <option value="">— без занятия —</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.number}. {l.title} — {formatDate(l.date)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Статус" htmlFor="status" error={fe.status}>
            <Select
              id="status"
              name="status"
              defaultValue={valueOf(state, 'status', report.status)}
            >
              <EnumOptions labels={REVIEW_STATUS_LABELS} />
            </Select>
          </Field>
        </div>

        <Field label="Авторы" error={fe.authorIds}>
          <div className="grid max-h-56 gap-x-6 gap-y-2 overflow-y-auto rounded-xl border-2 border-theme-borderSubtle p-3 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g.id} className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-theme-muted">
                  {g.name}
                </p>
                {students
                  .filter((s) => s.groupId === g.id)
                  .map((s) => (
                    <Checkbox
                      key={s.id}
                      name="authorIds"
                      value={s.id}
                      label={s.name}
                      defaultChecked={authors.includes(String(s.id))}
                    />
                  ))}
              </div>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Теги" htmlFor="tags" error={fe.tags} hint="Через запятую.">
            <Input
              id="tags"
              name="tags"
              defaultValue={valueOf(state, 'tags', report.tags.join(', '))}
            />
          </Field>
          <Field
            label="Адрес (slug)"
            htmlFor="slug"
            error={fe.slug}
            hint="Пусто — сгенерируется из библиотеки и названия."
          >
            <Input
              id="slug"
              name="slug"
              pattern="[a-z0-9\-]{1,100}"
              className="font-mono"
              defaultValue={valueOf(state, 'slug', report.slug)}
            />
          </Field>
        </div>

        <Field
          label="Текст доклада (Markdown)"
          htmlFor="content_md"
          error={fe.content_md}
          hint="До 100 КБ. Картинки — ниже, после сохранения."
        >
          <div className="flex flex-col gap-2">
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-pill border-2 border-theme-border bg-theme-card px-4 py-2 text-sm font-bold shadow-neo-sm">
              <FileUp className="h-4 w-4" /> Загрузить .md файл
              <input
                type="file"
                accept=".md,.markdown,text/markdown,text/plain"
                className="sr-only"
                onChange={loadMarkdown}
              />
            </label>
            <Textarea
              ref={contentRef}
              id="content_md"
              name="content_md"
              rows={20}
              required
              className="font-mono"
              defaultValue={valueOf(state, 'content_md', report.content_md)}
            />
          </div>
        </Field>

        <Field label="Комментарий проверяющего" htmlFor="review_comment" error={fe.review_comment}>
          <Textarea
            id="review_comment"
            name="review_comment"
            rows={3}
            maxLength={2000}
            defaultValue={valueOf(state, 'review_comment', report.review_comment)}
          />
        </Field>

        <FormMessage state={state} />
        <div>
          <SubmitButton>{report.id ? 'Сохранить' : 'Создать доклад'}</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
