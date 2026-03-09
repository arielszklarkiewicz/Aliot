import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import DonorAutocomplete from '../components/DonorAutocomplete';
import { formatCurrency, getCurrencyStyle } from '../utils/currency';

export default function PaymentsAdmin() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [lookups, setLookups] = useState({ currencies: [], destinations: [] });
  const [collectors, setCollectors] = useState([]);
  
  // Filters
  const [filterDonorId, setFilterDonorId] = useState('');
  const [filterDonorName, setFilterDonorName] = useState('');
  const [filterDestinationName, setFilterDestinationName] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  
  const [edit, setEdit] = useState(null);
  const isNew = useMemo(() => edit && !edit.id, [edit]);

  useEffect(() => {
    axios.get('/api/lookups').then(r => {
      setLookups({
        currencies: r.data.currencies || [],
        destinations: r.data.destinations || []
      });
    }).catch(() => {});

    Promise.all([
      axios.get('/api/admin/destinations'),
      axios.get('/api/admin/collectors')
    ]).then(([destResp, collResp]) => {
      const destinations = (destResp.data.items || []).sort((a,b) => a.name.localeCompare(b.name));
      const collectors = (collResp.data.items || []).sort((a,b) => a.name.localeCompare(b.name));
      setLookups(prev => ({ ...prev, destinations }));
      setCollectors(collectors);
    }).catch(() => {});
  }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const params = {
        page,
        pageSize,
        donorId: filterDonorId || undefined,
        collector: filterDestinationName || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined
      };
      const { data } = await axios.get('/api/payments', { params });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError('No se pudieron cargar los pagos');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize, filterDonorId, filterDestination, filterFrom, filterTo]);

  const clearFilters = () => {
    setFilterDonorId('');
    setFilterDonorName('');
    setFilterDestination('');
    setFilterFrom('');
    setFilterTo('');
    setPage(1);
  };

  const startNew = () => setEdit({ 
    donorId: '', 
    donorName: '',
    currency: lookups.currencies[0] || 'Pesos', 
    amount: '', 
    paymentDate: new Date().toISOString().slice(0,10),
    destinationId: lookups.destinations[0]?.id || '',
    collectorId: collectors[0]?.id || '',
    comment: '',
    isVirtual: false
  });

  const startEdit = (p) => setEdit({ 
    ...p, 
    donorName: p.donorName || '',
    paymentDate: p.paymentDate?.slice(0,10) || '',
    amount: p.amount?.toString() || ''
  });

  const cancelEdit = () => setEdit(null);

  const save = async () => {
    if (!edit?.donorId) { alert('Seleccione un donante'); return; }
    const amt = parseFloat(edit.amount) || 0;
    if (amt <= 0) { alert('Ingrese un monto válido'); return; }
    
    const payload = {
      donorId: edit.donorId,
      currency: edit.currency,
      amount: amt,
      paymentDate: edit.paymentDate,
      destinationId: edit.destinationId || '',
      collectorId: edit.collectorId || null,
      comment: edit.comment || '',
      isVirtual: edit.isVirtual || false
    };

    try {
      if (isNew) {
        await axios.post('/api/payments', payload);
      } else {
        await axios.put(`/api/payments/${edit.id}`, payload);
      }
      setEdit(null);
      await load();
    } catch (e) {
      alert('No se pudo guardar el pago');
    }
  };

  const del = async (id) => {
    if (!window.confirm('¿Eliminar este pago?')) return;
    try {
      await axios.delete(`/api/payments/${id}`);
      await load();
    } catch (e) {
      alert('No se pudo eliminar el pago');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Administración de Pagos</h1>
          <p className="hero-subtitle">Gestione los pagos registrados en el sistema</p>
        </div>
        <button className="btn btn-primary" onClick={startNew}>
          <span>➕</span> Nuevo pago
        </button>
      </div>

      <div className="content-wrapper">
        {error && <div className="alert alert-error">{error}</div>}

        {/* Filters */}
        <div className="controls-bar" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ minWidth: 200, marginBottom: 0 }}>
              <label style={{ fontSize: '0.875rem', marginBottom: 4 }}>Donante</label>
              <DonorAutocomplete
                value={filterDonorName}
                onChange={(id, donor) => { 
                  if (!donor) { 
                    setFilterDonorId(''); 
                    setFilterDonorName(''); 
                  } else { 
                    setFilterDonorId(id); 
                    setFilterDonorName(donor.fullName); 
                  } 
                  setPage(1); 
                }}
                placeholder="Buscar donante..."
              />
            </div>

            <div className="form-group" style={{ minWidth: 150, marginBottom: 0 }}>
              <label style={{ fontSize: '0.875rem', marginBottom: 4 }}>Destino</label>
              <select 
                value={filterDestination} 
                onChange={e => { setFilterDestination(e.target.value); setPage(1); }} 
                className="form-select"
              >
                <option value="">Todos</option>
                {lookups.destinations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 140, marginBottom: 0 }}>
              <label style={{ fontSize: '0.875rem', marginBottom: 4 }}>Desde</label>
              <input 
                type="date" 
                value={filterFrom} 
                onChange={e => { setFilterFrom(e.target.value); setPage(1); }} 
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ minWidth: 140, marginBottom: 0 }}>
              <label style={{ fontSize: '0.875rem', marginBottom: 4 }}>Hasta</label>
              <input 
                type="date" 
                value={filterTo} 
                onChange={e => { setFilterTo(e.target.value); setPage(1); }} 
                className="form-input"
              />
            </div>

            {(filterDonorId || filterDestination || filterFrom || filterTo) && (
              <button className="btn btn-secondary" onClick={clearFilters} style={{ marginBottom: 0 }}>
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Cargando...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Donante</th>
                    <th>Aclaración</th>
                    <th>Destino</th>
                    <th>Monto</th>
                    <th>Cobrador</th>
                    <th>Comentario</th>
                    <th>Virtual</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20 }}>No hay pagos</td></tr>
                  ) : (
                    items.map(p => (
                      <tr key={p.id}>
                        <td>{p.paymentDate?.slice(0,10)}</td>
                        <td>{p.donorName}</td>
                        <td>{p.donorObservations || '-'}</td>
                        <td>{p.destination}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={getCurrencyStyle(p.currency)}>{formatCurrency(p.amount, p.currency)}</span>
                        </td>
                        <td>{p.collector || '-'}</td>
                        <td>{p.comment || '-'}</td>
                        <td>{p.isVirtual ? '✓' : ''}</td>
                        <td>
                          <button className="btn-icon" onClick={() => startEdit(p)} title="Editar">✏️</button>
                          <button className="btn-icon" onClick={() => del(p.id)} title="Eliminar">🗑️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination-bar">
              <div className="pagination-info">
                Mostrando {items.length} de {total} pagos
              </div>
              <div className="pagination-controls">
                <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                <span className="pagination-pages">Página {page} de {totalPages}</span>
                <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
              </div>
              <div className="pagination-size">
                <label>
                  Registros por página:
                  <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1); }} className="form-select">
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {edit && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{isNew ? 'Nuevo Pago' : 'Editar Pago'}</h2>
              <button className="modal-close" onClick={cancelEdit}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Donante *</label>
                  <DonorAutocomplete
                    value={edit.donorName}
                    onChange={(id, donor) => setEdit({ ...edit, donorId: id, donorName: donor?.fullName || '' })}
                  />
                </div>

                <div className="form-group">
                  <label>Fecha *</label>
                  <input type="date" value={edit.paymentDate} onChange={e => setEdit({ ...edit, paymentDate: e.target.value })} className="form-input" />
                </div>

                <div className="form-group">
                  <label>Monto *</label>
                  <input type="number" value={edit.amount} onChange={e => setEdit({ ...edit, amount: e.target.value })} className="form-input" step="0.01" />
                </div>

                <div className="form-group">
                  <label>Moneda</label>
                  <select value={edit.currency} onChange={e => setEdit({ ...edit, currency: e.target.value })} className="form-select">
                    {lookups.currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Destino *</label>
                  <select value={edit.destinationId} onChange={e => setEdit({ ...edit, destinationId: e.target.value })} className="form-select">
                    {lookups.destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Cobrador</label>
                  <select value={edit.collectorId || ''} onChange={e => setEdit({ ...edit, collectorId: e.target.value || null })} className="form-select">
                    <option value="">-- Sin cobrador --</option>
                    {collectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Comentario</label>
                  <textarea value={edit.comment} onChange={e => setEdit({ ...edit, comment: e.target.value })} className="form-textarea" rows={3}></textarea>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={edit.isVirtual} onChange={e => setEdit({ ...edit, isVirtual: e.target.checked })} />
                    <span>Virtual</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelEdit}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
