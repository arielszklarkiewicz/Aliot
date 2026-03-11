import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import DonorAutocomplete from '../components/DonorAutocomplete';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { formatCurrency, getCurrencyStyle } from '../utils/currency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/GlobalStyles.css';

function fmt(amount) {
  if (amount == null) return '0';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.trunc(Number(amount)));
}

export default function DonorSummary() {
  const { user, isDonor } = useCurrentUser();
  const [donorId, setDonorId] = useState('');
  const [donor, setDonor] = useState(null);
  const [allDonations, setAllDonations] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterIsVirtual, setFilterIsVirtual] = useState('');
  const [filterMatana, setFilterMatana] = useState('');
  const [creatingVirtual, setCreatingVirtual] = useState(false);
  const [showRecentTransactions, setShowRecentTransactions] = useState(true);
  const [showCombinedList, setShowCombinedList] = useState(false);

  const hasAnyFilters = fromDate || toDate || filterDestination || filterCurrency || filterIsVirtual || filterMatana;

  // Load destinations and concepts list
  useEffect(() => {
    async function loadLookupsData() {
      try {
        const [destResponse, conceptResponse] = await Promise.all([
          axios.get('/api/admin/destinations'),
          axios.get('/api/admin/concepts')
        ]);
        setDestinations(destResponse.data.items || []);
        setConcepts(conceptResponse.data.items || []);
      } catch (e) {
        console.error('Error loading lookup data:', e);
      }
    }
    loadLookupsData();
  }, []);

  // Auto-load donor for Donor role users
  useEffect(() => {
    async function loadDonorForUser() {
      if (!isDonor || !user) return;
      
      try {
        // Use dedicated endpoint to get donor ID for current user
        const { data } = await axios.get('/api/donors/my-donor-id');
        setDonorId(data.donorId);
      } catch (e) {
        console.error('Error loading donor:', e);
        if (e.response?.status === 404) {
          setError('No se encontró su perfil de donante. Por favor contacte al administrador.');
        } else {
          setError('Error al cargar su perfil');
        }
      }
    }
    
    loadDonorForUser();
  }, [isDonor, user]);

  useEffect(() => {
    async function load() {
      if (!donorId) { setDonor(null); setAllDonations([]); setAllPayments([]); return; }
      setLoading(true); setError('');
      try {
        const { data } = await axios.get(`/api/donors/${donorId}/summary`);
        setDonor(data.donor || null);
        setAllDonations(data.donations || []);
        setAllPayments(data.payments || []);
      } catch (e) {
        setError('No se pudo cargar el resumen');
      } finally { setLoading(false); }
    }
    load();
  }, [donorId]);

  // Parse ISO or YYYY-MM-DD strings to comparable values
  const filteredDonations = useMemo(() => {
    return (allDonations || []).filter(d => {
      const date = new Date(d.donationDate);
      if (fromDate) { const f = new Date(fromDate); if (date < f) return false; }
      if (toDate) { const t = new Date(toDate); t.setHours(23,59,59,999); if (date > t) return false; }
      if (filterDestination && d.destination !== filterDestination) return false;
      if (filterCurrency && (d.currency || '').toUpperCase() !== filterCurrency.toUpperCase()) return false;
      if (filterIsVirtual === 'yes' && !d.isVirtual) return false;
      if (filterIsVirtual === 'no' && d.isVirtual) return false;
      if (filterMatana === 'yes' && !d.matana) return false;
      if (filterMatana === 'no' && d.matana) return false;
      return true;
    });
  }, [allDonations, fromDate, toDate, filterDestination, filterCurrency, filterIsVirtual, filterMatana]);

  const filteredPayments = useMemo(() => {
    return (allPayments || []).filter(p => {
      const date = new Date(p.paymentDate);
      if (fromDate) { const f = new Date(fromDate); if (date < f) return false; }
      if (toDate) { const t = new Date(toDate); t.setHours(23,59,59,999); if (date > t) return false; }
      if (filterDestination && p.destination !== filterDestination) return false;
      if (filterCurrency && (p.currency || '').toUpperCase() !== filterCurrency.toUpperCase()) return false;
      if (filterIsVirtual === 'yes' && !p.isVirtual) return false;
      if (filterIsVirtual === 'no' && p.isVirtual) return false;
      return true;
    });
  }, [allPayments, fromDate, toDate, filterDestination, filterCurrency, filterIsVirtual]);

  async function createVirtualTransaction(currency, destinationName, saldoAmount, matanaCount = 0) {
    if (!donorId) return;
    setCreatingVirtual(true);
    setError('');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Find destination ID from name
      const destination = destinations.find(d => d.name.toLowerCase() === destinationName.toLowerCase());
      if (!destination) {
        console.error('Destination not found. Looking for:', destinationName, 'Available:', destinations.map(d => d.name));
        setError(`No se encontró el destino: ${destinationName}`);
        return;
      }
      
      if (saldoAmount > 0) {
        // Positive saldo means donor owes money -> create virtual payment
        await axios.post('/api/payments', {
          donorId,
          currency,
          amount: saldoAmount,
          paymentDate: today,
          destinationId: destination.id,
          comment: 'Pago virtual para representar que esta en 0',
          isVirtual: true
        });
      } else if (saldoAmount < 0) {
        // Negative saldo means we owe donor -> create virtual donation
        // Find a default concept (use first one available)
        const defaultConcept = concepts[0];
        if (!defaultConcept) {
          setError('No se encontró un concepto para crear la donación virtual');
          return;
        }
        
        await axios.post('/api/donations', {
          donorId,
          currency,
          amount: Math.abs(saldoAmount),
          donationDate: today,
          perasha: '-',
          minian: '-',
          conceptId: defaultConcept.id,
          destinationId: destination.id,
          comment: 'Donacion virtual para representar que esta en 0',
          isVirtual: true
        });
      } else if (matanaCount > 0) {
        // Only Matanas, create virtual payment to mark as settled
        await axios.post('/api/payments', {
          donorId,
          currency,
          amount: 1,
          paymentDate: today,
          destinationId: destination.id,
          comment: `Pago virtual para marcar ${matanaCount} Matana(s) como pagadas`,
          isVirtual: true
        });
      }
      
      // Reload summary
      const { data } = await axios.get(`/api/donors/${donorId}/summary`);
      setDonor(data.donor || null);
      setAllDonations(data.donations || []);
      setAllPayments(data.payments || []);
    } catch (e) {
      setError('Error al crear transacción virtual: ' + (e.response?.data?.error || e.message));
    } finally {
      setCreatingVirtual(false);
    }
  }

  const exportToPDF = () => {
    if (!donor) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Resumen de Donante', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const today = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Fecha: ${today}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Donor Information
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Informacion del Donante', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Nombre: ${donor.fullName}`, 14, yPos);
    yPos += 6;
    if (donor.email) {
      doc.text(`Email: ${donor.email}`, 14, yPos);
      yPos += 6;
    }
    if (donor.phone) {
      doc.text(`Telefono: ${donor.phone}`, 14, yPos);
      yPos += 6;
    }
    if (donor.address) {
      doc.text(`Direccion: ${donor.address}`, 14, yPos);
      yPos += 6;
    }
    yPos += 5;

    // Active Filters
    if (hasAnyFilters) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Filtros Aplicados:', 14, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      if (fromDate) {
        doc.text(`- Desde: ${fromDate}`, 14, yPos);
        yPos += 5;
      }
      if (toDate) {
        doc.text(`- Hasta: ${toDate}`, 14, yPos);
        yPos += 5;
      }
      if (filterDestination) {
        doc.text(`- Destino: ${filterDestination}`, 14, yPos);
        yPos += 5;
      }
      if (filterCurrency) {
        doc.text(`- Moneda: ${filterCurrency}`, 14, yPos);
        yPos += 5;
      }
      yPos += 5;
    }

    // Balances Section
    if (balances.length > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Totales por Destino y Moneda', 14, yPos);
      yPos += 8;

      const balanceData = balances.map(b => [
        b.destination === 'Other' ? 'Otro' : b.destination,
        b.currency,
        fmt(b.donationsTotal),
        fmt(b.paymentsTotal),
        fmt(b.total),
        b.matanaCount > 0 ? `${b.matanaCount} Matana(s)` : '-'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Destino', 'Moneda', 'Donaciones', 'Pagos', 'Saldo', 'Matana']],
        body: balanceData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' }
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Donations History
    if (filteredDonations.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Historial de Donaciones', 14, yPos);
      yPos += 8;

      const donationsData = filteredDonations.map(d => [
        d.donationDate,
        d.matana ? 'Matana' : fmt(d.amount),
        d.currency,
        d.minian,
        d.concept,
        d.destination === 'Other' ? 'Otro' : d.destination,
        d.perasha || '-',
        d.isVirtual ? 'Si' : 'No'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Monto', 'Moneda', 'Minian', 'Concepto', 'Destino', 'Parasha', 'Virtual']],
        body: donationsData,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          1: { halign: 'right' },
          7: { halign: 'center' }
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Payments History
    if (filteredPayments.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Historial de Pagos', 14, yPos);
      yPos += 8;

      const paymentsData = filteredPayments.map(p => [
        p.paymentDate,
        fmt(p.amount),
        p.currency,
        p.destination,
        p.collector || '-',
        p.isVirtual ? 'Si' : 'No'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Monto', 'Moneda', 'Destino', 'Cobrador', 'Virtual']],
        body: paymentsData,
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113], fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          1: { halign: 'right' },
          5: { halign: 'center' }
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Combined Transactions List
    if (combinedTransactions.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Todas las Transacciones', 14, yPos);
      yPos += 8;

      const combinedData = combinedTransactions.map(t => [
        t.date,
        t.type === 'donation' ? 'Donacion' : 'Pago',
        t.matana ? 'Matana' : fmt(t.amount),
        t.currency,
        t.destination,
        t.isVirtual ? 'Si' : 'No'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Tipo', 'Monto', 'Moneda', 'Destino', 'Virtual']],
        body: combinedData,
        theme: 'striped',
        headStyles: { fillColor: [156, 39, 176], fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          2: { halign: 'right' },
          5: { halign: 'center' }
        }
      });
    }

    // Save PDF
    const fileName = `Resumen_${donor.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  const balances = useMemo(() => {
    // Find the latest virtual payment date for each destination/currency combination
    const lastVirtualPayments = new Map(); // "destination|currency" -> latest payment date
    for (const p of filteredPayments) {
      if (p.isVirtual) {
        const key = `${p.destination || ''}|${(p.currency || '').toUpperCase()}`;
        const existingDate = lastVirtualPayments.get(key);
        const paymentDate = new Date(p.paymentDate);
        if (!existingDate || paymentDate > existingDate) {
          lastVirtualPayments.set(key, paymentDate);
        }
      }
    }

    // Find the latest virtual donation date for each destination/currency combination
    const lastVirtualDonations = new Map(); // "destination|currency" -> latest donation date
    for (const d of filteredDonations) {
      if (d.isVirtual) {
        const key = `${d.destination || ''}|${(d.currency || '').toUpperCase()}`;
        const existingDate = lastVirtualDonations.get(key);
        const donationDate = new Date(d.donationDate);
        if (!existingDate || donationDate > existingDate) {
          lastVirtualDonations.set(key, donationDate);
        }
      }
    }

    // Find the latest virtual transaction date (either payment or donation)
    const lastVirtualTransactions = new Map(); // "destination|currency" -> latest virtual date
    for (const [key, date] of lastVirtualPayments.entries()) {
      const donationDate = lastVirtualDonations.get(key);
      const latestDate = donationDate && donationDate > date ? donationDate : date;
      lastVirtualTransactions.set(key, latestDate);
    }
    for (const [key, date] of lastVirtualDonations.entries()) {
      if (!lastVirtualTransactions.has(key)) {
        lastVirtualTransactions.set(key, date);
      }
    }

    // recompute balances by destination+currency from filtered data
    const map = new Map(); // "destination|currency" -> {donationsTotal, paymentsTotal}
    for (const d of filteredDonations) {
      const key = `${d.destination || ''}|${(d.currency || '').toUpperCase()}`;
      const lastVirtualDate = lastVirtualTransactions.get(key);
      const donationDate = new Date(d.donationDate);
      
      // Skip transactions before the last virtual transaction
      if (lastVirtualDate && donationDate < lastVirtualDate) {
        continue;
      }
      
      // Skip virtual transactions - they are only reset points, not actual amounts
      if (d.isVirtual) {
        continue;
      }

      const curr = map.get(key) || { donationsTotal: 0, paymentsTotal: 0, matanaCount: 0, destination: d.destination || '', currency: (d.currency || '').toUpperCase() };
      if (d.matana) {
        curr.matanaCount += 1;
      } else {
        curr.donationsTotal += Math.trunc(Number(d.amount) || 0);
      }
      map.set(key, curr);
    }
    for (const p of filteredPayments) {
      const key = `${p.destination || ''}|${(p.currency || '').toUpperCase()}`;
      const lastVirtualDate = lastVirtualTransactions.get(key);
      const paymentDate = new Date(p.paymentDate);
      
      // Skip transactions before the last virtual transaction
      if (lastVirtualDate && paymentDate < lastVirtualDate) {
        continue;
      }
      
      // Skip virtual transactions - they are only reset points, not actual amounts
      if (p.isVirtual) {
        continue;
      }
      
      const curr = map.get(key) || { donationsTotal: 0, paymentsTotal: 0, matanaCount: 0, destination: p.destination || '', currency: (p.currency || '').toUpperCase() };
      curr.paymentsTotal += Math.trunc(Number(p.amount) || 0);
      map.set(key, curr);
    }
    return Array.from(map.values()).map(v => ({
      destination: v.destination,
      currency: v.currency,
      donationsTotal: v.donationsTotal,
      paymentsTotal: v.paymentsTotal,
      matanaCount: v.matanaCount,
      total: v.donationsTotal - v.paymentsTotal,
    })).sort((a,b)=> {
      const destCmp = a.destination.localeCompare(b.destination);
      return destCmp !== 0 ? destCmp : a.currency.localeCompare(b.currency);
    });
  }, [filteredDonations, filteredPayments]);

  // Get unique destinations and currencies for filter dropdowns
  const availableDestinations = useMemo(() => {
    const destinations = new Set();
    allDonations.forEach(d => d.destination && destinations.add(d.destination));
    allPayments.forEach(p => p.destination && destinations.add(p.destination));
    return Array.from(destinations).sort();
  }, [allDonations, allPayments]);

  const availableCurrencies = useMemo(() => {
    const currencies = new Set();
    allDonations.forEach(d => d.currency && currencies.add((d.currency || '').toUpperCase()));
    allPayments.forEach(p => p.currency && currencies.add((p.currency || '').toUpperCase()));
    return Array.from(currencies).sort();
  }, [allDonations, allPayments]);

  // Get most recent donation and payment (not filtered, from all data)
  const mostRecentDonation = useMemo(() => {
    if (allDonations.length === 0) return null;
    return [...allDonations].sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate))[0];
  }, [allDonations]);

  const mostRecentPayment = useMemo(() => {
    if (allPayments.length === 0) return null;
    return [...allPayments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
  }, [allPayments]);

  // Combined list of donations and payments ordered by date (desc)
  const combinedTransactions = useMemo(() => {
    const donations = filteredDonations.map(d => ({
      type: 'donation',
      date: d.donationDate,
      amount: d.matana ? null : d.amount,
      currency: d.currency,
      destination: d.destination === 'Other' ? 'Otro' : d.destination,
      matana: d.matana,
      isVirtual: d.isVirtual,
      details: d
    }));

    const payments = filteredPayments.map(p => ({
      type: 'payment',
      date: p.paymentDate,
      amount: p.amount,
      currency: p.currency,
      destination: p.destination,
      matana: false,
      isVirtual: p.isVirtual,
      details: p
    }));

    return [...donations, ...payments].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredDonations, filteredPayments]);

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Resumen de Donante</h1>
          <p className="hero-subtitle">Consulte el historial completo de donaciones y pagos por donante</p>
        </div>
        {donor && (
          <button className="btn btn-primary" onClick={exportToPDF}>
            <span>📄</span> Exportar a PDF
          </button>
        )}
      </div>

      <div className="content-wrapper">
        <div className="form-section">
          {!isDonor && (
            <div className="form-group">
              <label className="form-label">Seleccione donante</label>
              <DonorAutocomplete value={donorId} onChange={(id)=> setDonorId(id)} />
            </div>
          )}
          
          {isDonor && donor && (
            <div style={{ marginBottom: '20px', padding: '16px', background: '#f0f5ff', borderRadius: '8px', border: '2px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, color: '#1d4ed8' }}>Bienvenido, {donor.fullName}</h3>
                <a href="/messages" style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                  💬 Mensajes
                </a>
              </div>
              <p style={{ margin: 0, color: '#64748b' }}>Aquí puede ver el resumen de sus donaciones y pagos</p>
            </div>
          )}
          
          <div className="filter-section">
            <div className="filter-header">Filtros de búsqueda</div>
            <div className="filter-grid">
              <div className="form-group">
                <label className="form-label">Desde</label>
                <input type="date" value={fromDate} onChange={e=> setFromDate(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Hasta</label>
                <input type="date" value={toDate} onChange={e=> setToDate(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Destino</label>
                <select value={filterDestination} onChange={e=> setFilterDestination(e.target.value)} className="form-select">
                  <option value="">Todos</option>
                  {availableDestinations.map(dest => (
                    <option key={dest} value={dest}>{dest === 'Other' ? 'Otro' : dest}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Moneda</label>
                <select value={filterCurrency} onChange={e=> setFilterCurrency(e.target.value)} className="form-select">
                  <option value="">Todas</option>
                  {availableCurrencies.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Virtual</label>
                <select value={filterIsVirtual} onChange={e=> setFilterIsVirtual(e.target.value)} className="form-select">
                  <option value="">Todos</option>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Matana</label>
                <select value={filterMatana} onChange={e=> setFilterMatana(e.target.value)} className="form-select">
                  <option value="">Todos</option>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              {(fromDate || toDate || filterDestination || filterCurrency || filterIsVirtual || filterMatana) && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button 
                    onClick={()=> { setFromDate(''); setToDate(''); setFilterDestination(''); setFilterCurrency(''); setFilterIsVirtual(''); setFilterMatana(''); }} 
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && <div className="loading-state">Cargando...</div>}
        {error && <div className="error-message">{error}</div>}

        {donor && (
          <div className="donor-info-card">
            <div className="donor-avatar-row">
              <div className="donor-avatar">
                {String(donor.fullName || '').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="donor-details">
                <div className="donor-name">{donor.fullName}</div>
                <div className="donor-contact">{[donor.email, donor.phone].filter(Boolean).join(' • ')}</div>
              </div>
            </div>
            {donor.address && <div className="donor-address">{donor.address}</div>}
            {donor.observations && (
              <div className="donor-observations">
                <div className="observations-label">Comentarios del donante</div>
                <div className="observations-text">{donor.observations}</div>
              </div>
            )}
            {hasAnyFilters && (
              <div className="active-filters">
                <div className="active-filters-label">Filtros aplicados:</div>
                <div className="filter-tags">
                  {fromDate && (
                    <span className="filter-tag">
                      Desde: {fromDate}
                    </span>
                  )}
                  {toDate && (
                    <span className="filter-tag">
                      Hasta: {toDate}
                    </span>
                  )}
                  {filterDestination && (
                    <span className="filter-tag">
                      Destino: {filterDestination === 'Other' ? 'Otro' : filterDestination}
                    </span>
                  )}
                  {filterCurrency && (
                    <span className="filter-tag">
                      Moneda: {filterCurrency}
                    </span>
                  )}
                  {filterIsVirtual && (
                    <span className="filter-tag">
                      Virtual: {filterIsVirtual === 'yes' ? 'Sí' : 'No'}
                    </span>
                  )}
                  {filterMatana && (
                    <span className="filter-tag">
                      Matana: {filterMatana === 'yes' ? 'Sí' : 'No'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {balances.length > 0 && (
          <div className="balances-section">
            <h2 className="section-title">Totales por Destino y Moneda</h2>
            <div className="balances-grid">
              {balances.filter(b => b.total !== 0 || b.matanaCount > 0).map(b => (
                <div key={`${b.destination}|${b.currency}`} className="balance-card">
                  <div className="balance-header">
                    <span className="balance-label">Destino</span>
                    <span className="balance-destination">{b.destination === 'Other' ? 'Otro' : b.destination}</span>
                  </div>
                  <div className="balance-currency-row">
                    <span className="balance-label">Moneda</span>
                    {(() => {
                      const cur = (b.currency || '').toString();
                      const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                      const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                      return (
                        <span className={`currency-badge ${isUsd ? 'currency-usd' : 'currency-other'}`}>
                          {b.currency}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="balance-amounts">
                    <div className="balance-row">
                      <span>Donaciones</span>
                      <span>{fmt(b.donationsTotal)}</span>
                    </div>
                    <div className="balance-row">
                      <span>Pagos</span>
                      <span>{fmt(b.paymentsTotal)}</span>
                    </div>
                    <div className="balance-row balance-total">
                      <span>Saldo</span>
                      <span className={b.total > 0 ? 'balance-positive' : b.total < 0 ? 'balance-negative' : ''}>
                        {fmt(b.total)}
                      </span>
                    </div>
                    {b.matanaCount > 0 && (
                      <div className="balance-row" style={{ marginTop: '8px', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                        <span style={{ color: '#f97316', fontWeight: 600 }}>MATANA</span>
                        <span style={{ color: '#f97316', fontWeight: 600 }}>{b.matanaCount}</span>
                      </div>
                    )}
                  </div>
                  {!isDonor && !hasAnyFilters && (b.total !== 0 || b.matanaCount > 0) && (
                    <button
                      onClick={() => createVirtualTransaction(b.currency, b.destination, b.total, b.matanaCount)}
                      disabled={creatingVirtual}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', marginTop: '12px' }}
                      title={b.total > 0 ? 'Crear pago virtual para llevar saldo a 0' : b.total < 0 ? 'Crear donación virtual para llevar saldo a 0' : 'Marcar Matanas como pagadas'}
                    >
                      {creatingVirtual ? 'Creando...' : (b.total > 0 ? '+ Pago virtual a 0' : b.total < 0 ? '+ Donación virtual a 0' : '+ Marcar como pagado')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {donor && (mostRecentDonation || mostRecentPayment) && (
          <div className="recent-transactions-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Transacciones Más Recientes</h2>
              <button
                onClick={() => setShowRecentTransactions(!showRecentTransactions)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.5rem 1rem' }}
              >
                {showRecentTransactions ? '▼ Ocultar' : '▶ Mostrar'}
              </button>
            </div>
            
            {showRecentTransactions && (
              <div className="recent-transactions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {mostRecentDonation && (
                  <div className="recent-transaction-card" style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                    padding: '1.5rem', 
                    borderRadius: '12px', 
                    color: 'white',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: 600 }}>
                      ÚLTIMA DONACIÓN CARGADA
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>
                      {mostRecentDonation.matana ? (
                        <span style={{ color: '#f97316' }}>MATANA</span>
                      ) : mostRecentDonation.isVirtual ? (
                        <span style={{ opacity: 0.7 }}>—</span>
                      ) : (
                        fmt(mostRecentDonation.amount)
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.95, lineHeight: 1.6 }}>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Fecha:</strong> {mostRecentDonation.donationDate}
                      </div>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Moneda:</strong> {mostRecentDonation.currency}
                      </div>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Destino:</strong> {mostRecentDonation.destination === 'Other' ? 'Otro' : mostRecentDonation.destination}
                      </div>
                      {mostRecentDonation.perasha && (
                        <div style={{ marginBottom: '0.25rem' }}>
                          <strong>Perashá:</strong> {mostRecentDonation.perasha}
                        </div>
                      )}
                      {mostRecentDonation.concept && (
                        <div style={{ marginBottom: '0.25rem' }}>
                          <strong>Concepto:</strong> {mostRecentDonation.concept}
                        </div>
                      )}
                      {mostRecentDonation.comment && (
                        <div style={{ marginBottom: '0.25rem' }}>
                          <strong>Comentario:</strong> {mostRecentDonation.comment}
                        </div>
                      )}
                      {mostRecentDonation.isVirtual && (
                        <div style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', display: 'inline-block' }}>
                          Virtual
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {mostRecentPayment && (
                  <div className="recent-transaction-card" style={{ 
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
                    padding: '1.5rem', 
                    borderRadius: '12px', 
                    color: 'white',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: 600 }}>
                      ÚLTIMO PAGO CARGADO
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>
                      {mostRecentPayment.isVirtual ? (
                        <span style={{ opacity: 0.7 }}>—</span>
                      ) : (
                        fmt(mostRecentPayment.amount)
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.95, lineHeight: 1.6 }}>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Fecha:</strong> {mostRecentPayment.paymentDate}
                      </div>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Moneda:</strong> {mostRecentPayment.currency}
                      </div>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Destino:</strong> {mostRecentPayment.destination}
                      </div>
                      {mostRecentPayment.collector && (
                        <div style={{ marginBottom: '0.25rem' }}>
                          <strong>Cobrador:</strong> {mostRecentPayment.collector}
                        </div>
                      )}
                      {mostRecentPayment.comment && (
                        <div style={{ marginBottom: '0.25rem' }}>
                          <strong>Comentario:</strong> {mostRecentPayment.comment}
                        </div>
                      )}
                      {mostRecentPayment.isVirtual && (
                        <div style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', display: 'inline-block' }}>
                          Virtual
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {donor && combinedTransactions.length > 0 && (
          <div className="combined-transactions-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Todas las Transacciones</h2>
              <button
                onClick={() => setShowCombinedList(!showCombinedList)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.5rem 1rem' }}
              >
                {showCombinedList ? '▼ Ocultar' : '▶ Mostrar'}
              </button>
            </div>
            
            {showCombinedList && (
              <div className="table-container">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th className="text-right">Monto</th>
                        <th>Destino</th>
                        <th className="text-center">Virtual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedTransactions.map((t, idx) => (
                        <tr key={`${t.type}-${t.date}-${idx}`}>
                          <td>{t.date}</td>
                          <td>
                            {t.type === 'donation' ? (
                              <span className="badge" style={{ 
                                backgroundColor: '#e0e7ff', 
                                color: '#4338ca',
                                fontWeight: 500,
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.875rem'
                              }}>
                                Donación
                              </span>
                            ) : (
                              <span className="badge" style={{ 
                                backgroundColor: '#fce7f3', 
                                color: '#be185d',
                                fontWeight: 500,
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.875rem'
                              }}>
                                Pago
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            {t.matana ? (
                              <span style={{ fontWeight: 600, color: '#f97316' }}>MATANA</span>
                            ) : (
                              <span style={getCurrencyStyle(t.currency)}>{formatCurrency(t.amount, t.currency)}</span>
                            )}
                          </td>
                          <td>{t.destination}</td>
                          <td className="text-center">
                            {t.isVirtual ? <span className="badge badge-warning">SÍ</span> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="tables-section">
          <div className="table-container">
            <h2 className="section-title">Historial de Donaciones</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-right">Monto</th>
                    <th>Minián</th>
                    <th>Concepto</th>
                    <th>Destino</th>
                    <th>Perashá</th>
                    <th>Comentario</th>
                    <th className="text-center">Virtual</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonations.length === 0 && (
                    <tr><td colSpan={8} className="empty-state">Sin donaciones</td></tr>
                  )}
                  {filteredDonations.map(d => (
                    <tr key={d.id}>
                      <td>{d.donationDate}</td>
                      <td className="text-right">
                        {d.matana ? (
                          <span style={{ fontWeight: 600, color: '#f97316' }}>MATANA</span>
                        ) : (
                          <span style={getCurrencyStyle(d.currency)}>{formatCurrency(d.amount, d.currency)}</span>
                        )}
                      </td>
                      <td>{d.minian}</td>
                      <td>{d.concept}</td>
                      <td>{d.destination === 'Other' ? 'Otro' : d.destination}{d.destination === 'Other' && d.destinationOther ? ` (${d.destinationOther})` : ''}</td>
                      <td>{d.perasha || '—'}</td>
                      <td>{d.comment || '—'}</td>
                      <td className="text-center">
                        {d.isVirtual ? <span className="badge badge-warning">SÍ</span> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="table-container">
            <h2 className="section-title">Historial de Pagos</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-right">Monto</th>
                    <th>Destino</th>
                    <th>Cobrador</th>
                    <th className="text-center">Virtual</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 && (
                    <tr><td colSpan={5} className="empty-state">Sin pagos</td></tr>
                  )}
                  {filteredPayments.map(p => (
                    <tr key={p.id}>
                      <td>{p.paymentDate}</td>
                      <td className="text-right">
                        <span style={getCurrencyStyle(p.currency)}>{formatCurrency(p.amount, p.currency)}</span>
                      </td>
                      <td>{p.destination}</td>
                      <td>{p.collector || '—'}</td>
                      <td className="text-center">
                        {p.isVirtual ? <span className="badge badge-warning">SÍ</span> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
