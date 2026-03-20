import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { useThemeStore } from './store/theme.store';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { FamilySetupPage } from './pages/FamilySetupPage';
import { FamilyHomePage } from './pages/FamilyHomePage';
import { ListDetailPage } from './pages/ListDetailPage';

function App() {
  const { isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
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
  );
}

export default App;
