import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <div style={{padding:20}}>
      <SystemMap />
      <Routes>
        <Route path="/" element={<Navigate to="/donations/list" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/donations" element={<Donations />} />
        <Route path="/donations/list" element={<DonationsList />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/admin/donors" element={<DonorsAdmin />} />
        <Route path="/admin/concepts" element={<ConceptsAdmin />} />
        <Route path="/admin/destinations" element={<DestinationsAdmin />} />
        <Route path="/admin/collectors" element={<CollectorsAdmin />} />
        <Route path="/donors/summary" element={<DonorSummary />} />
        <Route path="/reports/donor-balances" element={<DonorBalances />} />
      </Routes>
    </div>
  );
}
