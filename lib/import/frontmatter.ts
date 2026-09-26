// Pure parsing for scripts/import-reports.ts (unit-tested).

export type ReportMeta = {
  title: string;
  library: string;
  authors: string[];
  group?: string;
  lesson?: number;
  tags: string[];
  summary: string;
  body: string;
};

const list = (v: string | undefined) =>
  (v ?? '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Optional front matter between `---` lines (`key: value`, one per line). Missing fields are
 * inferred: title from the first `# ` heading (which is then dropped from the body), library
 * from the file name.
 */
export function parseReportFile(fileName: string, text: string): ReportMeta {
  let body = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const fields: Record<string, string> = {};
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(body);
  if (fm) {
    for (const line of fm[1]!.split('\n')) {
      const m = /^([\w-]+)\s*:\s*(.*)$/.exec(line.trim());
      if (m) fields[m[1]!.toLowerCase()] = m[2]!.trim().replace(/^["']|["']$/g, '');
    }
    body = body.slice(fm[0].length);
  }

  let title = fields.title ?? '';
  if (!title) {
    const h1 = /^#\s+(.+)$/m.exec(body);
    if (h1) {
      title = h1[1]!.trim();
      body = body.replace(h1[0], '').replace(/^\n+/, '');
    }
  }
  const base = fileName.replace(/\.(md|markdown)$/i, '');
  const lesson = fields.lesson ? Number(fields.lesson) : undefined;

  return {
    title: title || base,
    library: fields.library || base.split(/[_\s-]/)[0] || base,
    authors: list(fields.authors ?? fields.author),
    group: fields.group || undefined,
    lesson: lesson && Number.isInteger(lesson) && lesson > 0 ? lesson : undefined,
    tags: list(fields.tags).map((t) => t.toLowerCase().replace(/^#/, '')),
    summary: fields.summary ?? '',
    body: body.trim(),
  };
}

/** Relative image references in Markdown (`![..](x.png)`) — the files to upload with the report. */
export function localImageRefs(md: string): string[] {
  const refs = new Set<string>();
  // ![alt](path) or ![alt](<path with spaces>), optionally with a "title".
  for (const m of md.matchAll(/!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+"[^"]*")?\s*\)/g)) {
    const ref = (m[1] ?? m[2])!;
    if (
      !/^[a-z][a-z0-9+.-]*:/i.test(ref) &&
      !ref.startsWith('/') &&
      !ref.split('/').includes('..')
    ) {
      refs.add(ref.replace(/^\.\//, ''));
    }
  }
  return [...refs];
}

/** Match "Иванова Анна" and "Анна Иванова" alike (word order and case don't matter). */
export function nameKey(name: string): string {
  return name.toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(Boolean).sort().join(' ');
}
