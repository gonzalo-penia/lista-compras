import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useFamilies } from '../hooks/useFamilies';
import { useFamilyLists, useCreateList } from '../hooks/useLists';
import { useAuthStore } from '../store/auth.store';

export function FamilyHomePage() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const [newListName, setNewListName] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: families, isLoading: loadingFamilies } = useFamilies();
  const family = families?.[0];

  const { data: lists, isLoading: loadingLists } = useFamilyLists(family?.id ?? '');
  const createList = useCreateList();

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
    await createList.mutateAsync({ familyId: family.id, name: newListName.trim() });
    setNewListName('');
    setShowForm(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary-700">{family.name}</h1>
          <p className="text-xs text-gray-400">
            Código: <span className="font-mono font-semibold tracking-widest">{family.inviteCode}</span>
          </p>
        </div>
        <button onClick={clearAuth} className="text-sm text-gray-400 hover:text-gray-600">
          Salir
        </button>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">Listas</h2>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm bg-primary-600 text-white rounded-lg px-3 py-1.5 hover:bg-primary-700 transition-colors"
          >
            + Nueva lista
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreateList} className="flex gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nombre de la lista"
              maxLength={50}
              autoFocus
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={createList.isPending || !newListName.trim()}
              className="bg-primary-600 text-white rounded-xl px-4 py-2 text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewListName(''); }}
              className="text-gray-400 hover:text-gray-600 px-2"
            >
              ✕
            </button>
          </form>
        )}

        {loadingLists ? (
          <FullPageSpinner />
        ) : lists && lists.length > 0 ? (
          <ul className="space-y-2">
            {lists.map((list) => (
              <li key={list.id}>
                <button
                  onClick={() => navigate(`/lists/${list.id}`)}
                  className="w-full text-left bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-primary-400 hover:shadow-sm transition-all"
                >
                  <span className="font-medium text-gray-800">{list.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-400 text-sm py-12">
            No hay listas aún. ¡Creá la primera!
          </p>
        )}
      </main>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
