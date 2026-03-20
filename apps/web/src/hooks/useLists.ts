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
    mutationFn: ({ familyId, name }: { familyId: string; name: string }) =>
      api.post<ShoppingList>('/lists', { familyId, name }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['lists', vars.familyId] }),
  });
}
