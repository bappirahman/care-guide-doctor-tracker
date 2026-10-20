import { decodeIdToken, generateCodeVerifier, generateState, Google } from 'arctic';
import { z } from 'zod';
import { env } from '../../config/env.js';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

// Without credentials the app still runs; the login page just hides the Google button.
const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI)
    : null;

export const isGoogleConfigured = () => google !== null;

export function createGoogleAuthorization() {
  if (!google) return null;
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']);
  url.searchParams.set('prompt', 'select_account');
  return { url, state, codeVerifier };
}

const idTokenClaimsSchema = z.object({
  iss: z.string(),
  aud: z.string(),
  exp: z.number(),
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().optional(),
});

export type GoogleProfile = {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

/**
 * Exchanges the authorization code (with the PKCE verifier) for tokens. The ID token
 * comes straight from Google's token endpoint over TLS, so OIDC allows trusting its
 * claims without verifying the signature; issuer, audience and expiry are still checked.
 */
export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
): Promise<GoogleProfile> {
  if (!google || !env.GOOGLE_CLIENT_ID) throw new Error('Google sign-in is not configured');

  const tokens = await google.validateAuthorizationCode(code, codeVerifier);
  const claims = idTokenClaimsSchema.parse(decodeIdToken(tokens.idToken()));

  if (!GOOGLE_ISSUERS.includes(claims.iss)) {
    throw new Error('Unexpected ID token issuer');
  }
  if (claims.aud !== env.GOOGLE_CLIENT_ID) {
    throw new Error('ID token was issued for another client');
  }
  if (claims.exp * 1000 < Date.now()) {
    throw new Error('ID token has expired');
  }

  return {
    googleId: claims.sub,
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified,
    name: claims.name ?? claims.email,
  };
}
