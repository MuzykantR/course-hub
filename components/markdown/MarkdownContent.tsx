import { markdownToHast, type MarkdownOptions } from '@/lib/markdown/pipeline';
import { Markdown } from './Markdown';

/** Convenience wrapper for places that don't need the table of contents. */
export async function MarkdownContent({
  source,
  className,
  ...options
}: { source: string; className?: string } & MarkdownOptions) {
  if (!source.trim()) return null;
  const { hast } = await markdownToHast(source, options);
  return <Markdown hast={hast} className={className} />;
}
