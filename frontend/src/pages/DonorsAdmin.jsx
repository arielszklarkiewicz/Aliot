import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import useDebounced from '../hooks/useDebounced';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function DonorsAdmin() {
  const { isAdmin } = useCurrentUser();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 300);
  const [occasionalFilter, setOccasionalFilter] = useState('all'); // 'all' | 'yes' | 'no'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [edit, setEdit] = useState(null); // object or null
  const isNew = useMemo(() => edit && !edit.id, [edit]);
  
  const [showInstructions, setShowInstructions] = useState(null); // donor object to show instructions for

  async function load() {
    setLoading(true); setError('');
    try {
      console.log('Loading donors with params:', { q: debouncedQ, occasionalFilter, page, pageSize });
      const { data } = await axios.get('/api/donors', { params: { q: debouncedQ || undefined, isOccasionalDonor: occasionalFilter==='yes' ? true : occasionalFilter==='no' ? false : undefined, page, pageSize } });
      console.log('Donors loaded:', data);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Error loading donors:', e);
      setError('No se pudieron cargar los donantes');
    } finally { setLoading(false); }
  }

  // Load on mount and when filters change
  useEffect(() => { 
    console.log('useEffect triggered - debouncedQ:', debouncedQ, 'occasionalFilter:', occasionalFilter, 'page:', page, 'pageSize:', pageSize);
    load(); 
    /* eslint-disable-next-line */ 
  }, [debouncedQ, occasionalFilter, page, pageSize]);

  const startNew = () => setEdit({ firstName: '', lastName: '', email: '', phone: '', address: '', observations: '', isOccasionalDonor: false });
  const startEdit = (d) => setEdit({ ...d });
  const cancelEdit = () => setEdit(null);

  const save = async () => {
    if (!edit?.firstName?.trim()) { alert('El nombre es obligatorio'); return; }
    try {
      if (isNew) {
        const response = await axios.post('/api/donors', edit);
        const createdDonor = response.data;
        
        // Show message about user account creation
        alert(`Donante creado exitosamente.\n\nSe ha creado una cuenta de usuario automáticamente.\n\nUsuario: ${edit.firstName.toLowerCase()}.${(edit.lastName || '').toLowerCase()}\nContraseña: 123456\n\n⚠️ El donante deberá cambiar su contraseña al iniciar sesión por primera vez.`);
        
        setEdit(null);
        setPage(1); // Reset to first page - will trigger load via useEffect
      } else {
        await axios.put(`/api/donors/${edit.id}`, edit);
        setEdit(null);
        await load(); // Reload current page for updates
      }
    } catch (e) {
      alert('No se pudo guardar el donante');
    }
  };

  const del = async (id) => {
    if (!window.confirm('¿Eliminar este donante?')) return;
    try {
      await axios.delete(`/api/donors/${id}`);
      await load();
    } catch (e) {
      alert('No se pudo eliminar el donante');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Administración de Donantes</h1>
          <p className="hero-subtitle">Gestione los donantes registrados en el sistema</p>
        </div>
        <button className="btn btn-primary" onClick={startNew}>
          <span>➕</span> Nuevo donante
        </button>
      </div>

      <div className="content-wrapper">

        {/* Search and Filters */}
        <div className="controls-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 250, marginBottom: 0 }}>
            <input 
              className="search-input"
              placeholder="Buscar por nombre u observaciones" 
              value={q} 
              onChange={e=>{ setQ(e.target.value); setPage(1); }}
              aria-label="Buscar donantes"
            />
          </div>
          <select 
            className="sort-select"
            value={occasionalFilter} 
            onChange={e=>{ setOccasionalFilter(e.target.value); setPage(1); }} 
            aria-label="Filtrar donantes ocasionales"
          >
            <option value="all">Todos</option>
            <option value="yes">Solo ocasionales</option>
            <option value="no">Solo regulares</option>
          </select>
        </div>
      </div>

      {loading && <div className="loading-state">Cargando donantes...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && (
        <>
          <div className="table-container desktop-visible">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre completo</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th style={{textAlign:'center'}}>Ocasional</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      No se encontraron donantes
                    </td>
                  </tr>
                )}
                {items.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.fullName}</strong></td>
                    <td>{d.email || '—'}</td>
                    <td>{d.phone || '—'}</td>
                    <td>{d.address || '—'}</td>
                    <td style={{textAlign:'center'}}>
                      <span className={d.isOccasionalDonor ? 'badge badge-warning' : 'badge badge-success'}>
                        {d.isOccasionalDonor ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.observations || '—'}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => startEdit(d)}>Editar</button>
                        {isAdmin && (
                          <button className="btn btn-sm btn-primary" onClick={() => setShowInstructions(d)} title="Ver instrucciones de acceso">
                            📋 Instrucciones
                          </button>
                        )}
                        <button className="btn btn-sm btn-ghost" onClick={() => del(d.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-visible desktop-hidden">
            {items.length === 0 && (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                No se encontraron donantes
              </div>
            )}
            {items.map(d => (
              <div key={d.id} className="mobile-card">
                <div className="mobile-card-header">
                  <div className="mobile-card-title">{d.fullName}</div>
                  <span className={d.isOccasionalDonor ? 'badge badge-warning' : 'badge badge-success'}>
                    {d.isOccasionalDonor ? 'Ocasional' : 'Regular'}
                  </span>
                </div>
                <div className="mobile-card-body">
                  {d.email && <div className="mobile-card-row">
                    <span className="mobile-card-label">Email:</span>
                    <span className="mobile-card-value">{d.email}</span>
                  </div>}
                  {d.phone && <div className="mobile-card-row">
                    <span className="mobile-card-label">Teléfono:</span>
                    <span className="mobile-card-value">{d.phone}</span>
                  </div>}
                  {d.address && <div className="mobile-card-row">
                    <span className="mobile-card-label">Dirección:</span>
                    <span className="mobile-card-value">{d.address}</span>
                  </div>}
                  {d.observations && <div className="mobile-card-row">
                    <span className="mobile-card-label">Observaciones:</span>
                    <span className="mobile-card-value">{d.observations}</span>
                  </div>}
                </div>
                <div className="mobile-card-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => startEdit(d)}>Editar</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => del(d.id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      <div className="pagination-container">
        <div className="pagination-info">
          Mostrando {items.length > 0 ? ((page-1)*pageSize + 1) : 0} - {Math.min(page*pageSize, total)} de {total}
        </div>
        <div className="pagination-controls">
          <button className="pagination-btn" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1, p-1))}>
            ← Anterior
          </button>
          <span className="pagination-page-info">{page} / {totalPages}</span>
          <button className="pagination-btn" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages, p+1))}>
            Siguiente →
          </button>
        </div>
        <div className="page-size-controls">
          <label>Mostrar:</label>
          <select value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); }}>
            {[10,20,50].map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
      </div>

      {/* Edit Modal */}
      {edit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && cancelEdit()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isNew ? 'Nuevo donante' : 'Editar donante'}</h2>
              <button className="modal-close" onClick={cancelEdit}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre</label>
                  <input placeholder="Nombre" value={edit.firstName || ''} onChange={e=>setEdit({ ...edit, firstName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input placeholder="Apellido" value={edit.lastName || ''} onChange={e=>setEdit({ ...edit, lastName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="Email" value={edit.email || ''} onChange={e=>setEdit({ ...edit, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" placeholder="Teléfono" value={edit.phone || ''} onChange={e=>setEdit({ ...edit, phone: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Dirección</label>
                  <input placeholder="Dirección" value={edit.address || ''} onChange={e=>setEdit({ ...edit, address: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input id="chk-occasional" type="checkbox" checked={!!edit.isOccasionalDonor} onChange={e=>setEdit({ ...edit, isOccasionalDonor: e.target.checked })} />
                    <label htmlFor="chk-occasional" style={{ margin: 0 }}>Donante ocasional</label>
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Observaciones</label>
                  <textarea placeholder="Observaciones" value={edit.observations || ''} onChange={e=>setEdit({ ...edit, observations: e.target.value })} rows={3} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cancelEdit}>Cancelar</button>
              <button className="btn btn-success" onClick={save}>{isNew ? 'Crear' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions Modal */}
      {showInstructions && (
        <div className="modal-overlay" onClick={() => setShowInstructions(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Instrucciones de Acceso al Sistema</h2>
              <button className="modal-close" onClick={() => setShowInstructions(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 600 }}>
                  Donante: <span style={{ color: '#2563eb' }}>{showInstructions.fullName}</span>
                </p>
                
                <div style={{ 
                  padding: 16, 
                  background: '#f9fafb', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  lineHeight: 1.8
                }}>
                  <p style={{ margin: 0, marginBottom: 12 }}>
                    <strong>URL:</strong> https://aliot-1.onrender.com/
                  </p>
                  <p style={{ margin: 0, marginBottom: 12 }}>
                    <strong>Usuario:</strong> {showInstructions.firstName?.toLowerCase()}.{showInstructions.lastName?.toLowerCase() || ''}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Contraseña inicial:</strong> 123456
                  </p>
                </div>

                <div style={{ 
                  marginTop: 16, 
                  padding: 12, 
                  background: '#fef3c7', 
                  border: '1px solid #f59e0b', 
                  borderRadius: 6 
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                    ⚠️ <strong>Importante:</strong> El usuario deberá cambiar su contraseña al iniciar sesión por primera vez.
                  </p>
                </div>
              </div>
              
              <div style={{ marginTop: 20 }}>
                <p style={{ fontWeight: 600, marginBottom: 12 }}>Mensaje completo para copiar:</p>
                <div style={{ 
                  padding: 12, 
                  background: '#f9fafb', 
                  border: '1px solid #d1d5db', 
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui'
                }}>
                  {`Hola ${showInstructions.firstName},

Le damos la bienvenida al sistema de gestión de donaciones de la Ieshivá Jajam Nissim Cohen.

Para acceder a su cuenta:

🌐 URL: https://aliot-1.onrender.com/
👤 Usuario: ${showInstructions.firstName?.toLowerCase()}.${showInstructions.lastName?.toLowerCase() || ''}
🔑 Contraseña inicial: 123456

⚠️ Por seguridad, deberá cambiar su contraseña al iniciar sesión por primera vez.

En el sistema podrá consultar el estado de sus donaciones y pagos.

Saludos cordiales`}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowInstructions(null)}
              >
                Cerrar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const text = `Hola ${showInstructions.firstName},

Le damos la bienvenida al sistema de gestión de donaciones de la Ieshivá Jajam Nissim Cohen.

Para acceder a su cuenta:

🌐 URL: https://aliot-1.onrender.com/
👤 Usuario: ${showInstructions.firstName?.toLowerCase()}.${showInstructions.lastName?.toLowerCase() || ''}
🔑 Contraseña inicial: 123456

⚠️ Por seguridad, deberá cambiar su contraseña al iniciar sesión por primera vez.

En el sistema podrá consultar el estado de sus donaciones y pagos.

Saludos cordiales`;
                  navigator.clipboard.writeText(text);
                  alert('Instrucciones copiadas al portapapeles');
                }}
              >
                📋 Copiar Instrucciones
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
