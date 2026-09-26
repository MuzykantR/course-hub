// Bulk import of Markdown reports.
//
//   npx tsx scripts/import-reports.ts <folder> --group group-1 [--status approved|pending] [--dry-run]
//
// Every *.md in <folder> becomes one report. Optional front matter:
//   ---
//   title: NumPy: массивы без циклов
//   library: NumPy
//   authors: Анна Иванова, Борис Петров
//   group: group-1        (overrides --group)
//   lesson: 1             (lesson number)
//   tags: numpy, performance
//   summary: Векторизация и broadcasting.
//   ---
// Images referenced as ![](plot.png) are taken from the same folder and uploaded.
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/db/types.gen';
import { contentHash } from '../lib/hash';
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_REPORT, sniffImage } from '../lib/images';
import { localImageRefs, nameKey, parseReportFile } from '../lib/import/frontmatter';
import { reportSlugBase, slugify, uniqueSlug } from '../lib/slug';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const folder = process.argv[2];
  if (!folder || folder.startsWith('--')) {
    console.error(
      'Usage: npx tsx scripts/import-reports.ts <folder> --group <slug> [--status approved|pending] [--dry-run]',
    );
    process.exit(1);
  }
  const dryRun = process.argv.includes('--dry-run');
  const status = arg('status') === 'pending' ? 'pending' : 'approved';
  loadEnvConfig(process.cwd());
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  const db = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const [groups, students, lessons, existing] = await Promise.all([
    db.from('groups').select('id, slug'),
    db.from('students').select('id, full_name, group_id'),
    db.from('lessons').select('id, number'),
    db.from('reports').select('slug, content_hash'),
  ]);
  for (const r of [groups, students, lessons, existing])
    if (r.error) throw new Error(r.error.message);
  const groupBySlug = new Map(groups.data!.map((g) => [g.slug, g.id]));
  const studentByName = new Map(students.data!.map((s) => [nameKey(s.full_name), s]));
  const lessonByNumber = new Map(lessons.data!.map((l) => [l.number, l.id]));
  const slugs = existing.data!.map((r) => r.slug);
  const hashes = new Set(existing.data!.map((r) => r.content_hash));

  const files = (await readdir(folder)).filter((f) => /\.(md|markdown)$/i.test(f)).sort();
  let imported = 0;
  for (const file of files) {
    const meta = parseReportFile(file, await readFile(path.join(folder, file), 'utf8'));
    const problems: string[] = [];

    const groupSlug = meta.group ?? arg('group');
    const groupId = groupSlug ? groupBySlug.get(groupSlug) : undefined;
    if (!groupId)
      problems.push(`группа «${groupSlug ?? '—'}» не найдена (--group или group: в файле)`);

    const authorIds: number[] = [];
    for (const name of meta.authors) {
      const s = studentByName.get(nameKey(name));
      if (s) authorIds.push(s.id);
      else problems.push(`автор «${name}» не найден среди студентов`);
    }
    if (!authorIds.length) problems.push('нет ни одного найденного автора');

    const lessonId = meta.lesson ? lessonByNumber.get(meta.lesson) : undefined;
    if (meta.lesson && !lessonId) problems.push(`занятие №${meta.lesson} не найдено`);

    if (new TextEncoder().encode(meta.body).length > 100 * 1024)
      problems.push('текст больше 100 КБ');

    const images: { name: string; ref: string; bytes: Uint8Array; mime: string }[] = [];
    const usedNames: string[] = [];
    for (const ref of localImageRefs(meta.body)) {
      try {
        const bytes = new Uint8Array(await readFile(path.join(folder, ref)));
        const kind = sniffImage(bytes.subarray(0, 16));
        if (!kind) problems.push(`${ref}: не PNG/JPEG/WebP`);
        else if (bytes.length > MAX_IMAGE_BYTES) problems.push(`${ref}: больше 2 МБ`);
        else {
          const base = uniqueSlug(
            slugify(path.basename(ref).replace(/\.[^.]*$/, ''), 60) || 'image',
            usedNames,
          );
          usedNames.push(base);
          images.push({ ref, name: `${base}.${kind.ext}`, bytes, mime: kind.mime });
        }
      } catch {
        problems.push(`${ref}: файл не найден рядом с ${file}`);
      }
    }
    if (images.length > MAX_IMAGES_PER_REPORT)
      problems.push(`больше ${MAX_IMAGES_PER_REPORT} картинок`);

    // Point image links at the sanitized names the files are stored under.
    let body = meta.body;
    for (const img of images) {
      for (const form of [`(<${img.ref}>`, `(<./${img.ref}>`, `(./${img.ref}`, `(${img.ref}`]) {
        body = body.split(form).join(`(${img.name}`);
      }
    }

    // Compare the text as it will be stored (image links already renamed).
    const hash = contentHash(body);
    if (hashes.has(hash)) problems.push('доклад с таким же текстом уже есть');

    if (problems.length) {
      console.log(`✗ ${file}\n    ${problems.join('\n    ')}`);
      continue;
    }

    const slug = uniqueSlug(reportSlugBase(meta.library, meta.title), slugs);
    console.log(`✓ ${file} → /reports/${slug} (${authorIds.length} авт., ${images.length} карт.)`);
    if (dryRun) continue;

    const { data: report, error } = await db
      .from('reports')
      .insert({
        slug,
        title: meta.title.slice(0, 200),
        library: meta.library.slice(0, 100),
        summary: meta.summary.slice(0, 1000),
        content_md: body,
        group_id: groupId!,
        lesson_id: lessonId ?? null,
        tags: meta.tags.slice(0, 10),
        status,
        content_hash: hash,
        reviewed_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error) throw new Error(`${file}: ${error.message}`);
    const { error: aErr } = await db
      .from('report_authors')
      .insert(authorIds.map((student_id) => ({ report_id: report.id, student_id })));
    if (aErr) throw new Error(`${file}: ${aErr.message}`);
    for (const img of images) {
      const p = `reports/${report.id}/${img.name}`;
      const up = await db.storage
        .from('report-assets')
        .upload(p, img.bytes, { contentType: img.mime, upsert: true });
      if (up.error) throw new Error(`${file}: ${up.error.message}`);
      const { error: iErr } = await db
        .from('report_assets')
        .insert({ report_id: report.id, path: p, mime: img.mime, size: img.bytes.length });
      if (iErr) throw new Error(`${file}: ${iErr.message}`);
    }
    await db.from('audit_log').insert({
      actor: 'teacher',
      action: 'report.import',
      entity: 'report',
      entity_id: String(report.id),
      meta: { file },
    });
    slugs.push(slug);
    hashes.add(hash);
    imported++;
  }
  console.log(
    dryRun
      ? `\nПробный прогон: ${files.length} файлов проверено, ничего не записано.`
      : `\nИмпортировано: ${imported} из ${files.length}.`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
