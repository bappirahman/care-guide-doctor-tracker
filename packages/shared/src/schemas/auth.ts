import { z } from 'zod';
import type { UserRole } from '../constants.js';
import { emailSchema } from './common.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasPassword: boolean;
  hasGoogle: boolean;
};
