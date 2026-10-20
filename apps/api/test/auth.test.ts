import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as OAuth from '../src/modules/auth/oauth.js';
import { SessionModel } from '../src/modules/auth/model.js';
import { UserModel } from '../src/modules/users/model.js';
import { ADMIN, app, cookieValue, createAdmin, signedInAgent, useTestDatabase } from './helpers.js';

// The only thing mocked is the network call to Google; state, PKCE cookies and the
// allowlist/linking rules all run for real.
const exchangeGoogleCode = vi.hoisted(() => vi.fn());
vi.mock('../src/modules/auth/oauth.js', async (importOriginal) => ({
  ...(await importOriginal<typeof OAuth>()),
  exchangeGoogleCode,
}));

useTestDatabase();

afterEach(() => {
  vi.useRealTimers();
  exchangeGoogleCode.mockReset();
});

const login = (email: string, password: string) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

const refresh = (refreshToken: string) =>
  request(app).post('/api/v1/auth/refresh').set('Cookie', `refresh_token=${refreshToken}`);

describe('password login', () => {
  it('sets httpOnly access and refresh cookies and returns the user', async () => {
    await createAdmin();
    const response = await login(ADMIN.email.toUpperCase(), ADMIN.password).expect(200);

    expect(response.body.data).toMatchObject({ email: ADMIN.email, role: 'admin' });
    expect(response.body.data).not.toHaveProperty('passwordHash');

    const cookies = [response.headers['set-cookie'] ?? []].flat();
    const access = cookies.find((cookie) => cookie.startsWith('access_token='));
    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refresh_token='));
    expect(access).toMatch(/HttpOnly/);
    expect(access).toMatch(/SameSite=Lax/);
    expect(access).toMatch(/Path=\//);
    // Scoped to the auth routes so it never rides along on ordinary API calls.
    expect(refreshCookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(refreshCookie).toMatch(/HttpOnly/);
  });

  it('answers a wrong password and an unknown email identically', async () => {
    await createAdmin();
    const wrongPassword = await login(ADMIN.email, 'not-the-password').expect(401);
    const unknownEmail = await login('nobody@example.com', 'not-the-password').expect(401);

    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('UNAUTHENTICATED');
    expect(wrongPassword.headers['set-cookie']).toBeUndefined();
  });

  it('rejects a malformed body with field-level details', async () => {
    const response = await login('not-an-email', '').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.map((issue: { path: string }) => issue.path)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });
});

describe('protected routes', () => {
  it('rejects a request without an access token', async () => {
    const response = await request(app).get('/api/v1/doctors').expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a tampered access token', async () => {
    const response = await request(app)
      .get('/api/v1/doctors')
      .set('Cookie', 'access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.forged')
      .expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('accepts a signed-in session', async () => {
    const agent = await signedInAgent();
    await agent.get('/api/v1/doctors').expect(200);
    await agent.get('/api/v1/auth/me').expect(200);
  });

  it('returns 401 rather than 404 for unknown paths when signed out', async () => {
    await request(app).get('/api/v1/does-not-exist').expect(401);
  });
});

describe('refresh token rotation', () => {
  it('issues a new pair and rejects the old refresh token', async () => {
    await createAdmin();
    const first = await login(ADMIN.email, ADMIN.password);
    const original = cookieValue(first.headers['set-cookie'], 'refresh_token')!;

    const rotated = await refresh(original).expect(200);
    const next = cookieValue(rotated.headers['set-cookie'], 'refresh_token')!;
    expect(next).toBeDefined();
    expect(next).not.toBe(original);

    // Replayed moments later (two tabs racing): refused, but the session survives.
    await refresh(original).expect(401);
    await refresh(next).expect(200);
  });

  it('revokes the whole session when an old token is reused after the grace window', async () => {
    await createAdmin();
    const first = await login(ADMIN.email, ADMIN.password);
    const original = cookieValue(first.headers['set-cookie'], 'refresh_token')!;
    const rotated = await refresh(original).expect(200);
    const current = cookieValue(rotated.headers['set-cookie'], 'refresh_token')!;

    // Only Date is faked: Mongo's driver keeps its real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 31_000);

    await refresh(original).expect(401);
    // The legitimate holder's newest token is dead too: the family was revoked.
    await refresh(current).expect(401);

    const live = await SessionModel.countDocuments({ revokedAt: null });
    expect(live).toBe(0);
  });

  it('clears both cookies when a refresh fails', async () => {
    const response = await refresh('not-a-real-token').expect(401);
    const cookies = [response.headers['set-cookie'] ?? []].flat().join('\n');
    expect(cookies).toMatch(/access_token=;/);
    expect(cookies).toMatch(/refresh_token=;/);
  });
});

describe('logout', () => {
  it('revokes the session so its refresh token stops working', async () => {
    await createAdmin();
    const first = await login(ADMIN.email, ADMIN.password);
    const token = cookieValue(first.headers['set-cookie'], 'refresh_token')!;

    await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `refresh_token=${token}`)
      .expect(204);

    await refresh(token).expect(401);
  });
});

describe('google sign-in', () => {
  /** Starts the flow like a browser would, returning the cookies and the state Google echoes back. */
  async function startGoogleFlow() {
    const response = await request(app).get('/api/v1/auth/google').expect(302);
    const location = new URL(response.headers.location!);
    expect(location.hostname).toBe('accounts.google.com');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    const cookies = [response.headers['set-cookie'] ?? []]
      .flat()
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
    return { cookies, state: location.searchParams.get('state')! };
  }

  const callback = (cookies: string, state: string) =>
    request(app)
      .get(`/api/v1/auth/google/callback?code=test-code&state=${state}`)
      .set('Cookie', cookies);

  it('refuses a verified Google account that is neither a user nor allowlisted', async () => {
    exchangeGoogleCode.mockResolvedValue({
      googleId: 'google-stranger',
      email: 'stranger@gmail.com',
      emailVerified: true,
      name: 'Stranger',
    });
    const { cookies, state } = await startGoogleFlow();

    const response = await callback(cookies, state).expect(303);

    expect(response.headers.location).toBe('/login?error=not_authorized');
    expect([response.headers['set-cookie'] ?? []].flat().join('\n')).not.toMatch(
      /access_token=[^;]/,
    );
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('links Google to an existing password admin instead of creating a duplicate', async () => {
    const admin = await createAdmin();
    exchangeGoogleCode.mockResolvedValue({
      googleId: 'google-admin',
      email: ADMIN.email,
      emailVerified: true,
      name: ADMIN.name,
    });
    const { cookies, state } = await startGoogleFlow();

    const response = await callback(cookies, state).expect(303);

    expect(response.headers.location).toBe('/dashboard');
    expect(cookieValue(response.headers['set-cookie'], 'access_token')).toBeTruthy();
    expect(await UserModel.countDocuments()).toBe(1);
    expect((await UserModel.findById(admin._id))?.googleId).toBe('google-admin');
  });

  it('creates an admin for an allowlisted email', async () => {
    exchangeGoogleCode.mockResolvedValue({
      googleId: 'google-allowed',
      email: 'allowed.admin@example.com',
      emailVerified: true,
      name: 'Allowed Admin',
    });
    const { cookies, state } = await startGoogleFlow();

    await callback(cookies, state).expect(303);

    expect(await UserModel.findOne({ email: 'allowed.admin@example.com' })).toMatchObject({
      googleId: 'google-allowed',
      role: 'admin',
    });
  });

  it('refuses an unverified Google email even if it matches an admin', async () => {
    await createAdmin();
    exchangeGoogleCode.mockResolvedValue({
      googleId: 'google-impostor',
      email: ADMIN.email,
      emailVerified: false,
      name: 'Impostor',
    });
    const { cookies, state } = await startGoogleFlow();

    const response = await callback(cookies, state).expect(303);

    expect(response.headers.location).toBe('/login?error=not_authorized');
    expect((await UserModel.findOne({ email: ADMIN.email }))?.googleId).toBeUndefined();
  });

  it('rejects a callback whose state does not match the cookie (CSRF)', async () => {
    const { cookies } = await startGoogleFlow();

    const response = await callback(cookies, 'forged-state').expect(303);

    expect(response.headers.location).toBe('/login?error=oauth_failed');
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
  });
});
