import { HONEYPOT_FIELD } from '@/lib/submissions-core';

/** Invisible to people (and skipped by keyboard/screen readers); naive bots fill it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Сайт
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
