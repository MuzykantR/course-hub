import type { z } from 'zod';

export type FormValues = Record<string, string | string[]>;

/** What admin server actions return to useActionState. */
export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Submitted values, so a form re-rendered after a validation error keeps the user's input. */
  values?: FormValues;
  ok?: string;
};

export const initialFormState: FormState = {};

/** FormData → plain object; keys listed in `arrayKeys` (multi-selects, checkboxes) become arrays. */
export function formValues(fd: FormData, arrayKeys: readonly string[] = []): FormValues {
  const out: FormValues = {};
  for (const key of new Set(fd.keys())) {
    if (key.startsWith('$ACTION')) continue;
    const all = fd.getAll(key).filter((v): v is string => typeof v === 'string');
    out[key] = arrayKeys.includes(key) ? all : (all[0] ?? '');
  }
  for (const key of arrayKeys) out[key] ??= [];
  return out;
}

export function parseForm<S extends z.ZodType>(
  schema: S,
  fd: FormData,
  arrayKeys: readonly string[] = [],
): { ok: true; data: z.infer<S>; values: FormValues } | { ok: false; state: FormState } {
  const values = formValues(fd, arrayKeys);
  const parsed = schema.safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data, values };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? '');
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, state: { error: 'Проверьте поля формы', fieldErrors, values } };
}

/** Postgres unique violation → readable message (keeping the user's input); else rethrow. */
export function uniqueViolation(
  error: { code?: string; message: string },
  message: string,
  values?: FormValues,
): FormState {
  if (error.code === '23505') return { error: message, values };
  throw new Error(error.message);
}

const formKeys = new WeakMap<object, number>();
let formKeyCounter = 0;

/**
 * A key that changes with every action response. React 19 resets a form after its action,
 * and <select defaultValue> snaps back to the *initial* default — remounting the form with
 * the returned values is the reliable way to keep the user's input after an error.
 */
export function formKey(state: FormState): number {
  let key = formKeys.get(state);
  if (key === undefined) {
    key = ++formKeyCounter;
    formKeys.set(state, key);
  }
  return key;
}
