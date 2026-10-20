import type { ItemResponse, LoginInput, User } from '@doctor-tracker/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export function useSession() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => apiFetch<ItemResponse<User>>('/auth/me').then((response) => response.data),
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<ItemResponse<User>>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (response) => queryClient.setQueryData(authKeys.me, response.data),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    // A full navigation rather than router.replace + queryClient.clear(): clearing while
    // the page is still mounted makes live queries refetch, hit 401 and race the redirect.
    // Reloading also guarantees nothing from this session stays in memory.
    onSettled: () => {
      window.location.replace('/login');
    },
  });
}
