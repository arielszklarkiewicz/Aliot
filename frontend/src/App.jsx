import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import NonDonorRoute from './components/NonDonorRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import ForcePasswordChange from './components/ForcePasswordChange';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Donations from './pages/Donations';
import DonationsList from './pages/DonationsList';
import Payments from './pages/Payments';
import DonorsAdmin from './pages/DonorsAdmin';
import DonationsAdmin from './pages/DonationsAdmin';
import PaymentsAdmin from './pages/PaymentsAdmin';
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
      <ForcePasswordChange />
      <Navigation />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
        <Route path="/donations" element={<ProtectedRoute><NonDonorRoute><Donations /></NonDonorRoute></ProtectedRoute>} />
        <Route path="/donations/list" element={<ProtectedRoute><NonDonorRoute><DonationsList /></NonDonorRoute></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><NonDonorRoute><Payments /></NonDonorRoute></ProtectedRoute>} />
        <Route path="/admin/donors" element={<ProtectedRoute><NonDonorRoute><DonorsAdmin /></NonDonorRoute></ProtectedRoute>} />
        <Route path="/admin/donations" element={<ProtectedRoute><NonDonorRoute><AdminRoute><DonationsAdmin /></AdminRoute></NonDonorRoute></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute><NonDonorRoute><AdminRoute><PaymentsAdmin /></AdminRoute></NonDonorRoute></ProtectedRoute>} />
        <Route path="/admin/concepts" element={<ProtectedRoute><NonDonorRoute><AdminRoute><ConceptsAdmin /></AdminRoute></NonDonorRoute></ProtectedRoute>} />
        <Route path="/admin/destinations" element={<ProtectedRoute><NonDonorRoute><AdminRoute><DestinationsAdmin /></AdminRoute></NonDonorRoute></ProtectedRoute>} />
        <Route path="/admin/collectors" element={<ProtectedRoute><NonDonorRoute><AdminRoute><CollectorsAdmin /></AdminRoute></NonDonorRoute></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><NonDonorRoute><AdminRoute><UsersAdmin /></AdminRoute></NonDonorRoute></ProtectedRoute>} />
        <Route path="/admin/audit-log" element={<ProtectedRoute><NonDonorRoute><AdminRoute><AuditLog /></AdminRoute></NonDonorRoute></ProtectedRoute>} />
        <Route path="/donors/summary" element={<ProtectedRoute><DonorSummary /></ProtectedRoute>} />
        <Route path="/reports/donor-balances" element={<ProtectedRoute><NonDonorRoute><DonorBalances /></NonDonorRoute></ProtectedRoute>} />
      </Routes>
    </>
  );
}
