import { Navigate, Outlet } from 'react-router-dom';
import { getTokens } from '../api/auth-storage';

export function ProtectedRoute() {
  const tokens = getTokens();
  if (!tokens) return <Navigate to="/login" replace />;
  return <Outlet />;
}
