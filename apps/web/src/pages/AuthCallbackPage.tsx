import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { api } from '../lib/api';
import type { User } from '@familycart/types';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((user) => {
        setAuth(user);
        navigate('/', { replace: true });
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Iniciando sesión...</p>
    </div>
  );
}
