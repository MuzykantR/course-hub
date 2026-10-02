import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { highlightToHast, normalizeLang } from '@/lib/markdown/highlight';
import { cn } from '@/lib/cn';

/** Server-highlighted code block (Shiki). No client JS. */
export async function CodeBlock({
  code,
  lang,
  title,
  className,
}: {
  code: string;
  lang?: string;
  title?: string;
  className?: string;
}) {
  const language = normalizeLang(lang);
  const hast = await highlightToHast(code, language);
  const body = toJsxRuntime(hast, { Fragment, jsx, jsxs });

  return (
    <div
      className={cn(
        'my-4 overflow-hidden rounded-2xl border-2 border-theme-border bg-[var(--code-bg)] shadow-neo-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--code-rule)] bg-[var(--code-header)] px-4 py-2">
        <span className="rounded-md bg-theme-accent px-2 font-mono text-xs font-semibold text-theme-accentText">
          {language === 'text' ? (lang ?? 'code') : language}
        </span>
        {title && <span className="truncate font-mono text-xs text-[var(--code-meta)]">{title}</span>}
      </div>
      <pre className="shiki-dual overflow-x-auto p-4 text-[13px] leading-relaxed text-[var(--code-text)]">
        {body}
      </pre>
    </div>
  );
}
