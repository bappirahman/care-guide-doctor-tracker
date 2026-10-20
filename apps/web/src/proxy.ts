import { type NextRequest, NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/utils';

const ACCESS_COOKIE = 'access_token';
const LOGIN_PATH = '/login';

/**
 * An optimistic guard, not the security boundary: it only checks that an access
 * cookie exists (its maxAge equals the JWT lifetime). Express verifies every request,
 * and this app renders no data on the server, so a forged cookie gets an empty shell.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const hasAccessToken = request.cookies.has(ACCESS_COOKIE);

  if (pathname === LOGIN_PATH) {
    return hasAccessToken
      ? NextResponse.redirect(new URL(safeNextPath(searchParams.get('next')), request.url))
      : NextResponse.next();
  }

  if (hasAccessToken) return NextResponse.next();

  // The access cookie has expired (or never existed). Let the API try the refresh
  // cookie, which is scoped to /api/v1/auth and so invisible here, and bounce back.
  const resume = new URL('/api/v1/auth/resume', request.url);
  resume.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(resume);
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
