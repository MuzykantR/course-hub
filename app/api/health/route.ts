import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { env } from '@/lib/env';

// Public health check for the uptime pinger (SLO «Сайт отвечает»). Answers 200 when the site and
// the database respond, 503 otherwise; never returns any data. Only a ping carrying the secret
// HEALTH_CHECK_TOKEN is recorded, at most once per 4 minutes (see record_health_check()).

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };

function tokenMatches(given: string | null): boolean {
  const expected = env().HEALTH_CHECK_TOKEN;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const { error } = await db().from('settings').select('id').limit(1).single();
  if (error) {
    console.error('health check: database unavailable', error.message);
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
  if (tokenMatches(request.nextUrl.searchParams.get('token'))) {
    const { error: recordError } = await db().rpc('record_health_check');
    if (recordError) console.error('health check: record failed', recordError.message);
  }
  return NextResponse.json({ ok: true }, { headers });
}

// UptimeRobot's free plan sends HEAD requests by default.
export const HEAD = GET;
