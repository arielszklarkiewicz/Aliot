import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const { user, loading } = useCurrentUser();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <div style={{textAlign:'center', padding:'40px'}}>Cargando...</div>;
  }
  
  if (user?.role !== 'Admin') {
    return <Navigate to="/donations/list" replace />;
  }
  
  return children;
}
