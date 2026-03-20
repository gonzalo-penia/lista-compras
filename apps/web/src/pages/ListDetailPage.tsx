import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useListDetail } from '../hooks/useListDetail';
import { useToggleExpenses, useSettleList } from '../hooks/useLists';
import { useFamilies } from '../hooks/useFamilies';
import { getSocket } from '../lib/socket';
import { UserAvatar } from '../components/UserAvatar';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuthStore } from '../store/auth.store';
import type { Expense } from '@familycart/types';

export function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [newItemName, setNewItemName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);

  const { data: list, isLoading } = useListDetail(listId ?? '');
  const { data: families } = useFamilies();
  const toggleExpenses = useToggleExpenses();
  const settleList = useSettleList();

  const family = families?.[0];
  const memberCount = family?.members?.length ?? 1;

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim() || !listId || list?.settled) return;
    getSocket().emit('item:add', { listId, name: newItemName.trim() });
    setNewItemName('');
  }

  function handleToggle(itemId: string, checked: boolean) {
    if (!listId) return;
    getSocket().emit('item:toggle', { listId, itemId, checked });
  }

  function handleDelete(itemId: string) {
    if (!listId || list?.settled) return;
    getSocket().emit('item:delete', { listId, itemId });
  }

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (!amount || amount <= 0 || !listId || list?.settled) return;
    getSocket().emit('expense:add', {
      listId,
      amount,
      description: expenseDescription.trim() || undefined,
    });
    setExpenseAmount('');
    setExpenseDescription('');
  }

  function handleDeleteExpense(expenseId: string) {
    if (!listId) return;
    getSocket().emit('expense:delete', { listId, expenseId });
  }

  async function handleToggleExpenses() {
    if (!listId || !list || list.settled) return;
    await toggleExpenses.mutateAsync({ listId, enabled: !list.trackExpenses });
  }

  async function handleConfirmSettle() {
    if (!listId) return;
    await settleList.mutateAsync(listId);
    setShowSettleConfirm(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!list) return null;

  const pending = list.items.filter((i) => !i.checked);
  const done = list.items.filter((i) => i.checked);
  const expenses = list.expenses ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Volver"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 truncate">{list.name}</h1>
          {list.settled && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Lista cerrada</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 dark:text-gray-500">{done.length}/{list.items.length}</span>
          <ThemeToggle />
          <UserAvatar />
        </div>
      </header>

      {/* Add item form — oculto si está cerrada */}
      {!list.settled && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Agregar producto..."
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
      )}

      <main className="max-w-lg mx-auto px-4 py-4 space-y-6">

        {/* Items pendientes */}
        {pending.length > 0 && (
          <section className="space-y-2">
            {pending.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                <button
                  onClick={() => handleToggle(item.id, true)}
                  className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-500 hover:border-primary-500 transition-colors flex-shrink-0"
                  aria-label="Marcar como comprado"
                />
                <span className="flex-1 text-gray-800 dark:text-gray-100 text-sm">{item.name}</span>
                {!list.settled && (
                  <button onClick={() => handleDelete(item.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors text-xs" aria-label="Eliminar">✕</button>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Items comprados */}
        {done.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Comprados ({done.length})
            </h3>
            {done.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 opacity-60">
                <button
                  onClick={() => handleToggle(item.id, false)}
                  className="w-5 h-5 rounded-full bg-primary-500 border-2 border-primary-500 flex items-center justify-center flex-shrink-0"
                  aria-label="Desmarcar"
                >
                  <span className="text-white text-xs">✓</span>
                </button>
                <span className="flex-1 text-gray-400 dark:text-gray-500 text-sm line-through">{item.name}</span>
                {!list.settled && (
                  <button onClick={() => handleDelete(item.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors text-xs" aria-label="Eliminar">✕</button>
                )}
              </div>
            ))}
          </section>
        )}

        {list.items.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
            La lista está vacía.
          </p>
        )}

        {/* ── Sección de Gastos ──────────────────────────────────────────── */}
        <section className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">

          {/* Encabezado con toggle (solo si no está cerrada) */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <CoinIcon />
              Gastos
            </h2>
            {!list.settled && (
              <button
                onClick={handleToggleExpenses}
                disabled={toggleExpenses.isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  list.trackExpenses ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label="Activar seguimiento de gastos"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  list.trackExpenses ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            )}
          </div>

          {list.trackExpenses && (
            <>
              {/* Form de carga — oculto si está cerrada */}
              {!list.settled && (
                <form onSubmit={handleAddExpense} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!expenseAmount || parseFloat(expenseAmount) <= 0}
                      className="bg-primary-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="Descripción (opcional)"
                    maxLength={80}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </form>
              )}

              {/* Lista de gastos */}
              {expenses.length > 0 ? (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      isOwn={expense.userId === user?.id}
                      canDelete={!list.settled}
                      onDelete={() => handleDeleteExpense(expense.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-2">
                  Aún no hay gastos registrados.
                </p>
              )}

              {/* Botón "Hacer las cuentas" */}
              {!list.settled && expenses.length > 0 && (
                <button
                  onClick={() => setShowSettleConfirm(true)}
                  className="w-full border-2 border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-400 rounded-xl py-3 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  Hacer las cuentas
                </button>
              )}

              {/* Desglose — solo visible cuando está cerrada */}
              {list.settled && expenses.length > 0 && (
                <ExpenseSummary
                  expenses={expenses}
                  memberCount={memberCount}
                  members={family?.members ?? []}
                />
              )}
            </>
          )}

          {!list.trackExpenses && !list.settled && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
              Activá el seguimiento para registrar gastos en esta lista.
            </p>
          )}
        </section>
      </main>

      {/* Diálogo de confirmación de cierre */}
      {showSettleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">¿Hacer las cuentas?</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Estás por <span className="font-semibold text-gray-700 dark:text-gray-200">cerrar esta lista definitivamente</span>. Una vez confirmado no se podrán agregar nuevos productos ni gastos, y se mostrará el desglose final.
            </p>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Esta acción no tiene vuelta atrás.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowSettleConfirm(false)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSettle}
                disabled={settleList.isPending}
                className="flex-1 bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {settleList.isPending ? 'Cerrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function ExpenseRow({
  expense, isOwn, canDelete, onDelete,
}: {
  expense: Expense;
  isOwn: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
      {expense.user.picture ? (
        <img src={expense.user.picture} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-semibold">
            {expense.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-100 font-medium truncate">
          {expense.user.name.split(' ')[0]}
          {expense.description && (
            <span className="font-normal text-gray-500 dark:text-gray-400"> · {expense.description}</span>
          )}
        </p>
      </div>
      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0">
        ${Number(expense.amount).toFixed(2)}
      </span>
      {isOwn && canDelete && (
        <button
          onClick={onDelete}
          className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0"
          aria-label="Eliminar gasto"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ExpenseSummary({
  expenses, memberCount, members,
}: {
  expenses: Expense[];
  memberCount: number;
  members: { id: string; name: string }[];
}) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fairShare = total / memberCount;

  const byUser = expenses.reduce<Record<string, { name: string; paid: number }>>((acc, e) => {
    if (!acc[e.userId]) acc[e.userId] = { name: e.user.name.split(' ')[0], paid: 0 };
    acc[e.userId].paid += Number(e.amount);
    return acc;
  }, {});

  members.forEach((m) => {
    if (!byUser[m.id]) byUser[m.id] = { name: m.name.split(' ')[0], paid: 0 };
  });

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Desglose final</h3>

      <div className="flex justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">Total gastado</span>
        <span className="font-bold text-gray-800 dark:text-gray-100">${total.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">Corresponde a cada uno ({memberCount})</span>
        <span className="font-bold text-gray-800 dark:text-gray-100">${fairShare.toFixed(2)}</span>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
        {Object.entries(byUser).map(([userId, { name, paid }]) => {
          const balance = paid - fairShare;
          return (
            <div key={userId} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-200 font-medium">{name}</span>
              <div className="text-right">
                <span className="text-gray-400 dark:text-gray-500 mr-2">pagó ${paid.toFixed(2)}</span>
                {Math.abs(balance) < 0.01 ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold">✓ par</span>
                ) : balance > 0 ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold">le deben ${balance.toFixed(2)}</span>
                ) : (
                  <span className="text-red-500 dark:text-red-400 font-semibold">debe ${Math.abs(balance).toFixed(2)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CoinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary-600 dark:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 6v2m0 8v2M9.5 9.5C9.5 8.12 10.62 7 12 7s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5C9.5 15.88 10.62 17 12 17s2.5-1.12 2.5-2.5" />
    </svg>
  );
}
