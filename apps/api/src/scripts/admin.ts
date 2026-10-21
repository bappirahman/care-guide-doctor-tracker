import argon2 from 'argon2';
import { logger } from '../lib/logger.js';
import { UserModel } from '../modules/users/model.js';

export type AdminInput = { name: string; email: string; password: string };

/**
 * Creates the admin if the email is free. With `resetPassword`, an existing user
 * gets the new password and the admin role instead of being left alone.
 */
export async function ensureAdmin(input: AdminInput, { resetPassword = false } = {}) {
  const email = input.email.toLowerCase();
  const exists = await UserModel.exists({ email });

  if (exists && !resetPassword) {
    logger.info({ email }, 'Admin user already exists');
    return;
  }

  const passwordHash = await argon2.hash(input.password);
  if (exists) {
    await UserModel.updateOne({ email }, { passwordHash, role: 'admin' });
    logger.info({ email }, 'Reset admin password');
    return;
  }

  await UserModel.create({ name: input.name, email, passwordHash, role: 'admin' });
  logger.info({ email }, 'Created admin user');
}
