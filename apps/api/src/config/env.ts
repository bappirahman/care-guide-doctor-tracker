import { z } from 'zod';

// Compose and .env files pass unset optional values as empty strings.
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const emailList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    WEB_ORIGIN: z.url(),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(604_800),
    COOKIE_SECURE: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.stringbool().optional(),
    ),

    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    GOOGLE_REDIRECT_URI: optionalString.pipe(z.url().optional()),
    ADMIN_EMAILS: emailList,

    SEED_ADMIN_NAME: z.string().min(1).default('Demo Admin'),
    SEED_ADMIN_EMAIL: z.email().default('admin@example.com'),
    SEED_ADMIN_PASSWORD: z.string().min(8).default('DemoAdmin#2026'),
  })
  .transform((env) => ({
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    GOOGLE_REDIRECT_URI: env.GOOGLE_REDIRECT_URI ?? `${env.WEB_ORIGIN}/api/v1/auth/google/callback`,
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // The logger depends on env, so this is the one place that writes to stderr directly.
  process.stderr.write(`Invalid environment:\n${z.prettifyError(parsed.error)}\n`);
  process.exit(1);
}

export const env = parsed.data;
