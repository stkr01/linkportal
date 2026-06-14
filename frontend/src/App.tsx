import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminUsersPage from './pages/AdminUsersPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import type { Role } from './types';
import { ReactNode } from 'react';
import { useTranslation } from './i18n';

function Protected({ children, minRole }: { children: ReactNode; minRole?: Role }) {
  const { user, loading, hasRole } = useAuth();
  const { t } = useTranslation();
  if (loading) return <div className="empty">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (minRole && !hasRole(minRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="empty">{t('common.loading')}</div> : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/link/:id"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/admin/users"
        element={
          <Protected minRole="ADMIN">
            <AdminUsersPage />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <SettingsPage />
          </Protected>
        }
      />
      <Route
        path="/help"
        element={
          <Protected>
            <HelpPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
