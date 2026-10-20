import type {
  Doctor,
  DoctorDetail,
  DoctorFilters,
  DoctorInput,
  DoctorUpdate,
  ItemResponse,
  ListResponse,
} from '@doctor-tracker/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { statsKeys } from '@/features/dashboard/api';
import { apiFetch } from '@/lib/api-client';
import { dayRangeToInstants } from '@/lib/dates';
import type { DoctorListParams } from './search-params';

export const doctorKeys = {
  all: ['doctors'] as const,
  list: (params: DoctorListParams) => [...doctorKeys.all, 'list', params] as const,
  detail: (id: string) => [...doctorKeys.all, 'detail', id] as const,
  filters: () => [...doctorKeys.all, 'filters'] as const,
};

export function useDoctors(params: DoctorListParams) {
  return useQuery({
    queryKey: doctorKeys.list(params),
    queryFn: () =>
      apiFetch<ListResponse<Doctor>>('/doctors', {
        query: { ...params, ...dayRangeToInstants(params.from, params.to) },
      }),
    // Keeps the current page on screen while the next one loads, instead of a skeleton flash.
    placeholderData: keepPreviousData,
  });
}

export function useDoctorFilters() {
  return useQuery({
    queryKey: doctorKeys.filters(),
    queryFn: () =>
      apiFetch<ItemResponse<DoctorFilters>>('/doctors/filters').then((response) => response.data),
    staleTime: 5 * 60_000,
  });
}

export function useDoctor(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    queryKey: doctorKeys.detail(id),
    queryFn: () =>
      apiFetch<ItemResponse<DoctorDetail>>(`/doctors/${id}`).then((response) => response.data),
  });
}

// Any write can change list membership, counts, filter options and the dashboard's
// doctor totals, so those queries are invalidated rather than patched by hand.
function useInvalidateDoctors() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: doctorKeys.all }),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }),
    ]);
}

export function useCreateDoctor() {
  const invalidate = useInvalidateDoctors();
  return useMutation({
    mutationFn: (input: DoctorInput) =>
      apiFetch<ItemResponse<Doctor>>('/doctors', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateDoctor(id: string) {
  const invalidate = useInvalidateDoctors();
  return useMutation({
    mutationFn: (input: DoctorUpdate) =>
      apiFetch<ItemResponse<Doctor>>(`/doctors/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/doctors/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: doctorKeys.detail(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: doctorKeys.all }),
        queryClient.invalidateQueries({ queryKey: statsKeys.all }),
      ]);
    },
  });
}
