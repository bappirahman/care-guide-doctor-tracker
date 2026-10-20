import type { PaginationMeta } from '@doctor-tracker/shared';
import type { SortOrder } from 'mongoose';

/**
 * Case-insensitive ordering for "Name A–Z". The `{ name: 1 }` indexes are built
 * with this collation and name-sorted queries must pass the exact same one,
 * otherwise MongoDB cannot use the index for the sort.
 */
export const NAME_COLLATION = { locale: 'en', strength: 2 } as const;

type SortSpec = {
  sort: Record<string, SortOrder>;
  collation?: typeof NAME_COLLATION;
};

/**
 * Turns `name` / `-createdAt` into a Mongo sort. Every order ends in `_id`, so equal
 * dates or names can't shuffle rows between pages; the indexes end in `_id` as well,
 * and a descending sort walks the same index backwards.
 */
export function sortSpec(value: string): SortSpec {
  const descending = value.startsWith('-');
  const field = descending ? value.slice(1) : value;
  const direction: SortOrder = descending ? -1 : 1;
  return {
    sort: { [field]: direction, _id: direction },
    ...(field === 'name' ? { collation: NAME_COLLATION } : {}),
  };
}

export function dateRangeFilter(field: string, from?: Date, to?: Date) {
  if (!from && !to) return {};
  return {
    [field]: {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    },
  };
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export const skipFor = (page: number, limit: number) => (page - 1) * limit;
