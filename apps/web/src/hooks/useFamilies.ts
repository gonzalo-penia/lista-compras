import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Family } from '@familycart/types';

export function useFamilies() {
  return useQuery<Family[]>({
    queryKey: ['families'],
    queryFn: () => api.get<Family[]>('/families'),
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Family>('/families', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }),
  });
}

export function useJoinFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => api.post<Family>('/families/join', { inviteCode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }),
  });
}
