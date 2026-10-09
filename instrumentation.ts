import type { Instrumentation } from 'next';

/**
 * Server errors on key pages count against SLO 2–4 («Надёжность»). `notFound()` / `redirect()`
 * are not errors and never reach this hook.
 */
export const onRequestError: Instrumentation.onRequestError = async (_err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || context.routeType !== 'render') return;
  const { keyRouteOf, metricKind } = await import('@/lib/reliability-core');
  const route = keyRouteOf(context.routePath);
  if (!route) return;
  const q = new URL(request.path, 'http://local').searchParams.get('q');
  const { insertMetric } = await import('@/lib/metrics');
  await insertMetric({ kind: metricKind(route, q), route, duration_ms: 0, ok: false });
};
