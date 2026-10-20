import { z } from 'zod';
import type { UserRole } from '../constants.js';
import { emailSchema } from './common.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string('Enter your password').min(1, 'Enter your password').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthProviders = { google: boolean };

// Reasons the web app shows on /login after a failed redirect-based flow.
export const LOGIN_ERRORS = ['not_authorized', 'oauth_failed', 'session_expired'] as const;
export type LoginError = (typeof LOGIN_ERRORS)[number];
