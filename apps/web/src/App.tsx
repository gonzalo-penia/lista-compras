import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

const HomePage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <p className="text-gray-700">Home - Lista de compras (próximamente)</p>
  </div>
);

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/*"
        element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default App;
