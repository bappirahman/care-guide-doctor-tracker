import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_VERIFIER_COOKIE = 'oauth_code_verifier';

// The refresh token is only sent to auth routes, never with ordinary API calls.
const REFRESH_PATH = '/api/v1/auth';
const OAUTH_PATH = '/api/v1/auth/google';
const OAUTH_MAX_AGE_MS = 10 * 60 * 1000;

// `lax` (not `strict`) so the cookies survive the top-level redirect back from Google.
const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
};

export function setSessionCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions,
    path: '/',
    // Matches the JWT lifetime, so the web proxy can treat "cookie present" as "probably valid".
    maxAge: env.JWT_ACCESS_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions,
    path: REFRESH_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions, path: REFRESH_PATH });
}

export function setOAuthCookies(res: Response, { state, codeVerifier }: OAuthCookies) {
  const options = { ...baseOptions, path: OAUTH_PATH, maxAge: OAUTH_MAX_AGE_MS };
  res.cookie(OAUTH_STATE_COOKIE, state, options);
  res.cookie(OAUTH_VERIFIER_COOKIE, codeVerifier, options);
}

export function takeOAuthCookies(
  req: Request,
  res: Response,
): { [K in keyof OAuthCookies]: string | undefined } {
  res.clearCookie(OAUTH_STATE_COOKIE, { ...baseOptions, path: OAUTH_PATH });
  res.clearCookie(OAUTH_VERIFIER_COOKIE, { ...baseOptions, path: OAUTH_PATH });
  return {
    state: readCookie(req, OAUTH_STATE_COOKIE),
    codeVerifier: readCookie(req, OAUTH_VERIFIER_COOKIE),
  };
}

export function readCookie(req: Request, name: string): string | undefined {
  const value: unknown = (req.cookies as Record<string, unknown> | undefined)?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

type OAuthCookies = { state: string; codeVerifier: string };
