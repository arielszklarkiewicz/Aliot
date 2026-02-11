import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import DonorAutocomplete from '../components/DonorAutocomplete';
import '../styles/GlobalStyles.css';

function fmt(amount) {
  if (amount == null) return '0';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.trunc(Number(amount)));
}

export default function DonorSummary() {
  const [donorId, setDonorId] = useState('');
  const [donor, setDonor] = useState(null);
  const [allDonations, setAllDonations] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterIsVirtual, setFilterIsVirtual] = useState('');
  const [filterMatana, setFilterMatana] = useState('');
  const [creatingVirtual, setCreatingVirtual] = useState(false);

  const hasAnyFilters = fromDate || toDate || filterDestination || filterCurrency || filterIsVirtual || filterMatana;

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

  async function createVirtualTransaction(currency, destination, saldoAmount, matanaCount = 0) {
    if (!donorId) return;
    setCreatingVirtual(true);
    setError('');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (saldoAmount > 0) {
        // Positive saldo means donor owes money -> create virtual payment
        await axios.post('/api/payments', {
          donorId,
          currency,
          amount: saldoAmount,
          paymentDate: today,
          destination,
          comment: 'Pago virtual para representar que esta en 0',
          isVirtual: true
        });
      } else if (saldoAmount < 0) {
        // Negative saldo means we owe donor -> create virtual donation
        await axios.post('/api/donations', {
          donorId,
          currency,
          amount: Math.abs(saldoAmount),
          donationDate: today,
          perasha: '-',
          minian: '-',
          concept: '-',
          destination,
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
          destination,
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

    // recompute balances by destination+currency from filtered data
    const map = new Map(); // "destination|currency" -> {donationsTotal, paymentsTotal}
    for (const d of filteredDonations) {
      const key = `${d.destination || ''}|${(d.currency || '').toUpperCase()}`;
      const lastVirtualPaymentDate = lastVirtualPayments.get(key);
      const donationDate = new Date(d.donationDate);
      
      // Skip donations that are at or before the last virtual payment (they are considered paid)
      if (lastVirtualPaymentDate && donationDate <= lastVirtualPaymentDate) {
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
      const lastVirtualPaymentDate = lastVirtualPayments.get(key);
      const paymentDate = new Date(p.paymentDate);
      
      // Skip payments that are at or before the last virtual payment
      if (lastVirtualPaymentDate && paymentDate <= lastVirtualPaymentDate) {
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

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Resumen de Donante</h1>
          <p className="hero-subtitle">Consulte el historial completo de donaciones y pagos por donante</p>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="form-section">
          <div className="form-group">
            <label className="form-label">Seleccione donante</label>
            <DonorAutocomplete value={donorId} onChange={(id)=> setDonorId(id)} />
          </div>
          
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
              {balances.map(b => (
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
                        <span style={{ color: '#722ed1', fontWeight: 600 }}>Matana</span>
                        <span style={{ color: '#722ed1', fontWeight: 600 }}>{b.matanaCount}</span>
                      </div>
                    )}
                  </div>
                  {!hasAnyFilters && (b.total !== 0 || b.matanaCount > 0) && (
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

        <div className="tables-section">
          <div className="table-container">
            <h2 className="section-title">Historial de Donaciones</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-right">Monto</th>
                    <th>Moneda</th>
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
                    <tr><td colSpan={9} className="empty-state">Sin donaciones</td></tr>
                  )}
                  {filteredDonations.map(d => (
                    <tr key={d.id}>
                      <td>{d.donationDate}</td>
                      <td className="text-right">
                        {d.matana ? (
                          <span style={{ fontWeight: 600, color: '#722ed1' }}>Matana</span>
                        ) : (
                          fmt(d.amount)
                        )}
                      </td>
                      <td>
                        {(() => {
                          const cur = (d.currency || '').toString();
                          const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                          const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                          return (
                            <span className={`currency-badge ${isUsd ? 'currency-usd' : 'currency-other'}`}>
                              {d.currency}
                            </span>
                          );
                        })()}
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
                    <th>Moneda</th>
                    <th>Destino</th>
                    <th>Cobrador</th>
                    <th className="text-center">Virtual</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 && (
                    <tr><td colSpan={6} className="empty-state">Sin pagos</td></tr>
                  )}
                  {filteredPayments.map(p => (
                    <tr key={p.id}>
                      <td>{p.paymentDate}</td>
                      <td className="text-right">{fmt(p.amount)}</td>
                      <td>
                        {(() => {
                          const cur = (p.currency || '').toString();
                          const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                          const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                          return (
                            <span className={`currency-badge ${isUsd ? 'currency-usd' : 'currency-other'}`}>
                              {p.currency}
                            </span>
                          );
                        })()}
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
