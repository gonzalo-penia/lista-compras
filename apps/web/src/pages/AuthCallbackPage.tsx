import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const picture = params.get('picture') ?? undefined;

    if (!token || !name || !email) {
      navigate('/login', { replace: true });
      return;
    }

    setAuth(
      { id: '', name, email, picture, createdAt: new Date() },
      token,
    );

    // Limpia los params de la URL antes de navegar
    navigate('/', { replace: true });
  }, [navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Iniciando sesión...</p>
    </div>
  );
}
