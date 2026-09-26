import type { Element, Root } from 'hast';
import { describe, expect, it } from 'vitest';
import { visit } from 'unist-util-visit';
import {
  escapeShellVars,
  markdownToHast,
  resolveImageSrc,
  safeHref,
} from '@/lib/markdown/pipeline';

function elements(tree: Root, tag: string): Element[] {
  const out: Element[] = [];
  visit(tree, 'element', (n: Element) => {
    if (n.tagName === tag) out.push(n);
  });
  return out;
}

describe('markdownToHast', () => {
  it('drops raw HTML entirely', async () => {
    const { hast } = await markdownToHast(
      'hi <script>alert(1)</script> <img src=x onerror=alert(1)>\n\n<iframe src="https://x"></iframe>',
    );
    expect(elements(hast, 'script')).toHaveLength(0);
    expect(elements(hast, 'iframe')).toHaveLength(0);
    expect(elements(hast, 'img')).toHaveLength(0);
    expect(JSON.stringify(hast)).not.toContain('onerror');
  });

  it('strips javascript: links and marks external ones', async () => {
    const { hast } = await markdownToHast(
      '[bad](javascript:alert(1)) [ext](https://docs.python.org) [local](/kb)',
    );
    const [bad, ext, local] = elements(hast, 'a');
    expect(bad!.properties.href).toBeUndefined();
    expect(ext!.properties).toMatchObject({ href: 'https://docs.python.org', target: '_blank' });
    expect(local!.properties.href).toBe('/kb');
    expect(local!.properties.target).toBeUndefined();
  });

  it('builds a table of contents with unique ids from h2/h3', async () => {
    const { hast, toc } = await markdownToHast(
      '# Title\n\n## Установка\n\n### `pip install`\n\n## Установка\n\n```python\n## not a heading\n```',
    );
    expect(toc).toEqual([
      { depth: 2, id: 'установка', text: 'Установка' },
      { depth: 3, id: 'pip-install', text: 'pip install' },
      { depth: 2, id: 'установка-1', text: 'Установка' },
    ]);
    expect(elements(hast, 'h1')[0]!.properties.id).toBe('title');
  });

  it('rewrites relative images to the asset base and drops unsafe ones', async () => {
    const { hast } = await markdownToHast(
      '![a](img/plot.png) ![b](../secret.png) ![c](http://insecure/x.png) ![d](https://ok/x.png)',
      { assetBase: '/api/assets/reports/7' },
    );
    expect(elements(hast, 'img').map((i) => i.properties.src)).toEqual([
      '/api/assets/reports/7/img/plot.png',
      undefined,
      undefined,
      'https://ok/x.png',
    ]);
  });

  it('renders math', async () => {
    const { hast } = await markdownToHast('Сложность $O(n \\log n)$');
    expect(JSON.stringify(hast)).toContain('katex');
  });
});

describe('escapeShellVars', () => {
  it('escapes ${VAR} in prose but not in code', () => {
    expect(escapeShellVars('run ${HOME} and `${HOME}`')).toBe('run \\${HOME} and `${HOME}`');
    expect(escapeShellVars('```sh\necho ${PATH}\n```')).toBe('```sh\necho ${PATH}\n```');
  });
});

describe('safeHref / resolveImageSrc', () => {
  it.each([
    ['https://a.b', 'https://a.b'],
    ['#intro', '#intro'],
    ['other.md', 'other.md'],
    ['JaVaScRiPt:alert(1)', null],
    ['data:text/html,x', null],
    ['//evil.example', null],
  ])('safeHref(%s) → %s', (input, expected) => {
    expect(safeHref(input)).toBe(expected);
  });

  it('never resolves images without an asset base', () => {
    expect(resolveImageSrc('plot.png')).toBeNull();
    expect(resolveImageSrc('/etc/passwd', '/api/assets/reports/1')).toBeNull();
  });
});
