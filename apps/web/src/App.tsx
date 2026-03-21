import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { useThemeStore } from './store/theme.store';
import { api } from './lib/api';
import type { User } from '@familycart/types';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const FamilySetupPage = lazy(() => import('./pages/FamilySetupPage').then((m) => ({ default: m.FamilySetupPage })));
const FamilyHomePage = lazy(() => import('./pages/FamilyHomePage').then((m) => ({ default: m.FamilyHomePage })));
const ListDetailPage = lazy(() => import('./pages/ListDetailPage').then((m) => ({ default: m.ListDetailPage })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const { isDark } = useThemeStore();
  const [bootstrapping, setBootstrapping] = useState(!isAuthenticated);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Si el store no tiene sesión pero puede existir una cookie válida, verificar con el servidor
  useEffect(() => {
    if (isAuthenticated) {
      setBootstrapping(false);
      return;
    }
    api
      .get<User>('/auth/me')
      .then((user) => setAuth(user))
      .catch(() => clearAuth())
      .finally(() => setBootstrapping(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (bootstrapping) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/family/setup"
          element={isAuthenticated ? <FamilySetupPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/lists/:listId"
          element={isAuthenticated ? <ListDetailPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <FamilyHomePage /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
