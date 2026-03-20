import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { ShoppingList, ShoppingItem } from '@familycart/types';

export function useListDetail(listId: string) {
  const qc = useQueryClient();

  const query = useQuery<ShoppingList>({
    queryKey: ['list', listId],
    queryFn: () => api.get<ShoppingList>(`/lists/${listId}`),
    enabled: !!listId,
  });

  useEffect(() => {
    const socket = getSocket();
    socket.emit('list:join', listId);

    const patch = (updater: (items: ShoppingItem[]) => ShoppingItem[]) => {
      qc.setQueryData<ShoppingList>(['list', listId], (prev) =>
        prev ? { ...prev, items: updater(prev.items) } : prev,
      );
    };

    const onAdded = (item: ShoppingItem) => patch((items) => [...items, item]);
    const onUpdated = (item: ShoppingItem) =>
      patch((items) => items.map((i) => (i.id === item.id ? item : i)));
    const onToggled = (item: ShoppingItem) =>
      patch((items) => items.map((i) => (i.id === item.id ? item : i)));
    const onDeleted = ({ id }: { id: string }) =>
      patch((items) => items.filter((i) => i.id !== id));

    socket.on('item:added', onAdded);
    socket.on('item:updated', onUpdated);
    socket.on('item:toggled', onToggled);
    socket.on('item:deleted', onDeleted);

    return () => {
      socket.emit('list:leave', listId);
      socket.off('item:added', onAdded);
      socket.off('item:updated', onUpdated);
      socket.off('item:toggled', onToggled);
      socket.off('item:deleted', onDeleted);
    };
  }, [listId, qc]);

  return query;
}
