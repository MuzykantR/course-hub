'use client';

import { useEffect, useRef } from 'react';

/**
 * Submits the enclosing GET form whenever a <select> in it changes. Without JS the form
 * still works through its submit button — filters are plain query parameters.
 */
export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const onChange = (e: Event) => {
      if (e.target instanceof HTMLSelectElement) form.requestSubmit();
    };
    form.addEventListener('change', onChange);
    return () => form.removeEventListener('change', onChange);
  }, []);
  return <span ref={ref} hidden />;
}
