import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function RequirePermission({ permission, children }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-loading">Ładowanie...</div>;
  }

  if (!permission || user?.permissions?.[permission]) {
    return children;
  }

  return <Navigate to="/" replace state={{ from: location }} />;
}
