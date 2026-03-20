import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateFamily, useJoinFamily } from '../hooks/useFamilies';
import { ThemeToggle } from '../components/ThemeToggle';

type Mode = 'pick' | 'create' | 'join';

export function FamilySetupPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('pick');
  const [value, setValue] = useState('');

  const createFamily = useCreateFamily();
  const joinFamily = useJoinFamily();

  const isPending = createFamily.isPending || joinFamily.isPending;
  const error = createFamily.error ?? joinFamily.error;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;

    if (mode === 'create') {
      await createFamily.mutateAsync(value.trim());
    } else {
      await joinFamily.mutateAsync(value.trim().toUpperCase());
    }
    navigate('/', { replace: true });
  }

  if (mode === 'pick') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold text-primary-700 dark:text-primary-400">FamilyCart</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Empezá creando tu familia o uniéndote a una existente</p>
          <button
            onClick={() => setMode('create')}
            className="w-full bg-primary-600 text-white rounded-xl py-3 font-medium hover:bg-primary-700 transition-colors"
          >
            Crear familia
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Unirme con código
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 w-full max-w-sm space-y-4">
        <button
          onClick={() => { setMode('pick'); setValue(''); }}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ← Volver
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          {mode === 'create' ? 'Crear familia' : 'Unirme a una familia'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === 'create' ? 'Nombre de la familia' : 'Código de invitación'}
            maxLength={mode === 'create' ? 50 : 6}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error.message}</p>}
          <button
            type="submit"
            disabled={isPending || !value.trim()}
            className="w-full bg-primary-600 text-white rounded-xl py-3 font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Cargando...' : mode === 'create' ? 'Crear' : 'Unirme'}
          </button>
        </form>
      </div>
    </div>
  );
}
