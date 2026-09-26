import { createHash } from 'node:crypto';

/** Content fingerprint for duplicate detection: line endings and outer whitespace don't count. */
export function contentHash(...parts: (string | null | undefined)[]): string {
  const normalized = parts.map((p) => (p ?? '').replace(/\r\n?/g, '\n').trim()).join('\u0000');
  return createHash('sha256').update(normalized).digest('hex');
}
