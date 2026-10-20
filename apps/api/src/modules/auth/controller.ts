import type {
  AuthProviders,
  ItemResponse,
  LoginError,
  LoginInput,
  User,
} from '@doctor-tracker/shared';
import type { Request, Response } from 'express';
import { HttpError } from '../../lib/http-error.js';
import {
  clearSessionCookies,
  readCookie,
  REFRESH_COOKIE,
  setOAuthCookies,
  setSessionCookies,
  takeOAuthCookies,
} from './cookies.js';
import { currentAuth } from './middleware.js';
import { createGoogleAuthorization, exchangeGoogleCode, isGoogleConfigured } from './oauth.js';
import * as authService from './service.js';

const userAgentOf = (req: Request) => req.get('user-agent')?.slice(0, 300) ?? '';

function loginPath({ error, next }: { error?: LoginError; next?: string }) {
  const params = new URLSearchParams();
  if (next && next !== '/dashboard') params.set('next', next);
  if (error) params.set('error', error);
  const query = params.toString();
  return query ? `/login?${query}` : '/login';
}

/**
 * Only same-origin paths, so `?next=` can never become an open redirect
 * (`//evil.com` and `/\evil.com` are protocol-relative to browsers).
 */
function safeNextPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/dashboard';
  if (value.startsWith('//') || value.startsWith('/\\') || value.startsWith('/api/')) {
    return '/dashboard';
  }
  return value;
}

export function providers(_req: Request, res: Response<ItemResponse<AuthProviders>>) {
  res.json({ data: { google: isGoogleConfigured() } });
}

export async function login(
  req: Request<Record<string, string>, unknown, LoginInput>,
  res: Response<ItemResponse<User>>,
) {
  const { user, tokens } = await authService.loginWithPassword(
    req.body.email,
    req.body.password,
    userAgentOf(req),
  );
  setSessionCookies(res, tokens);
  res.json({ data: user });
}

export async function refresh(req: Request, res: Response<ItemResponse<User>>) {
  const result = await authService.rotateSession(readCookie(req, REFRESH_COOKIE), userAgentOf(req));

  if (!result.ok) {
    // A lost race keeps its cookies: the winning request already replaced them.
    if (result.reason !== 'race') clearSessionCookies(res);
    throw new HttpError(401, 'UNAUTHENTICATED', 'Your session has ended. Sign in again.');
  }
  setSessionCookies(res, result.tokens);
  res.json({ data: result.user });
}

/**
 * Navigation-time refresh used by the web proxy when the access cookie has expired:
 * rotate and bounce straight back, so the page never renders logged-out first.
 */
export async function resume(req: Request, res: Response) {
  const next = safeNextPath(req.query.next);
  const result = await authService.rotateSession(readCookie(req, REFRESH_COOKIE), userAgentOf(req));

  if (result.ok) {
    setSessionCookies(res, result.tokens);
    res.redirect(303, next);
    return;
  }

  // On a lost race the winner's cookies are already set; /login bounces to `next` when
  // it sees them. Redirecting straight to `next` instead could loop back here.
  if (result.reason !== 'race') clearSessionCookies(res);
  const expired = result.reason === 'invalid' || result.reason === 'reuse';
  res.redirect(303, loginPath({ next, ...(expired ? { error: 'session_expired' } : {}) }));
}

export async function logout(req: Request, res: Response) {
  await authService.logout(readCookie(req, REFRESH_COOKIE));
  clearSessionCookies(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response<ItemResponse<User>>) {
  const user = await authService.getUserById(currentAuth(req).sub);
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  res.json({ data: user });
}

export function googleStart(_req: Request, res: Response) {
  const authorization = createGoogleAuthorization();
  if (!authorization) throw new HttpError(404, 'NOT_FOUND', 'Google sign-in is not configured');
  setOAuthCookies(res, authorization);
  res.redirect(302, authorization.url.toString());
}

export async function googleCallback(req: Request, res: Response) {
  const stored = takeOAuthCookies(req, res);
  const { code, state } = req.query;

  // `state` must round-trip through our own cookie, or this callback wasn't started by us (CSRF).
  if (
    typeof code !== 'string' ||
    typeof state !== 'string' ||
    !stored.state ||
    !stored.codeVerifier ||
    state !== stored.state
  ) {
    res.redirect(303, loginPath({ error: 'oauth_failed' }));
    return;
  }

  let profile;
  try {
    profile = await exchangeGoogleCode(code, stored.codeVerifier);
  } catch (err) {
    req.log.warn({ err }, 'Google code exchange failed');
    res.redirect(303, loginPath({ error: 'oauth_failed' }));
    return;
  }

  const result = await authService.signInWithGoogle(profile, userAgentOf(req));
  if (!result) {
    req.log.info({ email: profile.email }, 'Google sign-in refused: not on the allowlist');
    res.redirect(303, loginPath({ error: 'not_authorized' }));
    return;
  }

  setSessionCookies(res, result.tokens);
  res.redirect(303, '/dashboard');
}
