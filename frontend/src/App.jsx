import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Donations from './pages/Donations';
import DonationsList from './pages/DonationsList';
import Payments from './pages/Payments';
import DonorsAdmin from './pages/DonorsAdmin';
import DonorSummary from './pages/DonorSummary';
import ConceptsAdmin from './pages/ConceptsAdmin';
import DestinationsAdmin from './pages/DestinationsAdmin';
import CollectorsAdmin from './pages/CollectorsAdmin';
import DonorBalances from './pages/DonorBalances';
import UsersAdmin from './pages/UsersAdmin';
import AuditLog from './pages/AuditLog';
import './styles/GlobalStyles.css';
import './styles/Navigation.css';

export default function App() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Navigate to="/donations/list" replace /></ProtectedRoute>} />
        <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
        <Route path="/donations/list" element={<ProtectedRoute><DonationsList /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/admin/donors" element={<ProtectedRoute><DonorsAdmin /></ProtectedRoute>} />
        <Route path="/admin/concepts" element={<ProtectedRoute><AdminRoute><ConceptsAdmin /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/destinations" element={<ProtectedRoute><AdminRoute><DestinationsAdmin /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/collectors" element={<ProtectedRoute><AdminRoute><CollectorsAdmin /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><UsersAdmin /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/audit-log" element={<ProtectedRoute><AdminRoute><AuditLog /></AdminRoute></ProtectedRoute>} />
        <Route path="/donors/summary" element={<ProtectedRoute><DonorSummary /></ProtectedRoute>} />
        <Route path="/reports/donor-balances" element={<ProtectedRoute><DonorBalances /></ProtectedRoute>} />
      </Routes>
    </>
  );
}
