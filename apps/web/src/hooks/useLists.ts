import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ShoppingList } from '@familycart/types';

export function useFamilyLists(familyId: string) {
  return useQuery<ShoppingList[]>({
    queryKey: ['lists', familyId],
    queryFn: () => api.get<ShoppingList[]>(`/lists/family/${familyId}`),
    enabled: !!familyId,
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, name, trackExpenses }: { familyId: string; name: string; trackExpenses?: boolean }) =>
      api.post<ShoppingList>('/lists', { familyId, name, trackExpenses: trackExpenses ?? false }),
    onSuccess: (newList, { familyId }) => {
      qc.setQueryData<ShoppingList[]>(['lists', familyId], (prev) => {
        if (!prev || prev.some((l) => l.id === newList.id)) return prev;
        return [newList, ...prev];
      });
    },
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => api.delete(`/lists/${listId}`),
    onSuccess: (_, listId) => {
      qc.setQueriesData<ShoppingList[]>({ queryKey: ['lists'] }, (prev) =>
        prev ? prev.filter((l) => l.id !== listId) : prev,
      );
    },
  });
}

export function useSettleList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => api.patch(`/lists/${listId}/settle`, {}),
    onSuccess: (_, listId) => {
      qc.setQueryData<ShoppingList>(['list', listId], (prev) =>
        prev ? { ...prev, settled: true } : prev,
      );
    },
  });
}

export function useToggleExpenses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, enabled }: { listId: string; enabled: boolean }) =>
      api.patch(`/lists/${listId}/expenses`, { enabled }),
    onSuccess: (_, { listId, enabled }) => {
      // Actualiza el cache localmente para el usuario que hizo la acción.
      // El socket notifica al resto de los miembros.
      qc.setQueryData<ShoppingList>(['list', listId], (prev) =>
        prev ? { ...prev, trackExpenses: enabled } : prev,
      );
    },
  });
}
