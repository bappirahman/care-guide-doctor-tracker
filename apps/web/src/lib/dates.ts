import { endOfDay, format, isValid, parse, startOfDay } from 'date-fns';

// Date filters live in the URL as calendar days (2026-03-14), which read well and
// mean the same day for everyone sharing the link.
const DAY_FORMAT = 'yyyy-MM-dd';

export function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parse(value, DAY_FORMAT, new Date());
  return isValid(date) ? date : null;
}

export const formatDay = (date: Date) => format(date, DAY_FORMAT);

/**
 * The API filters on instants, so a day range becomes [local 00:00, local 23:59:59.999]:
 * "to 14 March" has to include admissions on the afternoon of the 14th.
 */
export function dayRangeToInstants(from: string | null, to: string | null) {
  const start = from ? parseDay(from) : null;
  const end = to ? parseDay(to) : null;
  return {
    from: start ? startOfDay(start).toISOString() : undefined,
    to: end ? endOfDay(end).toISOString() : undefined,
  };
}
