import { DEFAULT_PAGE_SIZE } from '@doctor-tracker/shared';
import { createParser, parseAsInteger, parseAsString } from 'nuqs';
import { parseDay } from './dates';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const parseAsDay = createParser({
  parse: (value) => (parseDay(value) ? value : null),
  serialize: (value: string) => value,
});

// Parsers every list view shares; feature parsers spread these in. Defaults are
// left out of the URL (`clearOnDefault`), so a fresh list has a clean address.
export const listParsers = {
  search: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(DEFAULT_PAGE_SIZE),
  from: parseAsDay,
  to: parseAsDay,
};

export const listParamsOptions = { clearOnDefault: true } as const;
