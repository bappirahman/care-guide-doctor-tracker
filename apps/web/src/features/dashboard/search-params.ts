import { STATS_INTERVALS } from '@doctor-tracker/shared';
import { subDays } from 'date-fns';
import { parseAsStringLiteral, useQueryStates } from 'nuqs';
import { formatDay } from '@/lib/dates';
import { listParamsOptions, listParsers } from '@/lib/search-params';

const dashboardParsers = {
  from: listParsers.from,
  to: listParsers.to,
  // Null lets the API choose: daily up to 90 days, weekly beyond.
  interval: parseAsStringLiteral(STATS_INTERVALS),
};

const DEFAULT_RANGE_DAYS = 90;

/**
 * Without a range in the URL the dashboard shows the last 90 days. The default is
 * computed at read time (so it moves with the calendar) and never written to the URL.
 */
export function useDashboardParams() {
  const [params, setParams] = useQueryStates(dashboardParsers, listParamsOptions);
  const today = new Date();
  return [
    {
      from: params.from ?? (params.to ? null : formatDay(subDays(today, DEFAULT_RANGE_DAYS - 1))),
      to: params.to ?? (params.from ? null : formatDay(today)),
      interval: params.interval,
    },
    setParams,
  ] as const;
}

export type DashboardParams = ReturnType<typeof useDashboardParams>[0];
