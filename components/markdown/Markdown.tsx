import type { Element, Root } from 'hast';
import { toJsxRuntime, type Components } from 'hast-util-to-jsx-runtime';
import { toString } from 'hast-util-to-string';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { CodeBlock } from '@/components/code/CodeBlock';
import { cn } from '@/lib/cn';

type WithNode = { node?: Element };

function Pre({ node }: WithNode) {
  const code = node?.children.find(
    (c): c is Element => c.type === 'element' && c.tagName === 'code',
  );
  const classes = code?.properties.className;
  const lang = Array.isArray(classes)
    ? classes
        .map(String)
        .find((c) => c.startsWith('language-'))
        ?.slice('language-'.length)
    : undefined;
  return <CodeBlock code={code ? toString(code) : ''} lang={lang} />;
}

const components: Partial<Components> = {
  h1: ({ node: _n, ...p }: WithNode & React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mb-3 mt-8 scroll-mt-24 border-b-2 border-theme-border pb-2 text-2xl font-bold tracking-tight md:text-3xl"
      {...p}
    />
  ),
  h2: ({ node: _n, children, ...p }: WithNode & React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="mb-3 mt-8 flex scroll-mt-24 items-center gap-2 text-xl font-bold tracking-tight md:text-2xl"
      {...p}
    >
      <span
        aria-hidden
        className="inline-block h-6 w-2.5 shrink-0 rounded-sm border border-theme-border bg-theme-accent"
      />
      <span>{children}</span>
    </h2>
  ),
  h3: ({ node: _n, ...p }: WithNode & React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-2 mt-6 scroll-mt-24 text-lg font-bold md:text-xl" {...p} />
  ),
  h4: ({ node: _n, ...p }: WithNode & React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="mb-2 mt-4 scroll-mt-24 font-bold" {...p} />
  ),
  p: ({ node: _n, ...p }: WithNode & React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-3 leading-relaxed" {...p} />
  ),
  strong: ({ node: _n, ...p }: WithNode & React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-bold" {...p} />
  ),
  a: ({ node: _n, ...p }: WithNode & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="hover:bg-theme-accent/30 font-semibold underline decoration-theme-accent decoration-2 underline-offset-2"
      {...p}
    />
  ),
  ul: ({ node: _n, ...p }: WithNode & React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-3 list-outside list-disc space-y-1.5 pl-5 marker:font-bold marker:text-theme-main dark:marker:text-theme-accent"
      {...p}
    />
  ),
  ol: ({ node: _n, ...p }: WithNode & React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol
      className="my-3 list-outside list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-theme-main dark:marker:text-theme-accent"
      {...p}
    />
  ),
  li: ({ node: _n, ...p }: WithNode & React.LiHTMLAttributes<HTMLLIElement>) => (
    <li className="pl-1" {...p} />
  ),
  blockquote: ({ node: _n, ...p }: WithNode & React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-4 rounded-r-xl border-l-4 border-theme-accent bg-theme-cardMuted p-4 italic text-theme-secondary"
      {...p}
    />
  ),
  hr: () => <hr className="my-8 border-t-2 border-dashed border-theme-borderSubtle" />,
  img: ({ node: _n, src, alt }: WithNode & React.ImgHTMLAttributes<HTMLImageElement>) =>
    // Markdown puts images inside <p>, so only phrasing elements (span) may wrap them here —
    // <figure>/<div> would be invalid HTML and break hydration.
    src ? (
      <span className="my-6 block space-y-2">
        <span className="flex items-center justify-center overflow-hidden rounded-2xl border-2 border-theme-border bg-theme-surface p-2 shadow-neo">
          {/* eslint-disable-next-line @next/next/no-img-element -- session-guarded asset route, not optimizable */}
          <img
            src={typeof src === 'string' ? src : undefined}
            alt={alt ?? ''}
            loading="lazy"
            className="mx-auto h-auto max-h-[520px] w-full rounded-xl object-contain"
          />
        </span>
        {alt && <span className="block text-center font-mono text-xs text-theme-muted">{alt}</span>}
      </span>
    ) : null,
  pre: Pre,
  code: ({ node: _n, ...p }: WithNode & React.HTMLAttributes<HTMLElement>) => (
    <code
      className="border-theme-border/30 rounded border bg-theme-cardMuted px-1.5 py-0.5 font-mono text-[13px] font-semibold dark:text-theme-accent"
      {...p}
    />
  ),
  table: ({ node: _n, ...p }: WithNode & React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="my-4 overflow-x-auto rounded-xl border-2 border-theme-border shadow-neo-sm">
      <table className="min-w-full text-sm" {...p} />
    </div>
  ),
  thead: ({ node: _n, ...p }: WithNode & React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-theme-cardMuted font-bold" {...p} />
  ),
  th: ({ node: _n, ...p }: WithNode & React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="border-b-2 border-theme-border px-4 py-2.5 text-left font-bold" {...p} />
  ),
  td: ({ node: _n, ...p }: WithNode & React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-t border-theme-borderSubtle bg-theme-input px-4 py-2" {...p} />
  ),
};

export function Markdown({ hast, className }: { hast: Root; className?: string }) {
  return (
    <div className={cn('markdown-content break-words', className)}>
      {toJsxRuntime(hast, { Fragment, jsx, jsxs, components, passNode: true })}
    </div>
  );
}
