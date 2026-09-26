'use client';

import { useActionState, useRef } from 'react';
import { FileUp } from 'lucide-react';
import { FormMessage, SubmitButton } from '@/components/admin/FormBits';
import { Card } from '@/components/ui/Card';
import { Checkbox, Field, Textarea, valueOf, valuesOf } from '@/components/ui/Field';
import { Honeypot } from '@/components/ui/Honeypot';
import { Input, Select } from '@/components/ui/Input';
import type { GroupRef, StudentRef } from '@/lib/db/queries/people';
import { formatDate } from '@/lib/format';
import { formKey, initialFormState } from '@/lib/forms';
import { MAX_COAUTHORS } from '@/lib/submissions-core';
import { submitReport } from './actions';

type LessonOption = { id: number; number: number; title: string; date: string };

export function ReportSubmitForm({
  meId,
  groups,
  students,
  lessons,
}: {
  meId: number;
  groups: GroupRef[];
  students: StudentRef[];
  lessons: LessonOption[];
}) {
  const [state, action] = useActionState(submitReport, initialFormState);
  const fe = state.fieldErrors ?? {};
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const coauthors = valuesOf(state, 'coauthorIds', []);

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
      <form key={formKey(state)} action={action} className="relative flex flex-col gap-5">
        <Honeypot />
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <Field label="Название доклада" htmlFor="title" error={fe.title}>
            <Input
              id="title"
              name="title"
              required
              minLength={3}
              maxLength={200}
              defaultValue={valueOf(state, 'title', '')}
            />
          </Field>
          <Field label="Библиотека" htmlFor="library" error={fe.library}>
            <Input
              id="library"
              name="library"
              required
              maxLength={100}
              placeholder="pandas"
              defaultValue={valueOf(state, 'library', '')}
            />
          </Field>
        </div>
        <Field
          label="Кратко"
          htmlFor="summary"
          error={fe.summary}
          hint="Одно-два предложения: о чём доклад."
        >
          <Input
            id="summary"
            name="summary"
            maxLength={1000}
            defaultValue={valueOf(state, 'summary', '')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Занятие (необязательно)" htmlFor="lesson_id" error={fe.lesson_id}>
            <Select id="lesson_id" name="lesson_id" defaultValue={valueOf(state, 'lesson_id', '')}>
              <option value="">— без занятия —</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.number}. {l.title} — {formatDate(l.date)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Теги" htmlFor="tags" error={fe.tags} hint="Через запятую: http, parsing">
            <Input id="tags" name="tags" defaultValue={valueOf(state, 'tags', '')} />
          </Field>
        </div>

        <Field
          label={`Соавторы (до ${MAX_COAUTHORS})`}
          error={fe.coauthorIds}
          hint="Вы автор по умолчанию."
        >
          <details
            className="rounded-xl border-2 border-theme-borderSubtle p-3"
            open={coauthors.length > 0}
          >
            <summary className="cursor-pointer text-sm font-semibold">Выбрать соавторов</summary>
            <div className="mt-3 grid max-h-56 gap-x-6 gap-y-2 overflow-y-auto sm:grid-cols-2">
              {groups.map((g) => (
                <div key={g.id} className="flex flex-col gap-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-theme-muted">
                    {g.name}
                  </p>
                  {students
                    .filter((s) => s.groupId === g.id && s.id !== meId)
                    .map((s) => (
                      <Checkbox
                        key={s.id}
                        name="coauthorIds"
                        value={s.id}
                        label={s.name}
                        defaultChecked={coauthors.includes(String(s.id))}
                      />
                    ))}
                </div>
              ))}
            </div>
          </details>
        </Field>

        <Field
          label="Текст доклада (Markdown)"
          htmlFor="content_md"
          error={fe.content_md}
          hint="До 100 КБ. Картинки можно будет добавить на следующем шаге."
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
              rows={18}
              required
              className="font-mono"
              defaultValue={valueOf(state, 'content_md', '')}
            />
          </div>
        </Field>

        <FormMessage state={state} />
        <div>
          <SubmitButton pendingText="Отправляем…">Отправить на проверку</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
