import { randomBytes, randomUUID } from 'node:crypto';
import type { User, UserRole } from '@doctor-tracker/shared';
import argon2 from 'argon2';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/http-error.js';
import { logger } from '../../lib/logger.js';
import { UserModel } from '../users/model.js';
import { SessionModel } from './model.js';
import type { GoogleProfile } from './oauth.js';
import { generateRefreshToken, hashToken, signAccessToken } from './tokens.js';

/**
 * A rotated token presented again within this window is treated as a race (two tabs,
 * or the proxy and the client refreshing at once), not theft: the request fails, but
 * the session survives and the loser retries with the cookie the winner already set.
 */
const ROTATION_GRACE_MS = 30_000;

type SessionTokens = { accessToken: string; refreshToken: string };
type AuthResult = { user: User; tokens: SessionTokens };
type UserLike = { id: string; name: string; email: string; role: UserRole };

export const toUser = ({ id, name, email, role }: UserLike): User => ({ id, name, email, role });

// Verifying against a throwaway hash when the email is unknown keeps response times
// the same for "no such user" and "wrong password", so emails can't be enumerated.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= argon2.hash(randomBytes(16).toString('hex')));

export async function loginWithPassword(
  email: string,
  password: string,
  userAgent: string,
): Promise<AuthResult> {
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  const passwordMatches = await argon2.verify(
    user?.passwordHash ?? (await getDummyHash()),
    password,
  );

  if (!user?.passwordHash || !passwordMatches) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Email or password is incorrect');
  }
  return { user: toUser(user), tokens: await issueSession(user, userAgent) };
}

type SessionChain = { sessionId?: string; tokenId?: mongoose.Types.ObjectId };

async function issueSession(
  user: UserLike,
  userAgent: string,
  { sessionId = randomUUID(), tokenId = new mongoose.Types.ObjectId() }: SessionChain = {},
): Promise<SessionTokens> {
  const refreshToken = generateRefreshToken();
  await SessionModel.create({
    _id: tokenId,
    userId: user.id,
    sessionId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000),
    userAgent,
  });
  const accessToken = await signAccessToken({ sub: user.id, role: user.role, sid: sessionId });
  return { accessToken, refreshToken };
}

export type RotationResult =
  ({ ok: true } & AuthResult) | { ok: false; reason: 'missing' | 'invalid' | 'race' | 'reuse' };

/**
 * Exchanges a refresh token for a new pair. The old token is claimed with a single
 * conditional update, so two concurrent requests can never both rotate it. The
 * successor's id is written in that same update: a concurrent reader therefore always
 * sees `replacedBy` alongside `revokedAt` and can tell a race from a replay.
 */
export async function rotateSession(
  refreshToken: string | undefined,
  userAgent: string,
): Promise<RotationResult> {
  if (!refreshToken) return { ok: false, reason: 'missing' };

  const tokenHash = hashToken(refreshToken);
  const now = new Date();
  const successorId = new mongoose.Types.ObjectId();

  const claimed = await SessionModel.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, replacedBy: successorId } },
  );

  if (!claimed) {
    const previous = await SessionModel.findOne({ tokenHash });
    if (!previous?.revokedAt) return { ok: false, reason: 'invalid' };

    const rotatedRecently =
      previous.replacedBy !== null &&
      now.getTime() - previous.revokedAt.getTime() < ROTATION_GRACE_MS;
    if (rotatedRecently) return { ok: false, reason: 'race' };

    // An old token came back: someone else may hold the chain. End the whole session.
    await revokeSessionFamily(previous.sessionId, now);
    logger.warn(
      { sessionId: previous.sessionId, userId: String(previous.userId) },
      'Refresh token reuse detected; session revoked',
    );
    return { ok: false, reason: 'reuse' };
  }

  const user = await UserModel.findById(claimed.userId);
  if (!user) {
    await revokeSessionFamily(claimed.sessionId, now);
    return { ok: false, reason: 'invalid' };
  }

  const tokens = await issueSession(user, userAgent, {
    sessionId: claimed.sessionId,
    tokenId: successorId,
  });
  return { ok: true, user: toUser(user), tokens };
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  const session = await SessionModel.findOne({ tokenHash: hashToken(refreshToken) });
  if (session) await revokeSessionFamily(session.sessionId, new Date());
}

async function revokeSessionFamily(sessionId: string, at: Date) {
  await SessionModel.updateMany({ sessionId, revokedAt: null }, { $set: { revokedAt: at } });
}

/**
 * Google never creates access on its own. Order: an account already linked to this
 * Google id; else an existing user with the same verified email (linked now, so no
 * duplicate account); else an address on the ADMIN_EMAILS allowlist. Anyone else is
 * refused, even with a valid Google account.
 */
export async function signInWithGoogle(
  profile: GoogleProfile,
  userAgent: string,
): Promise<AuthResult | null> {
  if (!profile.emailVerified) return null;

  let user = await UserModel.findOne({ googleId: profile.googleId });

  if (!user) {
    user = await UserModel.findOne({ email: profile.email });
    if (user) {
      if (user.googleId && user.googleId !== profile.googleId) return null;
      user.googleId = profile.googleId;
      await user.save();
    } else if (env.ADMIN_EMAILS.includes(profile.email)) {
      user = await UserModel.create({
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        role: 'admin',
      });
    } else {
      return null;
    }
  }

  return { user: toUser(user), tokens: await issueSession(user, userAgent) };
}

export async function getUserById(id: string) {
  const user = await UserModel.findById(id);
  return user ? toUser(user) : null;
}
