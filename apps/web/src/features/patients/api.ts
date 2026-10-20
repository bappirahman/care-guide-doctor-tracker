import type {
  ItemResponse,
  ListResponse,
  Patient,
  PatientInputParsed,
  PatientUpdate,
} from '@doctor-tracker/shared';
import {
  keepPreviousData,
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { statsKeys } from '@/features/dashboard/api';
import { doctorKeys } from '@/features/doctors/api';
import { apiFetch } from '@/lib/api-client';
import { dayRangeToInstants } from '@/lib/dates';
import type { PatientListParams } from './search-params';

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: PatientListParams) => [...patientKeys.lists(), params] as const,
};

export function usePatients(params: PatientListParams) {
  const { doctor, from, to, ...rest } = params;
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () =>
      apiFetch<ListResponse<Patient>>('/patients', {
        query: {
          ...rest,
          ...(doctor ? { doctorId: doctor } : {}),
          ...dayRangeToInstants(from, to),
        },
      }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Patient writes also change doctor patient counts, condition breakdowns and every
 * dashboard number, so all three families are invalidated.
 */
function useInvalidateAfterPatientWrite() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: patientKeys.all }),
      queryClient.invalidateQueries({ queryKey: doctorKeys.all }),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }),
    ]);
}

export function useCreatePatient() {
  const invalidate = useInvalidateAfterPatientWrite();
  return useMutation({
    mutationFn: (input: PatientInputParsed) =>
      apiFetch<ItemResponse<Patient>>('/patients', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdatePatient() {
  const invalidate = useInvalidateAfterPatientWrite();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PatientUpdate }) =>
      apiFetch<ItemResponse<Patient>>(`/patients/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

type ListSnapshot = [QueryKey, ListResponse<Patient> | undefined][];

/**
 * Optimistic: the row leaves every cached list immediately and the totals drop by
 * one. If the server refuses, the snapshot is restored.
 */
export function useDeletePatient() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAfterPatientWrite();

  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/patients/${id}`, { method: 'DELETE' }),
    onMutate: async (id): Promise<{ snapshot: ListSnapshot }> => {
      await queryClient.cancelQueries({ queryKey: patientKeys.lists() });
      const snapshot = queryClient.getQueriesData<ListResponse<Patient>>({
        queryKey: patientKeys.lists(),
      });
      queryClient.setQueriesData<ListResponse<Patient>>(
        { queryKey: patientKeys.lists() },
        (list) =>
          list && list.data.some((patient) => patient.id === id)
            ? {
                data: list.data.filter((patient) => patient.id !== id),
                meta: { ...list.meta, total: list.meta.total - 1 },
              }
            : list,
      );
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: invalidate,
  });
}
