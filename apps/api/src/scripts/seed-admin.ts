import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { UserModel } from '../modules/users/model.js';
import { ensureAdmin } from './admin.js';

/**
 * Creates one admin without touching doctors or patients. Flags override the
 * SEED_ADMIN_* env values, so extra admins can be added without editing .env:
 *
 *   pnpm seed:admin -- --email ops@example.com --name "Ops Admin" --password '...'
 *   pnpm seed:admin -- --reset-password      # set the password of an existing admin
 */

const argsSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

async function main() {
  const args = process.argv.slice(2);
  const { values } = parseArgs({
    // `pnpm --filter api seed:admin -- --email ...` forwards the `--` itself.
    args: args[0] === '--' ? args.slice(1) : args,
    options: {
      name: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string' },
      'reset-password': { type: 'boolean', default: false },
    },
  });

  const parsed = argsSchema.safeParse({
    name: values.name ?? env.SEED_ADMIN_NAME,
    email: values.email ?? env.SEED_ADMIN_EMAIL,
    password: values.password ?? env.SEED_ADMIN_PASSWORD,
  });
  if (!parsed.success) {
    process.stderr.write(`Invalid admin:\n${z.prettifyError(parsed.error)}\n`);
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
  try {
    // The unique email index is what stops two admins racing to the same address.
    await UserModel.syncIndexes();
    await ensureAdmin(parsed.data, { resetPassword: values['reset-password'] });
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Admin seed failed');
  process.exitCode = 1;
});
