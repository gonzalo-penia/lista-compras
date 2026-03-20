import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useFamilies } from '../hooks/useFamilies';
import { useFamilyLists, useCreateList, useDeleteList } from '../hooks/useLists';
import { useAuthStore } from '../store/auth.store';
import { UserAvatar } from '../components/UserAvatar';
import { ThemeToggle } from '../components/ThemeToggle';
import { getSocket } from '../lib/socket';
import type { ShoppingList } from '@familycart/types';

export function FamilyHomePage() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const qc = useQueryClient();
  const [newListName, setNewListName] = useState('');
  const [newListTrackExpenses, setNewListTrackExpenses] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: families, isLoading: loadingFamilies } = useFamilies();
  const family = families?.[0];

  const { data: lists, isLoading: loadingLists } = useFamilyLists(family?.id ?? '');
  const createList = useCreateList();
  const deleteList = useDeleteList();

  useEffect(() => {
    if (!family) return;
    const socket = getSocket();
    socket.emit('family:join', family.id);

    const onListAdded = (list: ShoppingList) => {
      qc.setQueryData<ShoppingList[]>(['lists', family.id], (prev) => {
        if (!prev || prev.some((l) => l.id === list.id)) return prev;
        return [list, ...prev];
      });
    };

    const onListDeleted = ({ id }: { id: string }) => {
      qc.setQueryData<ShoppingList[]>(['lists', family.id], (prev) =>
        prev ? prev.filter((l) => l.id !== id) : prev,
      );
    };

    socket.on('list:added', onListAdded);
    socket.on('list:deleted', onListDeleted);

    return () => {
      socket.emit('family:leave', family.id);
      socket.off('list:added', onListAdded);
      socket.off('list:deleted', onListDeleted);
    };
  }, [family?.id, qc]);

  if (loadingFamilies) {
    return <FullPageSpinner />;
  }

  if (families && families.length === 0) {
    return <Navigate to="/family/setup" replace />;
  }

  if (!family) return null;

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim() || !family) return;
    await createList.mutateAsync({ familyId: family.id, name: newListName.trim(), trackExpenses: newListTrackExpenses });
    setNewListName('');
    setNewListTrackExpenses(false);
    setShowForm(false);
  }

  async function handleDeleteConfirmed() {
    if (!confirmDeleteId) return;
    await deleteList.mutateAsync(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  const confirmDeleteName = lists?.find((l) => l.id === confirmDeleteId)?.name;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary-700 dark:text-primary-400">{family.name}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Código: <span className="font-mono font-semibold tracking-widest">{family.inviteCode}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserAvatar />
          <button
            onClick={clearAuth}
            aria-label="Cerrar sesión"
            className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Listas</h2>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm bg-primary-600 text-white rounded-lg px-3 py-1.5 hover:bg-primary-700 transition-colors"
          >
            + Nueva lista
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreateList} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nombre de la lista"
                maxLength={50}
                autoFocus
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewListName(''); setNewListTrackExpenses(false); }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-2"
              >
                ✕
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newListTrackExpenses}
                onChange={(e) => setNewListTrackExpenses(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">Llevar control de gastos</span>
            </label>
            <button
              type="submit"
              disabled={createList.isPending || !newListName.trim()}
              className="w-full bg-primary-600 text-white rounded-xl py-2 text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              Crear lista
            </button>
          </form>
        )}

        {loadingLists ? (
          <FullPageSpinner />
        ) : lists && lists.length > 0 ? (
          <ul className="space-y-2">
            {lists.map((list) => (
              <li key={list.id} className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/lists/${list.id}`)}
                  className="flex-1 text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-sm transition-all"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-100">{list.name}</span>
                  {list.trackExpenses && (
                    <span className="ml-2 text-xs text-primary-600 dark:text-primary-400 font-medium">· Gastos</span>
                  )}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(list.id)}
                  aria-label="Eliminar lista"
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-12">
            No hay listas aún. ¡Creá la primera!
          </p>
        )}
      </main>

      {/* Diálogo de confirmación */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              ¿Eliminar lista?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Estás por eliminar <span className="font-medium text-gray-700 dark:text-gray-200">"{confirmDeleteName}"</span> y todos sus productos. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleteList.isPending}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteList.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
    </svg>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
