import { z } from 'zod';

export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/** Wall-clock budget for one run (program + all tests). The worker is killed after it. */
export const RUN_TIMEOUT_MS = 10_000;
/** Output beyond this is cut so a print loop can't flood the page. */
export const MAX_OUTPUT_CHARS = 64 * 1024;

/**
 * Tests stored in tasks.tests (jsonb):
 * - assert: the solution runs, then `code` runs in the same namespace; it passes unless it raises.
 * - io: the solution runs with `input` on stdin; stdout must equal `expected`
 *   (trailing whitespace of each line and trailing blank lines are ignored).
 */
export const taskTestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('assert'),
    name: z.string().trim().min(1).max(100),
    code: z.string().min(1).max(5000),
  }),
  z.object({
    type: z.literal('io'),
    name: z.string().trim().min(1).max(100),
    input: z.string().max(10_000).default(''),
    expected: z.string().max(10_000),
  }),
]);
export const taskTestsSchema = z.array(taskTestSchema).max(30);
export type TaskTest = z.infer<typeof taskTestSchema>;

export type RunRequest = { id: number; code: string; stdin: string; tests: TaskTest[] };

export type TestResult = { name: string; passed: boolean; detail?: string };

export type RunResult = {
  id: number;
  stdout: string;
  /** Traceback of the main run, if it raised. */
  error?: string;
  tests: TestResult[];
  truncated: boolean;
  timeMs: number;
};

export type WorkerMessage =
  | { type: 'ready' }
  | { type: 'status'; text: string }
  | { type: 'result'; result: RunResult }
  | { type: 'fatal'; message: string };

/** Output comparison for io tests: ignore trailing spaces per line and trailing empty lines. */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n+$/, '');
}

/** Parse tests from the DB/admin form; invalid data yields no tests rather than a crash. */
export function parseTaskTests(raw: unknown): TaskTest[] {
  const r = taskTestsSchema.safeParse(raw);
  return r.success ? r.data : [];
}
