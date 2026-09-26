/// <reference lib="webworker" />
// Runs Python via Pyodide off the main thread. The page kills this worker on timeout
// (see runner.ts), which is the only reliable way to stop `while True:`.
import {
  MAX_OUTPUT_CHARS,
  normalizeOutput,
  PYODIDE_INDEX_URL,
  type RunRequest,
  type RunResult,
  type TestResult,
  type WorkerMessage,
} from './protocol';

/* eslint-disable @typescript-eslint/no-explicit-any -- Pyodide ships no types for the CDN build */
type Pyodide = any;

const scope = self as unknown as DedicatedWorkerGlobalScope;

const post = (m: WorkerMessage) => scope.postMessage(m);

// ───────── network lock ─────────
// Code from a published solution runs in the viewer's browser. While Python executes we
// remove every way to reach the network from this worker (same-origin requests would carry
// the viewer's session cookie). Package downloads happen before the lock, never during.
// Not blockable: dynamic import() — it can only issue GET requests whose responses are parsed
// as JS, never readable; the app's GET routes have no side effects and cookies are httpOnly.

type Saved = { target: object; key: string; descriptor: PropertyDescriptor };
const NETWORK_APIS: (() => object | undefined)[] = [
  () => scope, // own properties of the global
  () => (scope as any).WorkerGlobalScope?.prototype, // fetch/importScripts live on the prototype
];
const BLOCKED_KEYS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'WebTransport',
  'EventSource',
  'importScripts',
  'Worker',
  'SharedWorker',
  'BroadcastChannel',
  'caches',
];

let saved: Saved[] = [];

function lockNetwork() {
  if (saved.length) return;
  const blocked = () => {
    throw new Error('Сеть недоступна в песочнице');
  };
  for (const getTarget of NETWORK_APIS) {
    const target = getTarget();
    if (!target) continue;
    for (const key of BLOCKED_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      if (!descriptor?.configurable) continue;
      saved.push({ target, key, descriptor });
      Object.defineProperty(target, key, { value: blocked, configurable: true, writable: false });
    }
  }
}

function unlockNetwork() {
  for (const { target, key, descriptor } of saved) Object.defineProperty(target, key, descriptor);
  saved = [];
}

// ───────── pyodide ─────────

let pyodide: Pyodide | null = null;
let out = '';
let truncated = false;
let stdinData = '';
const decoder = new TextDecoder();

async function init() {
  post({ type: 'status', text: 'Загружаем Python…' });
  // Recent Pyodide ships as an ES module and refuses to run in a classic worker, which it
  // detects via `importScripts`. Next's webpack emits workers as classic scripts even with
  // { type: 'module' }; this worker is a single bundle that never calls importScripts, so we
  // shadow it and load Pyodide with dynamic import() instead.
  Object.defineProperty(scope, 'importScripts', { value: undefined, configurable: true });
  const { loadPyodide } = (await import(
    /* webpackIgnore: true */ `${PYODIDE_INDEX_URL}pyodide.mjs`
  )) as {
    loadPyodide: (opts: { indexURL: string }) => Promise<Pyodide>;
  };
  pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  const write = (buf: Uint8Array) => {
    if (!truncated) {
      out += decoder.decode(buf, { stream: true });
      if (out.length > MAX_OUTPUT_CHARS) {
        out = out.slice(0, MAX_OUTPUT_CHARS);
        truncated = true;
      }
    }
    return buf.length;
  };
  pyodide.setStdout({ write });
  pyodide.setStderr({ write });
  pyodide.setStdin({
    stdin: () => {
      if (!stdinData) return null;
      const chunk = stdinData;
      stdinData = '';
      return chunk;
    },
  });
  post({ type: 'ready' });
}

const ready = init().catch((e: unknown) => {
  post({ type: 'fatal', message: e instanceof Error ? e.message : String(e) });
  throw e;
});

function freshNamespace() {
  const ns = pyodide.globals.get('dict')();
  ns.set('__name__', '__main__');
  return ns;
}

/** Run `code` in `ns`; returns a short traceback on error (frames of our wrapper removed). */
function exec(code: string, ns: Pyodide): string | undefined {
  try {
    pyodide.runPython(code, { globals: ns, filename: '<solution>' });
    return undefined;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Keep the part of the traceback that points into the user's code.
    const idx = msg.indexOf('File "<solution>"');
    return idx >= 0 ? `Traceback (most recent call last):\n  ${msg.slice(idx)}` : msg;
  }
}

function resetIO(stdin: string) {
  out = '';
  truncated = false;
  stdinData = stdin;
}

async function run(req: RunRequest): Promise<RunResult> {
  await ready;
  const started = performance.now();

  // Needs the network (downloads wheels), so it runs before the lock.
  post({ type: 'status', text: 'Подгружаем пакеты…' });
  const allCode = [req.code, ...req.tests.map((t) => (t.type === 'assert' ? t.code : ''))].join(
    '\n',
  );
  try {
    await pyodide.loadPackagesFromImports(allCode);
  } catch {
    // Unknown imports surface as ModuleNotFoundError when the code runs.
  }

  post({ type: 'status', text: 'Выполняем…' });
  lockNetwork();
  try {
    resetIO(req.stdin);
    const error = exec(req.code, freshNamespace());
    const stdout = out;
    const mainTruncated = truncated;

    const tests: TestResult[] = req.tests.map((t) => {
      if (t.type === 'io') {
        resetIO(t.input);
        const err = exec(req.code, freshNamespace());
        if (err) return { name: t.name, passed: false, detail: err };
        const passed = normalizeOutput(out) === normalizeOutput(t.expected);
        return {
          name: t.name,
          passed,
          detail: passed ? undefined : `Ожидалось:\n${t.expected}\n\nПолучено:\n${out}`,
        };
      }
      resetIO('');
      const ns = freshNamespace();
      const err = exec(req.code, ns) ?? exec(t.code, ns);
      return { name: t.name, passed: !err, detail: err };
    });

    return {
      id: req.id,
      stdout,
      error,
      tests,
      truncated: mainTruncated,
      timeMs: Math.round(performance.now() - started),
    };
  } finally {
    unlockNetwork();
  }
}

scope.onmessage = async (e: MessageEvent<RunRequest>) => {
  try {
    post({ type: 'result', result: await run(e.data) });
  } catch (err: unknown) {
    post({ type: 'fatal', message: err instanceof Error ? err.message : String(err) });
  }
};
