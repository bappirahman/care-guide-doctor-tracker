import type { Schema } from 'mongoose';

const MAX_SEARCH_TERMS = 5;
const PHONE_LIKE = /^\+?[\d\s-]+$/;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const digitsOf = (value: string) => value.replace(/\D/g, '');

/**
 * Lowercased words from text fields plus phone digits. Bangladeshi numbers are
 * also stored without the 880 country code, because people search "01711…".
 */
export function buildSearchTokens(text: string[], phones: string[]): string[] {
  const tokens = new Set<string>();

  for (const value of text) {
    const lower = value.toLowerCase().trim();
    if (!lower) continue;
    if (lower.includes('@')) tokens.add(lower);
    for (const word of lower.split(/[^\p{L}\p{N}]+/u)) {
      if (word) tokens.add(word);
    }
  }

  for (const phone of phones) {
    const digits = digitsOf(phone);
    if (!digits) continue;
    tokens.add(digits);
    if (digits.startsWith('880')) tokens.add(digits.slice(2));
  }

  return [...tokens];
}

/**
 * Every term must prefix-match some token. Anchored, case-sensitive regexes on
 * already-lowercased tokens give the `{ searchTokens: 1 }` index tight bounds,
 * which a case-insensitive regex or a `$text` index cannot do for prefixes.
 */
export function searchFilter(term: string | undefined) {
  const trimmed = term?.trim();
  if (!trimmed) return {};

  const lower = trimmed.toLowerCase();
  const terms = PHONE_LIKE.test(trimmed)
    ? [digitsOf(trimmed)]
    : lower.includes('@')
      ? [lower]
      : lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  const regexes = terms
    .slice(0, MAX_SEARCH_TERMS)
    .map((value) => new RegExp(`^${escapeRegex(value)}`));

  return regexes.length > 0 ? { searchTokens: { $all: regexes } } : {};
}

type SearchTokensOptions = { text: string[]; phones: string[] };

/**
 * Keeps `searchTokens` in sync on every validate, which covers `save()` and
 * `insertMany()`. Services update through `doc.set()` + `save()` so the hook runs;
 * `updateOne`/`findOneAndUpdate` would bypass it.
 */
export function searchTokensPlugin(schema: Schema, options: SearchTokensOptions) {
  schema.add({ searchTokens: { type: [String], select: false } });
  schema.index({ searchTokens: 1 });

  schema.pre('validate', function () {
    const read = (path: string) => {
      const value: unknown = this.get(path);
      return typeof value === 'string' ? value : '';
    };
    this.set('searchTokens', buildSearchTokens(options.text.map(read), options.phones.map(read)));
  });
}
