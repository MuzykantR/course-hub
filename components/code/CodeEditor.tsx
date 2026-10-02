'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { onEnter, onTab, type Edit } from '@/lib/python/editorKeys';

/**
 * Apply an edit through execCommand('insertText') so Ctrl+Z keeps working; fall back to a
 * plain value assignment where the command isn't supported.
 */
function apply(el: HTMLTextAreaElement, edit: Edit) {
  const { value } = el;
  let start = 0;
  while (start < value.length && value[start] === edit.value[start]) start++;
  let endOld = value.length;
  let endNew = edit.value.length;
  while (endOld > start && endNew > start && value[endOld - 1] === edit.value[endNew - 1]) {
    endOld--;
    endNew--;
  }
  el.setSelectionRange(start, endOld);
  const ok = document.execCommand('insertText', false, edit.value.slice(start, endNew));
  if (!ok) {
    el.value = edit.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  el.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}

type Props = Omit<React.ComponentProps<'textarea'>, 'ref'> & { onRun?: () => void };

/** A textarea that behaves like a small Python editor. Uncontrolled: read `.value` via ref or form. */
export const CodeEditor = forwardRef<HTMLTextAreaElement, Props>(function CodeEditor(
  { onRun, className, onKeyDown, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      className={cn(
        'min-h-[16rem] w-full resize-y rounded-xl border-2 border-theme-border bg-[var(--code-bg)] p-4 font-mono text-[13px] leading-relaxed text-[var(--code-text)] caret-theme-main focus:outline-none focus:ring-2 focus:ring-theme-accent',
        className,
      )}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        const el = e.currentTarget;
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          onRun?.();
        } else if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          apply(el, onTab(el.value, el.selectionStart, el.selectionEnd, e.shiftKey));
        } else if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          apply(el, onEnter(el.value, el.selectionStart, el.selectionEnd));
        }
      }}
      {...props}
    />
  );
});
