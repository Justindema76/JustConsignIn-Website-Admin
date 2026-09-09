import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AdminAuthContext';

export default function RequireAdmin() {
  const { user, accessToken, checking } = useAuth();
  if (checking) return null;
  if (!user?.isAdmin || !accessToken) return <Navigate to="/admin-login" replace />;
  return <Outlet />;
}
