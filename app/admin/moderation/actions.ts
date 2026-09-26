'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { scheduleExport } from '@/lib/github/export';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import type { FormState } from '@/lib/forms';

const schema = z.object({
  kind: z.enum(['solution', 'report']),
  id: z.coerce.number().int().positive(),
  decision: z.enum(['approve', 'reject']),
  comment: z.string().trim().max(2000, 'Комментарий: до 2000 символов').default(''),
  is_featured: z.preprocess((v) => v === 'on', z.boolean()),
});

export async function moderate(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = schema.safeParse({
    kind: fd.get('kind'),
    id: fd.get('id'),
    decision: fd.get('decision'),
    comment: fd.get('comment') ?? '',
    is_featured: fd.get('is_featured'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Неверный ввод' };
  const { kind, id, decision, comment, is_featured } = parsed.data;
  if (decision === 'reject' && !comment) {
    return {
      error: 'Напишите, почему отклонено — студент увидит комментарий.',
      values: { comment },
    };
  }

  const patch = {
    status: decision === 'approve' ? 'approved' : 'rejected',
    review_comment: comment || null,
    reviewed_at: new Date().toISOString(),
  };
  // `.eq('status', 'pending')`: a second click (or a withdrawn submission) changes nothing.
  const { data, error } =
    kind === 'solution'
      ? await db()
          .from('solutions')
          .update({ ...patch, is_featured })
          .eq('id', id)
          .eq('status', 'pending')
          .select('id')
      : await db().from('reports').update(patch).eq('id', id).eq('status', 'pending').select('id');
  if (error) throw new Error(error.message);
  if (!data.length) return { error: 'Заявка уже обработана или отозвана.' };

  await audit({
    actor: 'teacher',
    action: `${kind}.${decision}`,
    entity: kind,
    entityId: id,
    meta: comment ? { comment } : {},
  });
  if (decision === 'approve') scheduleExport(kind === 'solution' ? 'одобрено решение' : 'одобрен доклад');
  revalidatePath('/admin/moderation');
  revalidatePath('/admin');
  return { ok: decision === 'approve' ? 'Одобрено и опубликовано.' : 'Отклонено.' };
}
