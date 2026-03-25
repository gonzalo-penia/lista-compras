import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ShoppingList } from '@familycart/types';

export function useFamilyLists(familyId: string) {
  return useQuery<ShoppingList[]>({
    queryKey: ['lists', familyId],
    queryFn: () => api.get<ShoppingList[]>(`/families/${familyId}/lists`),
    enabled: !!familyId,
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      familyId,
      name,
      trackExpenses,
    }: {
      familyId: string;
      name: string;
      trackExpenses: boolean;
    }) =>
      api.post<ShoppingList>(`/families/${familyId}/lists`, {
        name,
        trackExpenses,
      }),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['lists', variables.familyId] }),
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => api.delete(`/lists/${listId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useToggleExpenses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      listId,
      enabled,
    }: {
      listId: string;
      enabled: boolean;
    }) =>
      api.patch<ShoppingList>(`/lists/${listId}`, { trackExpenses: enabled }),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['list', variables.listId] }),
  });
}

export function useSettleList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) =>
      api.post<ShoppingList>(`/lists/${listId}/settle`, {}),
    onSuccess: (_data, listId) =>
      qc.invalidateQueries({ queryKey: ['list', listId] }),
  });
}
