import { createHash, randomBytes } from 'node:crypto';
import { USER_ROLES } from '@doctor-tracker/shared';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { env } from '../../config/env.js';

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = 'doctor-tracker-api';
const AUDIENCE = 'doctor-tracker-web';

const accessClaimsSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(USER_ROLES),
  sid: z.string().min(1),
});
export type AccessClaims = z.infer<typeof accessClaimsSchema>;

/**
 * Short-lived and stateless: verifying it needs no database lookup. The cost is that
 * a revoked session's access token keeps working until it expires (15 minutes by default).
 */
export async function signAccessToken({ sub, role, sid }: AccessClaims) {
  return new SignJWT({ role, sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    const claims = accessClaimsSchema.safeParse(payload);
    return claims.success ? claims.data : null;
  } catch {
    return null;
  }
}

// Opaque, 256 bits of entropy. Only its hash is stored.
export function generateRefreshToken() {
  return randomBytes(32).toString('base64url');
}

/**
 * SHA-256 rather than argon2: the input is already a high-entropy random value, so
 * a slow hash adds no protection, only latency on every refresh.
 */
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
