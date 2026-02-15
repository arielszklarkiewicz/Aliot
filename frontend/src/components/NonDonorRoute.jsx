import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function NonDonorRoute({ children }) {
  const token = localStorage.getItem('token');
  const { user, loading } = useCurrentUser();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <div style={{textAlign:'center', padding:'40px'}}>Cargando...</div>;
  }
  
  // If user is a Donor, redirect them to their summary page
  if (user?.role === 'Donor') {
    return <Navigate to="/donors/summary" replace />;
  }
  
  return children;
}
