// Markdown → hast. Raw HTML is never allowed: remark-rehype drops `html` nodes unless
// allowDangerousHtml is set, and we never set it (see CLAUDE.md).
import GithubSlugger from 'github-slugger';
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export type TocEntry = { depth: 2 | 3; id: string; text: string };

export type MarkdownOptions = {
  /** Base URL for relative image paths, e.g. `/api/assets/reports/12`. Without it they are dropped. */
  assetBase?: string;
};

/** Escape shell-style ${VAR} outside code so remark-math doesn't read `$` as a formula. */
export function escapeShellVars(md: string): string {
  return md
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/(?<!\\)\$\{(\w+)\}/g, '\\${$1}')))
    .join('');
}

const SAFE_HREF = /^(https?:|mailto:|#|\/(?![/\\]))/i;

export function safeHref(href: string): string | null {
  const h = href.trim();
  if (SAFE_HREF.test(h)) return h;
  // Relative links like "other.md" or "./x" carry no scheme — harmless.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(h) && !h.startsWith('//') && !h.includes('\\')) return h;
  return null;
}

export function resolveImageSrc(src: string, assetBase?: string): string | null {
  const s = src.trim();
  if (/^https:\/\//i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('/') || s.includes('\\')) return null;
  if (!assetBase) return null;
  const parts = s.replace(/^\.\//, '').split('/');
  if (parts.some((p) => p === '..' || p === '')) return null;
  return `${assetBase}/${parts.map(encodeURIComponent).join('/')}`;
}

function rehypeCourse(options: MarkdownOptions, toc: TocEntry[]) {
  return () => (tree: Root) => {
    const slugger = new GithubSlugger();
    visit(tree, 'element', (node: Element) => {
      if (/^h[1-4]$/.test(node.tagName)) {
        const text = toString(node).trim();
        const id = slugger.slug(text) || 'section';
        node.properties.id = id;
        if (node.tagName === 'h2' || node.tagName === 'h3') {
          toc.push({ depth: node.tagName === 'h2' ? 2 : 3, id, text });
        }
      } else if (node.tagName === 'a') {
        const href =
          typeof node.properties.href === 'string' ? safeHref(node.properties.href) : null;
        if (href === null) delete node.properties.href;
        else {
          node.properties.href = href;
          if (/^https?:/i.test(href)) {
            node.properties.target = '_blank';
            node.properties.rel = ['noopener', 'noreferrer', 'nofollow'];
          }
        }
      } else if (node.tagName === 'img') {
        const src =
          typeof node.properties.src === 'string'
            ? resolveImageSrc(node.properties.src, options.assetBase)
            : null;
        if (src === null) delete node.properties.src;
        else node.properties.src = src;
      }
    });
  };
}

export async function markdownToHast(
  md: string,
  options: MarkdownOptions = {},
): Promise<{ hast: Root; toc: TocEntry[] }> {
  const toc: TocEntry[] = [];
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeCourse(options, toc));
  const hast = (await processor.run(processor.parse(escapeShellVars(md)))) as Root;
  return { hast, toc };
}
