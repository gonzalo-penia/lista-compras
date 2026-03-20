import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useListDetail } from '../hooks/useListDetail';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/auth.store';

export function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [newItemName, setNewItemName] = useState('');

  const { data: list, isLoading } = useListDetail(listId ?? '');

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim() || !listId) return;
    getSocket().emit('item:add', { listId, name: newItemName.trim() });
    setNewItemName('');
  }

  function handleToggle(itemId: string, checked: boolean) {
    if (!listId) return;
    getSocket().emit('item:toggle', { listId, itemId, checked });
  }

  function handleDelete(itemId: string) {
    if (!listId) return;
    getSocket().emit('item:delete', { listId, itemId });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!list) return null;

  const pending = list.items.filter((i) => !i.checked);
  const done = list.items.filter((i) => i.checked);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-800 flex-1">{list.name}</h1>
        <span className="text-sm text-gray-400">
          {done.length}/{list.items.length}
        </span>
      </header>

      {/* Add item form */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Agregar producto..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={!newItemName.trim()}
            className="bg-primary-600 text-white rounded-xl px-5 py-3 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Agregar
          </button>
        </form>
      </div>

      {/* Items */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {list.items.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">
            La lista está vacía. ¡Agregá el primer producto!
          </p>
        )}

        {pending.length > 0 && (
          <section className="space-y-2">
            {pending.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3"
              >
                <button
                  onClick={() => handleToggle(item.id, true)}
                  className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-primary-500 transition-colors flex-shrink-0"
                  aria-label="Marcar como comprado"
                />
                <span className="flex-1 text-gray-800 text-sm">{item.name}</span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-xs"
                  aria-label="Eliminar"
                >
                  ✕
                </button>
              </div>
            ))}
          </section>
        )}

        {done.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Comprados ({done.length})
            </h3>
            {done.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 opacity-60"
              >
                <button
                  onClick={() => handleToggle(item.id, false)}
                  className="w-5 h-5 rounded-full bg-primary-500 border-2 border-primary-500 flex items-center justify-center flex-shrink-0"
                  aria-label="Desmarcar"
                >
                  <span className="text-white text-xs">✓</span>
                </button>
                <span className="flex-1 text-gray-400 text-sm line-through">{item.name}</span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-xs"
                  aria-label="Eliminar"
                >
                  ✕
                </button>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
