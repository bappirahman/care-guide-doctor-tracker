import type { UserRole } from '@doctor-tracker/shared';
import type { Request, RequestHandler } from 'express';
import { HttpError } from '../../lib/http-error.js';
import { ACCESS_COOKIE, readCookie } from './cookies.js';
import { type AccessClaims, verifyAccessToken } from './tokens.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AccessClaims;
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = readCookie(req, ACCESS_COOKIE);
  const claims = token ? await verifyAccessToken(token) : null;
  if (!claims) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  req.auth = claims;
  next();
};

// Only `admin` exists today; new roles slot in here without touching any route.
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this resource');
    }
    next();
  };
}

export function currentAuth(req: Request): AccessClaims {
  if (!req.auth) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  return req.auth;
}
