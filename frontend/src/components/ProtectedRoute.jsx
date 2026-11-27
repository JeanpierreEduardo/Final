import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Loading from './Loading.jsx';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to={user.rol === 'administrador' ? '/admin' : user.rol === 'empleado' ? '/empleado/ventas' : '/usuario/compras'} replace />;
  return <Outlet />;
}
