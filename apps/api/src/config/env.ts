import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  WEB_ORIGIN: z.url(),
  SEED_ADMIN_NAME: z.string().min(1).default('Demo Admin'),
  SEED_ADMIN_EMAIL: z.email().default('admin@example.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('DemoAdmin#2026'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // The logger depends on env, so this is the one place that writes to stderr directly.
  process.stderr.write(`Invalid environment:\n${z.prettifyError(parsed.error)}\n`);
  process.exit(1);
}

export const env = parsed.data;
