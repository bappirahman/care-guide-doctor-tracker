import { format } from 'date-fns';

const numberFormat = new Intl.NumberFormat('en-US');

export const formatNumber = (value: number) => numberFormat.format(value);

// "14 Sep 2025": day-first like the clinic's paperwork, no locale-specific "Sept".
export const formatDate = (value: string | Date) => format(new Date(value), 'd MMM yyyy');

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${formatNumber(count)} ${count === 1 ? singular : plural}`;
