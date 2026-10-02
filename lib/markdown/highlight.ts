import 'server-only';
import { createHighlighter, type Highlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

// Both themes are emitted; `.dark .shiki-dual span` in globals.css swaps in the dark colors.
const THEMES = { light: 'github-light-default', dark: 'github-dark-default' } as const;

const LANGS = [
  'python',
  'bash',
  'shellsession',
  'json',
  'sql',
  'javascript',
  'typescript',
  'yaml',
  'toml',
  'markdown',
  'html',
  'css',
  'ini',
  'dockerfile',
] as const;

const ALIASES: Record<string, string> = {
  py: 'python',
  python3: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'shellsession',
  js: 'javascript',
  ts: 'typescript',
  yml: 'yaml',
  md: 'markdown',
};

let highlighter: Promise<Highlighter> | undefined;

function getHighlighter() {
  // JS regex engine: no WASM to ship in the serverless bundle.
  highlighter ??= createHighlighter({
    themes: [THEMES.light, THEMES.dark],
    langs: [...LANGS],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

export function normalizeLang(lang: string | undefined): string {
  const l = (lang ?? '').toLowerCase();
  const resolved = ALIASES[l] ?? l;
  return (LANGS as readonly string[]).includes(resolved) ? resolved : 'text';
}

/** Highlighted hast for the <code> contents (one span per line). The <pre> wrapper is ours. */
export async function highlightToHast(code: string, lang: string) {
  const hl = await getHighlighter();
  const root = hl.codeToHast(code.replace(/\n$/, ''), {
    lang: normalizeLang(lang),
    themes: THEMES,
    defaultColor: 'light',
  });
  const pre = root.children[0];
  const codeEl = pre?.type === 'element' ? pre.children[0] : undefined;
  if (!codeEl || codeEl.type !== 'element') throw new Error('unexpected shiki output');
  return codeEl;
}
