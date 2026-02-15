import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function RoleBasedRedirect() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  if (user.role === 'Donor') {
    return <Navigate to="/donors/summary" replace />;
  }

  // Default redirect for other roles
  return <Navigate to="/donations/list" replace />;
}
