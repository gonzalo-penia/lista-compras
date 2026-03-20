import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { ShoppingList, ShoppingItem, Expense } from '@familycart/types';

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

    const patchItems = (updater: (items: ShoppingItem[]) => ShoppingItem[]) => {
      qc.setQueryData<ShoppingList>(['list', listId], (prev) =>
        prev ? { ...prev, items: updater(prev.items) } : prev,
      );
    };

    const patchExpenses = (updater: (expenses: Expense[]) => Expense[]) => {
      qc.setQueryData<ShoppingList>(['list', listId], (prev) =>
        prev ? { ...prev, expenses: updater(prev.expenses ?? []) } : prev,
      );
    };

    const onItemAdded = (item: ShoppingItem) => patchItems((items) => [...items, item]);
    const onItemUpdated = (item: ShoppingItem) =>
      patchItems((items) => items.map((i) => (i.id === item.id ? item : i)));
    const onItemToggled = (item: ShoppingItem) =>
      patchItems((items) => items.map((i) => (i.id === item.id ? item : i)));
    const onItemDeleted = ({ id }: { id: string }) =>
      patchItems((items) => items.filter((i) => i.id !== id));

    const onExpenseAdded = (expense: Expense) =>
      patchExpenses((expenses) => {
        if (expenses.some((e) => e.id === expense.id)) return expenses;
        return [...expenses, expense];
      });
    const onExpenseDeleted = ({ id }: { id: string }) =>
      patchExpenses((expenses) => expenses.filter((e) => e.id !== id));

    const onExpensesToggled = ({ id, trackExpenses }: { id: string; trackExpenses: boolean }) => {
      qc.setQueryData<ShoppingList>(['list', id], (prev) =>
        prev ? { ...prev, trackExpenses } : prev,
      );
    };

    const onSettled = ({ id }: { id: string }) => {
      qc.setQueryData<ShoppingList>(['list', id], (prev) =>
        prev ? { ...prev, settled: true } : prev,
      );
    };

    socket.on('item:added', onItemAdded);
    socket.on('item:updated', onItemUpdated);
    socket.on('item:toggled', onItemToggled);
    socket.on('item:deleted', onItemDeleted);
    socket.on('expense:added', onExpenseAdded);
    socket.on('expense:deleted', onExpenseDeleted);
    socket.on('list:expenses-toggled', onExpensesToggled);
    socket.on('list:settled', onSettled);

    return () => {
      socket.emit('list:leave', listId);
      socket.off('item:added', onItemAdded);
      socket.off('item:updated', onItemUpdated);
      socket.off('item:toggled', onItemToggled);
      socket.off('item:deleted', onItemDeleted);
      socket.off('expense:added', onExpenseAdded);
      socket.off('expense:deleted', onExpenseDeleted);
      socket.off('list:expenses-toggled', onExpensesToggled);
      socket.off('list:settled', onSettled);
    };
  }, [listId, qc]);

  return query;
}
