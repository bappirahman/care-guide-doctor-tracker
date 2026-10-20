export { cn } from 'cn';

/**
 * Same-origin paths only, so a `?next=` value can never become an open redirect
 * (`//evil.com` and `/\evil.com` are protocol-relative to browsers).
 */
export function safeNextPath(value: unknown, fallback = '/dashboard') {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\') || value.startsWith('/login')) {
    return fallback;
  }
  return value;
}
