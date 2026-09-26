'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { parseForm, uniqueViolation, type FormState } from '@/lib/forms';
import { contentHash } from '@/lib/hash';
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_REPORT, sniffImage } from '@/lib/images';
import { slugify, uniqueSlug } from '@/lib/slug';
import { REPORT_ARRAYS, reportSchema } from '@/lib/validation/admin';

const idSchema = z.coerce.number().int().positive();
const BUCKET = 'report-assets';

async function freeSlug(base: string, ownId?: number): Promise<string> {
  const { data, error } = await db().from('reports').select('id, slug').like('slug', `${base}%`);
  if (error) throw new Error(error.message);
  return uniqueSlug(
    base,
    data.filter((r) => r.id !== ownId).map((r) => r.slug),
  );
}

export async function saveReport(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(reportSchema, fd, REPORT_ARRAYS);
  if (!parsed.ok) return parsed.state;
  const { authorIds, slug: requestedSlug, ...d } = parsed.data;
  if (authorIds.length === 0) {
    return {
      error: 'Укажите хотя бы одного автора',
      fieldErrors: { authorIds: 'Нужен автор' },
      values: parsed.values,
    };
  }
  const existingId = idSchema.safeParse(fd.get('id'));
  const ownId = existingId.success ? existingId.data : undefined;

  let previousStatus: string | null = null;
  if (ownId) {
    const { data } = await db().from('reports').select('status').eq('id', ownId).maybeSingle();
    previousStatus = data?.status ?? null;
  }

  const slug =
    requestedSlug ?? (await freeSlug(slugify(`${d.library} ${d.title}`, 80) || 'report', ownId));
  const report = {
    ...d,
    slug,
    lesson_id: d.lesson_id ?? null,
    review_comment: d.review_comment ?? null,
    content_hash: contentHash(d.content_md),
    ...(d.status !== 'pending' && previousStatus !== d.status
      ? { reviewed_at: new Date().toISOString() }
      : d.status === 'pending'
        ? { reviewed_at: null }
        : {}),
  };
  const duplicate = 'Доклад с таким адресом (slug) или точно таким же текстом уже есть.';

  let id: number;
  if (ownId) {
    id = ownId;
    const { error } = await db().from('reports').update(report).eq('id', id);
    if (error) return uniqueViolation(error, duplicate, parsed.values);
    const { error: delError } = await db().from('report_authors').delete().eq('report_id', id);
    if (delError) throw new Error(delError.message);
  } else {
    const { data, error } = await db().from('reports').insert(report).select('id').single();
    if (error) return uniqueViolation(error, duplicate, parsed.values);
    id = data.id;
  }
  const { error: authorsError } = await db()
    .from('report_authors')
    .insert(authorIds.map((student_id) => ({ report_id: id, student_id })));
  if (authorsError) throw new Error(authorsError.message);

  await audit({
    actor: 'teacher',
    action: ownId ? 'report.update' : 'report.create',
    entity: 'report',
    entityId: id,
    meta: { status: d.status, slug },
  });
  revalidatePath('/admin/reports');
  redirect(`/admin/reports/${id}?saved=1`);
}

export async function deleteReport(fd: FormData): Promise<void> {
  await requireTeacher();
  const id = idSchema.parse(fd.get('id'));
  const { data: assets } = await db().from('report_assets').select('path').eq('report_id', id);
  if (assets?.length)
    await db()
      .storage.from(BUCKET)
      .remove(assets.map((a) => a.path));
  const { error } = await db().from('reports').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await audit({ actor: 'teacher', action: 'report.delete', entity: 'report', entityId: id });
  revalidatePath('/admin/reports');
  redirect('/admin/reports');
}

/** One image per call: keeps each request well under Vercel's 4.5 MB body limit. */
export async function uploadReportAsset(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const reportId = idSchema.parse(fd.get('reportId'));
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Выберите файл' };
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Файл больше 2 МБ' };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes.subarray(0, 16));
  if (!kind) return { error: 'Только PNG, JPEG или WebP' };

  const { data: existing, error } = await db()
    .from('report_assets')
    .select('path')
    .eq('report_id', reportId);
  if (error) throw new Error(error.message);
  if (existing.length >= MAX_IMAGES_PER_REPORT) {
    return { error: `У доклада уже ${MAX_IMAGES_PER_REPORT} картинок — удалите лишние` };
  }

  const base = slugify(file.name.replace(/\.[^.]*$/, ''), 60) || 'image';
  const taken = existing.map((a) =>
    a.path
      .split('/')
      .pop()!
      .replace(/\.[^.]*$/, ''),
  );
  const name = `${uniqueSlug(base, taken)}.${kind.ext}`;
  const path = `reports/${reportId}/${name}`;

  const up = await db()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const { error: insError } = await db()
    .from('report_assets')
    .insert({ report_id: reportId, path, mime: kind.mime, size: bytes.length });
  if (insError) {
    await db().storage.from(BUCKET).remove([path]);
    throw new Error(insError.message);
  }

  await audit({
    actor: 'teacher',
    action: 'report.asset.upload',
    entity: 'report',
    entityId: reportId,
    meta: { path },
  });
  revalidatePath(`/admin/reports/${reportId}`);
  return { ok: `Загружено. Вставьте в текст: ![описание](${name})` };
}

export async function deleteReportAsset(fd: FormData): Promise<void> {
  await requireTeacher();
  const assetId = idSchema.parse(fd.get('assetId'));
  const { data: asset, error } = await db()
    .from('report_assets')
    .delete()
    .eq('id', assetId)
    .select('report_id, path')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!asset) return;
  await db().storage.from(BUCKET).remove([asset.path]);
  await audit({
    actor: 'teacher',
    action: 'report.asset.delete',
    entity: 'report',
    entityId: asset.report_id,
    meta: { path: asset.path },
  });
  revalidatePath(`/admin/reports/${asset.report_id}`);
}
