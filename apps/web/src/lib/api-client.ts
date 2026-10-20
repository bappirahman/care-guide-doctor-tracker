import type { ApiErrorBody, ErrorCode } from '@doctor-tracker/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | string[] | undefined>;
};

// Every request goes to this origin; the Next.js rewrite forwards /api/* to Express.
const API_BASE = '/api/v1';

// These answer 401 on purpose (wrong password, dead session); refreshing would be wrong.
const NO_REFRESH = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

function buildUrl(path: string, query: RequestOptions['query']) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === '') continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }
  const search = params.toString();
  return `${API_BASE}${path}${search ? `?${search}` : ''}`;
}

function send(path: string, { body, query, headers, ...init }: RequestOptions) {
  return fetch(buildUrl(path, query), {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/**
 * Several queries can hit an expired access token at the same moment. They all
 * await one refresh instead of each spending (and rotating) the refresh token.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession() {
  refreshInFlight ??= fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'same-origin',
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  // A full navigation on purpose: it drops every cached query from the dead session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?next=${encodeURIComponent(next)}&error=session_expired`);
}

async function toApiError(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(
    response.status,
    body?.error.code ?? 'INTERNAL_ERROR',
    body?.error.message ?? 'Something went wrong. Try again.',
    body?.error.details,
  );
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  // One silent refresh and retry before the user is sent to /login.
  if (response.status === 401 && !NO_REFRESH.has(path)) {
    if (await refreshSession()) {
      response = await send(path, options);
    } else {
      redirectToLogin();
    }
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
