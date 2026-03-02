import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import DonorAutocomplete from '../components/DonorAutocomplete';
import useDebounced from '../hooks/useDebounced';
import { formatCurrency, getCurrencyStyle } from '../utils/currency';

export default function DonationsAdmin() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [lookups, setLookups] = useState({ currencies: [], minian: [], concepts: [], destinations: [] });
  
  // Filters
  const [filterDonorId, setFilterDonorId] = useState('');
  const [filterDonorName, setFilterDonorName] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterMinian, setFilterMinian] = useState('');
  const [filterPerasha, setFilterPerasha] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  
  const [edit, setEdit] = useState(null);
  const isNew = useMemo(() => edit && !edit.id, [edit]);

  useEffect(() => {
    axios.get('/api/lookups').then(r => {
      setLookups({
        currencies: r.data.currencies || [],
        minian: r.data.minian || [],
        concepts: r.data.concepts || [],
        destinations: r.data.destinations || []
      });
    }).catch(() => {});
  }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const params = {
        page,
        pageSize,
        donorId: filterDonorId || undefined,
        destination: filterDestination || undefined,
        minian: filterMinian || undefined,
        perasha: filterPerasha || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined
      };
      console.log('Loading donations with params:', params);
      const { data } = await axios.get('/api/donations', { params });
      console.log('Loaded donations:', data);
      console.log('Setting items count:', data.items?.length);
      setItems(data.items || []);
      setTotal(data.total || 0);
      console.log('Items state should be updated');
    } catch (e) {
      console.error('Error loading donations:', e);
      setError('No se pudieron cargar las donaciones');
    } finally { setLoading(false); }
  }

  useEffect(() => { 
    console.log('useEffect triggered - filters changed');
    load(); 
    /* eslint-disable-next-line */ 
  }, [page, pageSize, filterDonorId, filterDestination, filterMinian, filterPerasha, filterFrom, filterTo]);

  // Debug: log items whenever they change
  useEffect(() => {
    console.log('Items state changed:', items.length, 'items');
  }, [items]);

  const clearFilters = () => {
    setFilterDonorId('');
    setFilterDonorName('');
    setFilterDestination('');
    setFilterMinian('');
    setFilterPerasha('');
    setFilterFrom('');
    setFilterTo('');
    setPage(1);
  };

  const startNew = () => setEdit({ 
    donorId: '', 
    donorName: '',
    currency: lookups.currencies[0] || 'Pesos', 
    amount: '', 
    donationDate: new Date().toISOString().slice(0,10),
    perasha: '',
    minian: lookups.minian[0] || '',
    concept: lookups.concepts[0] || '',
    destination: lookups.destinations[0] || '',
    destinationOther: '',
    comment: '',
    isVirtual: false,
    matana: false
  });

  const startEdit = (d) => setEdit({ 
    ...d, 
    donorName: d.donorName || '',
    donationDate: d.donationDate?.slice(0,10) || '',
    amount: d.amount?.toString() || ''
  });

  const cancelEdit = () => setEdit(null);

  const save = async () => {
    if (!edit?.donorId) { alert('Seleccione un donante'); return; }
    
    // If matana is true, amount should be 0; otherwise validate it's greater than 0
    const amt = edit.matana ? 0 : (parseFloat(edit.amount) || 0);
    if (!edit.matana && amt <= 0) { alert('Ingrese un monto válido'); return; }
    
    const payload = {
      donorId: edit.donorId,
      currency: edit.currency,
      amount: amt,
      donationDate: edit.donationDate,
      perasha: edit.perasha || '',
      minian: edit.minian || '',
      concept: edit.concept || '',
      destination: edit.destination || '',
      destinationOther: edit.destinationOther || '',
      comment: edit.comment || '',
      isVirtual: edit.isVirtual || false,
      matana: edit.matana || false
    };

    try {
      if (isNew) {
        await axios.post('/api/donations', payload);
      } else {
        await axios.put(`/api/donations/${edit.id}`, payload);
      }
      setEdit(null);
      await load();
    } catch (e) {
      alert('No se pudo guardar la donación');
    }
  };

  const del = async (id) => {
    if (!window.confirm('¿Eliminar esta donación?')) return;
    try {
      await axios.delete(`/api/donations/${id}`);
      await load();
    } catch (e) {
      alert('No se pudo eliminar la donación');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Administración de Donaciones</h1>
          <p className="hero-subtitle">Gestione las donaciones registradas en el sistema</p>
        </div>
        <button className="btn btn-primary" onClick={startNew}>
          <span>➕</span> Nueva donación
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
                onChange={(id, donor) => { setPage(1); 
                  if (!donor) { 
                    setFilterDonorId(''); 
                    setFilterDonorName(''); 
                  } else { 
                    setFilterDonorId(id); 
                    setFilterDonorName(donor.fullName); 
                  }
                }}
                placeholder="Buscar donante..."
              />
            </div>

            <div className="form-group" style={{ minWidth: 150, marginBottom: 0 }}>
              <label style={{ fontSize: '0.875rem', marginBottom: 4 }}>Destino</label>
              <select 
                value={filterDestination} 
                onChange={e => setFilterDestination(e.target.value)} 
                className="form-select"
              >
                <option value="">Todos</option>
                {lookups.destinations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 150, marginBottom: 0 }}>
              <label style={{ fontSize: '0.875rem', marginBottom: 4 }}>Minián</label>
              <select 
                value={filterMinian} 
                onChange={e => setFilterMinian(e.target.value)} 
                className="form-select"
              >
                <option value="">Todos</option>
                {lookups.minian.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 150, marginBottom: 0 }}>
              <label style={{ fontSize: '0.875rem', marginBottom: 4 }}>Parashá</label>
              <input 
                type="text" 
                value={filterPerasha} 
                onChange={e => setFilterPerasha(e.target.value)} 
                className="form-input"
                placeholder="Filtrar por Parashá..."
              />
            </div>

            <div className="form-group" style={{ minWidth: 140, marginBottom: 0 }}>
              <label style={{ fontSize: '0.875rem', marginBottom: 4 }}>Desde</label>
              <input 
                type="date" 
                value={filterFrom} 
                onChange={e => setFilterFrom(e.target.value)} 
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ minWidth: 140, marginBottom: 0 }}>
              <label style={{ fontSize: '0.875rem', marginBottom: 4 }}>Hasta</label>
              <input 
                type="date" 
                value={filterTo} 
                onChange={e => setFilterTo(e.target.value)} 
                className="form-input"
              />
            </div>

            {(filterDonorId || filterDestination || filterMinian || filterPerasha || filterFrom || filterTo) && (
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
                    <th>Parasha</th>
                    <th>Donante</th>
                    <th>Aclaración</th>
                    <th>Minian</th>
                    <th>Destino</th>
                    <th>Monto</th>
                    <th>Concepto</th>
                    <th>Virtual</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    console.log('Rendering table with items.length:', items.length);
                    return null;
                  })()}
                  {items.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 20 }}>No hay donaciones</td></tr>
                  ) : (
                    items.map(d => (
                      <tr key={d.id}>
                        <td>{d.donationDate?.slice(0,10)}</td>
                        <td>{d.perasha || '-'}</td>
                        <td>{d.donorName}</td>
                        <td>{d.donorObservations || '-'}</td>
                        <td>{d.minian}</td>
                        <td>{d.destination}{d.destinationOther ? ` (${d.destinationOther})` : ''}</td>
                        <td style={{ textAlign: 'right' }}>
                          {d.matana ? (
                            <span style={{ fontWeight: 600, color: '#f97316' }}>MATANA</span>
                          ) : (
                            <span style={getCurrencyStyle(d.currency)}>{formatCurrency(d.amount, d.currency)}</span>
                          )}
                        </td>
                        <td>{d.concept}</td>
                        <td>{d.isVirtual ? '✓' : ''}</td>
                        <td>
                          <button className="btn-icon" onClick={() => startEdit(d)} title="Editar">✏️</button>
                          <button className="btn-icon" onClick={() => del(d.id)} title="Eliminar">🗑️</button>
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
                Mostrando {items.length} de {total} donaciones
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
                    <option value="1000">Todos</option>
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
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>{isNew ? 'Nueva Donación' : 'Editar Donación'}</h2>
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
                  <input type="date" value={edit.donationDate} onChange={e => setEdit({ ...edit, donationDate: e.target.value })} className="form-input" />
                </div>

                <div className="form-group">
                  <label>Monto *</label>
                  <input 
                    type="number" 
                    value={edit.matana ? '0' : edit.amount} 
                    onChange={e => setEdit({ ...edit, amount: e.target.value })} 
                    className="form-input" 
                    step="0.01"
                    disabled={edit.matana}
                    style={edit.matana ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                  />
                </div>

                <div className="form-group">
                  <label>Moneda</label>
                  <select value={edit.currency} onChange={e => setEdit({ ...edit, currency: e.target.value })} className="form-select">
                    {lookups.currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Minian</label>
                  <select value={edit.minian} onChange={e => setEdit({ ...edit, minian: e.target.value })} className="form-select">
                    {lookups.minian.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Concepto</label>
                  <select value={edit.concept} onChange={e => setEdit({ ...edit, concept: e.target.value })} className="form-select">
                    {lookups.concepts.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Destino</label>
                  <select value={edit.destination} onChange={e => setEdit({ ...edit, destination: e.target.value })} className="form-select">
                    {lookups.destinations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Parasha</label>
                  <input type="text" value={edit.perasha} onChange={e => setEdit({ ...edit, perasha: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Destino Otro</label>
                  <input type="text" value={edit.destinationOther} onChange={e => setEdit({ ...edit, destinationOther: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Comentario</label>
                  <textarea value={edit.comment} onChange={e => setEdit({ ...edit, comment: e.target.value })} className="form-textarea" rows={3}></textarea>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={edit.matana} 
                      onChange={e => setEdit({ ...edit, matana: e.target.checked, amount: e.target.checked ? '0' : edit.amount })} 
                    />
                    <span>Matana</span>
                  </label>
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
