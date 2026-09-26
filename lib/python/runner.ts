'use client';

import { RUN_TIMEOUT_MS, type RunResult, type TaskTest, type WorkerMessage } from './protocol';

const LOAD_TIMEOUT_MS = 90_000;

export type RunOutcome =
  { kind: 'ok'; result: RunResult } | { kind: 'timeout' } | { kind: 'error'; message: string };

/**
 * One shared Pyodide worker per tab. A run that exceeds the time limit terminates the worker;
 * the next run starts a fresh one (Python reloads, a few seconds).
 */
class PythonRunner {
  private worker: Worker | null = null;
  private nextId = 1;
  private listeners = new Set<(status: string) => void>();

  onStatus(fn: (status: string) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(status: string) {
    for (const fn of this.listeners) fn(status);
  }

  private getWorker(): Worker {
    this.worker ??= new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' });
    return this.worker;
  }

  private kill() {
    this.worker?.terminate();
    this.worker = null;
  }

  run(code: string, stdin: string, tests: TaskTest[]): Promise<RunOutcome> {
    const worker = this.getWorker();
    const id = this.nextId++;
    // RUN_TIMEOUT_MS covers execution only; loading Python and packages gets its own, longer
    // budget so a dead network can't leave the button spinning forever.
    let timer: ReturnType<typeof setTimeout> | undefined;

    return new Promise<RunOutcome>((resolve) => {
      const finish = (outcome: RunOutcome) => {
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        this.emit('');
        resolve(outcome);
      };
      const onMessage = (e: MessageEvent<WorkerMessage>) => {
        const m = e.data;
        if (m.type === 'status') {
          this.emit(m.text);
          if (m.text === 'Выполняем…') {
            clearTimeout(timer);
            timer = setTimeout(() => {
              this.kill();
              finish({ kind: 'timeout' });
            }, RUN_TIMEOUT_MS);
          }
        } else if (m.type === 'result' && m.result.id === id) {
          finish({ kind: 'ok', result: m.result });
        } else if (m.type === 'fatal') {
          this.kill();
          finish({ kind: 'error', message: m.message });
        }
      };
      const onError = (e: ErrorEvent) => {
        this.kill();
        finish({ kind: 'error', message: e.message || 'Не удалось запустить Python' });
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      timer = setTimeout(() => {
        this.kill();
        finish({ kind: 'error', message: 'Python не загрузился — проверьте интернет и попробуйте ещё раз.' });
      }, LOAD_TIMEOUT_MS);
      worker.postMessage({ id, code, stdin, tests });
    });
  }
}

let runner: PythonRunner | undefined;
export function pythonRunner(): PythonRunner {
  runner ??= new PythonRunner();
  return runner;
}
