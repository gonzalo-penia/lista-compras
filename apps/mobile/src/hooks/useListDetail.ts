import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ShoppingList } from '@familycart/types';

export function useListDetail(listId: string) {
  return useQuery<ShoppingList>({
    queryKey: ['list', listId],
    queryFn: () => api.get<ShoppingList>(`/lists/${listId}`),
    enabled: !!listId,
  });
}
