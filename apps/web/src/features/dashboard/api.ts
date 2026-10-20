import type { DashboardStats, ItemResponse } from '@doctor-tracker/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { dayRangeToInstants } from '@/lib/dates';
import type { DashboardParams } from './search-params';

export const statsKeys = {
  all: ['stats'] as const,
  overview: (params: DashboardParams) => [...statsKeys.all, 'overview', params] as const,
};

export function useDashboardStats(params: DashboardParams) {
  return useQuery({
    queryKey: statsKeys.overview(params),
    queryFn: () =>
      apiFetch<ItemResponse<DashboardStats>>('/stats/overview', {
        query: {
          ...dayRangeToInstants(params.from, params.to),
          ...(params.interval ? { interval: params.interval } : {}),
        },
      }).then((response) => response.data),
    // A new range keeps the current charts on screen (dimmed) instead of flashing skeletons.
    placeholderData: keepPreviousData,
  });
}
