import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import DonorAutocomplete from '../components/DonorAutocomplete';

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
  const [creatingVirtual, setCreatingVirtual] = useState(false);

  const hasDateFilters = fromDate || toDate;

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
      return true;
    });
  }, [allDonations, fromDate, toDate, filterDestination, filterCurrency, filterIsVirtual]);

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

  async function createVirtualTransaction(currency, destination, saldoAmount) {
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
    // recompute balances by destination+currency from filtered data
    const map = new Map(); // "destination|currency" -> {donationsTotal, paymentsTotal}
    for (const d of filteredDonations) {
      const key = `${d.destination || ''}|${(d.currency || '').toUpperCase()}`;
      const curr = map.get(key) || { donationsTotal: 0, paymentsTotal: 0, destination: d.destination || '', currency: (d.currency || '').toUpperCase() };
      curr.donationsTotal += Math.trunc(Number(d.amount) || 0);
      map.set(key, curr);
    }
    for (const p of filteredPayments) {
      const key = `${p.destination || ''}|${(p.currency || '').toUpperCase()}`;
      const curr = map.get(key) || { donationsTotal: 0, paymentsTotal: 0, destination: p.destination || '', currency: (p.currency || '').toUpperCase() };
      curr.paymentsTotal += Math.trunc(Number(p.amount) || 0);
      map.set(key, curr);
    }
    return Array.from(map.values()).map(v => ({
      destination: v.destination,
      currency: v.currency,
      donationsTotal: v.donationsTotal,
      paymentsTotal: v.paymentsTotal,
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
    <div>
      <h3 style={{ marginBottom: 12 }}>Resumen de donante</h3>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ minWidth: 280 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Seleccione donante</label>
          <DonorAutocomplete value={donorId} onChange={(id)=> setDonorId(id)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Desde</label>
          <input type="date" value={fromDate} onChange={e=> setFromDate(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Hasta</label>
          <input type="date" value={toDate} onChange={e=> setToDate(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Destino</label>
          <select value={filterDestination} onChange={e=> setFilterDestination(e.target.value)} style={{ height: 32 }}>
            <option value="">Todos</option>
            {availableDestinations.map(dest => (
              <option key={dest} value={dest}>{dest === 'Other' ? 'Otro' : dest}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Moneda</label>
          <select value={filterCurrency} onChange={e=> setFilterCurrency(e.target.value)} style={{ height: 32 }}>
            <option value="">Todas</option>
            {availableCurrencies.map(curr => (
              <option key={curr} value={curr}>{curr}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Virtual</label>
          <select value={filterIsVirtual} onChange={e=> setFilterIsVirtual(e.target.value)} style={{ height: 32 }}>
            <option value="">Todos</option>
            <option value="yes">Sí</option>
            <option value="no">No</option>
          </select>
        </div>
        {(fromDate || toDate || filterDestination || filterCurrency || filterIsVirtual) && (
          <button onClick={()=> { setFromDate(''); setToDate(''); setFilterDestination(''); setFilterCurrency(''); setFilterIsVirtual(''); }} style={{ height: 32 }}>Limpiar</button>
        )}
      </div>

      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {donor && (
        <div style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 999, background: '#0ea5e9', color: 'white', fontWeight: 700, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {String(donor.fullName || '').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{donor.fullName}</div>
              <div style={{ color: '#555' }}>{[donor.email, donor.phone].filter(Boolean).join(' • ')}</div>
            </div>
          </div>
          {donor.address && <div style={{ color: '#555', marginTop: 8 }}>{donor.address}</div>}
          {donor.observations && (
            <div style={{ marginTop: 10, padding: 10, background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Comentarios del donante</div>
              <div style={{ color: '#0f172a' }}>{donor.observations}</div>
            </div>
          )}
        </div>
      )}

      {balances.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {balances.map(b => (
            <div key={`${b.destination}|${b.currency}`} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, minWidth: 220, background: '#fff' }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Destino</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{b.destination === 'Other' ? 'Otro' : b.destination}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Moneda</div>
              <div style={{ marginBottom: 8 }}>
                {(() => {
                  const cur = (b.currency || '').toString();
                  const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                  const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                  return (
                    <span style={{ display:'inline-block', padding: '2px 8px', background: isUsd ? '#ecfdf5' : '#f0f5ff', border: isUsd ? '1px solid #a7f3d0' : '1px solid #d6e4ff', color: isUsd ? '#065f46' : '#1d39c4', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                      {b.currency}
                    </span>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Donaciones</span>
                <span>{fmt(b.donationsTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Pagos</span>
                <span>{fmt(b.paymentsTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 700 }}>
                <span>Saldo</span>
                <span style={{ color: b.total > 0 ? '#16a34a' : b.total < 0 ? '#dc2626' : '#000' }}>
                  {fmt(b.total)}
                </span>
              </div>
              {!hasDateFilters && b.total !== 0 && (
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => createVirtualTransaction(b.currency, b.destination, b.total)}
                    disabled={creatingVirtual}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 12,
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      cursor: creatingVirtual ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      color: '#475569'
                    }}
                    title={b.total > 0 ? 'Crear pago virtual para llevar saldo a 0' : 'Crear donación virtual para llevar saldo a 0'}
                  >
                    {creatingVirtual ? 'Creando...' : (b.total > 0 ? '+ Pago virtual a 0' : '+ Donación virtual a 0')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div>
          <h4 style={{ marginBottom: 8 }}>Donaciones</h4>
          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#fafafa' }}>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Fecha</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 10 }}>Monto</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Moneda</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Minián</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Concepto</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Destino</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Perashá</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Comentario</th>
                  <th style={{ textAlign: 'center', borderBottom: '1px solid #eee', padding: 10 }}>Virtual</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 12, textAlign: 'center', color: '#666' }}>Sin donaciones</td></tr>
                )}
                {filteredDonations.map(d => (
                  <tr key={d.id}>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.donationDate}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10, textAlign: 'right' }}>{fmt(d.amount)}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>
                      {(() => {
                        const cur = (d.currency || '').toString();
                        const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                        const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                        return (
                          <span style={{ display:'inline-block', padding: '2px 8px', background: isUsd ? '#ecfdf5' : '#f0f5ff', border: isUsd ? '1px solid #a7f3d0' : '1px solid #d6e4ff', color: isUsd ? '#065f46' : '#1d39c4', borderRadius: 999, fontSize: 12 }}>
                            {d.currency}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.minian}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.concept}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.destination === 'Other' ? 'Otro' : d.destination}{d.destination === 'Other' && d.destinationOther ? ` (${d.destinationOther})` : ''}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.perasha || '—'}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.comment || '—'}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10, textAlign: 'center' }}>
                      {d.isVirtual ? <span style={{ display: 'inline-block', padding: '2px 8px', background: '#fff7e6', border: '1px solid #ffd591', color: '#ad6800', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>SÍ</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h4 style={{ marginBottom: 8 }}>Pagos</h4>
          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#fafafa' }}>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Fecha</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 10 }}>Monto</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Moneda</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Destino</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Cobrador</th>
                  <th style={{ textAlign: 'center', borderBottom: '1px solid #eee', padding: 10 }}>Virtual</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 12, textAlign: 'center', color: '#666' }}>Sin pagos</td></tr>
                )}
                {filteredPayments.map(p => (
                  <tr key={p.id}>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{p.paymentDate}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10, textAlign: 'right' }}>{fmt(p.amount)}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>
                      {(() => {
                        const cur = (p.currency || '').toString();
                        const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                        const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                        return (
                          <span style={{ display:'inline-block', padding: '2px 8px', background: isUsd ? '#ecfdf5' : '#f0f5ff', border: isUsd ? '1px solid #a7f3d0' : '1px solid #d6e4ff', color: isUsd ? '#065f46' : '#1d39c4', borderRadius: 999, fontSize: 12 }}>
                            {p.currency}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: 8 }}>{p.destination}</td>
                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: 8 }}>{p.collector || '—'}</td>
                    <td style={{ borderBottom: '1px solid #f1f5f9', padding: 8, textAlign: 'center' }}>
                      {p.isVirtual ? <span style={{ display: 'inline-block', padding: '2px 8px', background: '#fff7e6', border: '1px solid #ffd591', color: '#ad6800', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>SÍ</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
