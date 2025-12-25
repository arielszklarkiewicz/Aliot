import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Donations from './pages/Donations';
import DonationsList from './pages/DonationsList';
import Payments from './pages/Payments';
import DonorsAdmin from './pages/DonorsAdmin';
import DonorSummary from './pages/DonorSummary';
import SystemMap from './components/SystemMap';
import ConceptsAdmin from './pages/ConceptsAdmin';
import DestinationsAdmin from './pages/DestinationsAdmin';
import CollectorsAdmin from './pages/CollectorsAdmin';
import DonorBalances from './pages/DonorBalances';
import UsersAdmin from './pages/UsersAdmin';
import './styles/GlobalStyles.css';

export default function App() {
  return (
    <>
      <SystemMap />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Navigate to="/donations/list" replace /></ProtectedRoute>} />
        <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
        <Route path="/donations/list" element={<ProtectedRoute><DonationsList /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/admin/donors" element={<ProtectedRoute><DonorsAdmin /></ProtectedRoute>} />
        <Route path="/admin/concepts" element={<ProtectedRoute><ConceptsAdmin /></ProtectedRoute>} />
        <Route path="/admin/destinations" element={<ProtectedRoute><DestinationsAdmin /></ProtectedRoute>} />
        <Route path="/admin/collectors" element={<ProtectedRoute><CollectorsAdmin /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><UsersAdmin /></ProtectedRoute>} />
        <Route path="/donors/summary" element={<ProtectedRoute><DonorSummary /></ProtectedRoute>} />
        <Route path="/reports/donor-balances" element={<ProtectedRoute><DonorBalances /></ProtectedRoute>} />
      </Routes>
    </>
  );
}
