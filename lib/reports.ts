import 'server-only';
import { db } from '@/lib/db/client';
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_REPORT, sniffImage } from '@/lib/images';
import { reportSlugBase, slugify, uniqueSlug } from '@/lib/slug';

export const REPORT_BUCKET = 'report-assets';

/** Slug from library + title that no other report uses. */
export async function freeReportSlug(
  library: string,
  title: string,
  ownId?: number,
): Promise<string> {
  const base = reportSlugBase(library, title);
  const { data, error } = await db().from('reports').select('id, slug').like('slug', `${base}%`);
  if (error) throw new Error(error.message);
  return uniqueSlug(
    base,
    data.filter((r) => r.id !== ownId).map((r) => r.slug),
  );
}

/**
 * Validate and store one report image: real format by magic bytes, size, per-report count,
 * a sanitized unique file name. Returns the name to reference from Markdown.
 */
export async function storeReportImage(
  reportId: number,
  file: FormDataEntryValue | null,
): Promise<{ ok: true; name: string; path: string } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Выберите файл' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Файл больше 2 МБ' };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes.subarray(0, 16));
  if (!kind) return { ok: false, error: 'Только PNG, JPEG или WebP' };

  const { data: existing, error } = await db()
    .from('report_assets')
    .select('path')
    .eq('report_id', reportId);
  if (error) throw new Error(error.message);
  if (existing.length >= MAX_IMAGES_PER_REPORT) {
    return { ok: false, error: `У доклада уже ${MAX_IMAGES_PER_REPORT} картинок — удалите лишние` };
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
    .storage.from(REPORT_BUCKET)
    .upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const { error: insError } = await db()
    .from('report_assets')
    .insert({ report_id: reportId, path, mime: kind.mime, size: bytes.length });
  if (insError) {
    await db().storage.from(REPORT_BUCKET).remove([path]);
    throw new Error(insError.message);
  }
  return { ok: true, name, path };
}

/** Delete one image (row + object). Returns what was removed, or null if it didn't exist. */
export async function removeReportImage(assetId: number, reportId?: number) {
  let q = db().from('report_assets').delete().eq('id', assetId);
  if (reportId !== undefined) q = q.eq('report_id', reportId);
  const { data, error } = await q.select('report_id, path').maybeSingle();
  if (error) throw new Error(error.message);
  if (data) await db().storage.from(REPORT_BUCKET).remove([data.path]);
  return data;
}

export async function removeAllReportImages(reportId: number) {
  const { data } = await db().from('report_assets').select('path').eq('report_id', reportId);
  if (data?.length)
    await db()
      .storage.from(REPORT_BUCKET)
      .remove(data.map((a) => a.path));
}
