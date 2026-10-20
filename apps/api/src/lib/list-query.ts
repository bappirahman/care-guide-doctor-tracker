/**
 * Case-insensitive ordering for "Name A–Z". The `{ name: 1 }` indexes are built
 * with this collation and name-sorted queries must pass the exact same one,
 * otherwise MongoDB cannot use the index for the sort.
 */
export const NAME_COLLATION = { locale: 'en', strength: 2 } as const;
