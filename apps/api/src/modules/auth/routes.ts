import { loginSchema } from '@doctor-tracker/shared';
import { Router } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import { HttpError } from '../../lib/http-error.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './controller.js';
import { requireAuth } from './middleware.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// In-memory counters: fine for one API instance; several instances would need a shared store.
const limiterDefaults: Partial<Options> = {
  windowMs: FIFTEEN_MINUTES,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Try again in a few minutes.'));
  },
};

/**
 * Keyed on IP and email, and only failed attempts count. The email part stops one
 * noisy client from locking out everyone behind the same IP (locally, every request
 * arrives from the Next.js server).
 */
const loginLimiter = rateLimit({
  ...limiterDefaults,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const body = req.body as { email?: unknown } | undefined;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
  },
});

const refreshLimiter = rateLimit({ ...limiterDefaults, limit: 100 });

export const authRouter = Router();

authRouter.get('/providers', controller.providers);
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), controller.login);
authRouter.post('/refresh', refreshLimiter, controller.refresh);
authRouter.get('/resume', refreshLimiter, controller.resume);
authRouter.post('/logout', controller.logout);
authRouter.get('/google', controller.googleStart);
authRouter.get('/google/callback', controller.googleCallback);
authRouter.get('/me', requireAuth, controller.me);
