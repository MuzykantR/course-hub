import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/token';

// First gate: a valid signature is required everywhere except /login. Role checks and the
// course-password version check happen server-side in lib/auth/guards.ts.
export async function middleware(req: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const session = secret
    ? await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret)
    : null;
  const { pathname, search } = req.nextUrl;

  if (pathname === '/login') {
    return NextResponse.next();
  }

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    const res = NextResponse.redirect(url);
    // Drop a stale or forged cookie so the browser doesn't keep sending it.
    if (req.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (pathname.startsWith('/admin') && session.role !== 'teacher') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.(?:svg|ico)|robots\\.txt).*)'],
};
