'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Play, TerminalSquare, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { RUN_TIMEOUT_MS, type TaskTest } from '@/lib/python/protocol';
import { pythonRunner, type RunOutcome } from '@/lib/python/runner';
import { CodeEditor } from './CodeEditor';

export type SampleSolution = { label: string; code: string };

export function PyRunner({
  tests,
  samples = [],
  starter = '',
}: {
  tests: TaskTest[];
  samples?: SampleSolution[];
  starter?: string;
}) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const [stdin, setStdin] = useState('');
  const [status, setStatus] = useState('');
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  useEffect(() => pythonRunner().onStatus(setStatus), []);

  const run = async () => {
    if (running || !editor.current) return;
    setRunning(true);
    setOutcome(null);
    try {
      setOutcome(await pythonRunner().run(editor.current.value, stdin, tests));
    } finally {
      setRunning(false);
    }
  };

  const loadSample = (index: string) => {
    const s = samples[Number(index)];
    if (s && editor.current) editor.current.value = s.code;
  };

  const result = outcome?.kind === 'ok' ? outcome.result : null;
  const passed = result?.tests.filter((t) => t.passed).length ?? 0;

  return (
    <div className="flex flex-col gap-4 rounded-card border-2 border-theme-border bg-theme-card p-4 shadow-neo md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-theme-muted">
          Python в браузере{tests.length > 0 && ` · ${tests.length} тестов`}
        </p>
        {samples.length > 0 && (
          <Select
            aria-label="Загрузить решение в редактор"
            defaultValue=""
            onChange={(e) => loadSample(e.target.value)}
            className="h-9 w-auto max-w-full text-xs"
          >
            <option value="" disabled>
              Загрузить решение…
            </option>
            {samples.map((s, i) => (
              <option key={i} value={i}>
                {s.label}
              </option>
            ))}
          </Select>
        )}
      </div>

      <CodeEditor
        ref={editor}
        defaultValue={starter}
        onRun={run}
        aria-label="Код на Python"
        placeholder="# Напишите решение и нажмите «Запустить» (Ctrl+Enter)"
      />

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-theme-secondary">
          Ввод для input() (stdin)
        </summary>
        <textarea
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          rows={3}
          spellCheck={false}
          className="mt-2 w-full rounded-xl border-2 border-theme-border bg-theme-input p-3 font-mono text-[13px] focus:outline-none focus:ring-2 focus:ring-theme-accent"
        />
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={run} disabled={running}>
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          {running ? status || 'Запускаем…' : tests.length ? 'Запустить и проверить' : 'Запустить'}
        </Button>
        <span className="text-xs text-theme-muted">
          Ctrl+Enter · лимит {RUN_TIMEOUT_MS / 1000} с · сеть отключена
        </span>
      </div>

      {outcome?.kind === 'timeout' && (
        <p
          role="alert"
          className="rounded-xl border-2 border-theme-border bg-amber-100 px-3 py-2 text-sm font-medium text-amber-950 dark:bg-amber-950 dark:text-amber-100"
        >
          Время вышло ({RUN_TIMEOUT_MS / 1000} с) — возможно, бесконечный цикл. Python перезапущен.
        </p>
      )}
      {outcome?.kind === 'error' && (
        <p
          role="alert"
          className="rounded-xl border-2 border-theme-border bg-rose-100 px-3 py-2 text-sm font-medium text-rose-900 dark:bg-rose-950 dark:text-rose-200"
        >
          {outcome.message}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border-2 border-theme-border">
            <div className="flex items-center gap-2 border-b-2 border-[var(--code-rule)] bg-[var(--code-header)] px-4 py-2 font-mono text-xs text-[var(--code-meta)]">
              <TerminalSquare className="h-4 w-4" /> Вывод · {result.timeMs} мс
            </div>
            <pre className="max-h-72 overflow-auto bg-[var(--code-bg)] p-4 text-[13px] text-[var(--code-text)]">
              {result.stdout || (result.error ? '' : '(пусто)')}
              {result.truncated && '\n… вывод обрезан'}
              {result.error && <span className="text-rose-700 dark:text-rose-300">{result.error}</span>}
            </pre>
          </div>

          {result.tests.length > 0 && (
            <div className="flex flex-col gap-2">
              <p
                className={cn(
                  'font-bold',
                  passed === result.tests.length ? 'text-emerald-700 dark:text-emerald-400' : '',
                )}
              >
                Тесты: {passed} из {result.tests.length}
              </p>
              <ul className="flex flex-col gap-2">
                {result.tests.map((t, i) => (
                  <li
                    key={i}
                    className={cn(
                      'rounded-xl border-2 p-3 text-sm',
                      t.passed
                        ? 'border-theme-borderSubtle'
                        : 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-500/10',
                    )}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {t.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      )}
                      {t.name}
                    </div>
                    {t.detail && (
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-theme-cardMuted p-2 font-mono text-xs">
                        {t.detail}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
