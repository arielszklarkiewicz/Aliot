import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import useDebounced from '../hooks/useDebounced';

export default function DonorsAdmin() {
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

  async function load() {
    setLoading(true); setError('');
    try {
      const { data } = await axios.get('/api/donors', { params: { q: debouncedQ || undefined, isOccasionalDonor: occasionalFilter==='yes' ? true : occasionalFilter==='no' ? false : undefined, page, pageSize } });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError('No se pudieron cargar los donantes');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [debouncedQ, occasionalFilter, page, pageSize]);

  const startNew = () => setEdit({ firstName: '', lastName: '', email: '', phone: '', address: '', observations: '', isOccasionalDonor: false });
  const startEdit = (d) => setEdit({ ...d });
  const cancelEdit = () => setEdit(null);

  const save = async () => {
    if (!edit?.firstName?.trim()) { alert('El nombre es obligatorio'); return; }
    try {
      if (isNew) {
        await axios.post('/api/donors', edit);
      } else {
        await axios.put(`/api/donors/${edit.id}`, edit);
      }
      setEdit(null);
      await load();
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
    <div>
      <h3>Administración de donantes</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <input placeholder="Buscar por nombre u observaciones" value={q} onChange={e=>{ setQ(e.target.value); setPage(1); }} />
        <select value={occasionalFilter} onChange={e=>{ setOccasionalFilter(e.target.value); setPage(1); }} aria-label="Filtrar donantes ocasionales">
          <option value="all">Todos</option>
          <option value="yes">Solo ocasionales</option>
          <option value="no">Solo regulares</option>
        </select>
        <button onClick={startNew}>Nuevo donante</button>
      </div>

      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {!loading && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Nombre completo</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Teléfono</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Dirección</th>
              <th style={{ textAlign: 'center', borderBottom: '1px solid #ddd' }}>Ocasional</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Observaciones</th>
              <th style={{ borderBottom: '1px solid #ddd' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id}>
                <td style={{ borderBottom: '1px solid #f0f0f0' }}>{d.fullName}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0' }}>{d.email || '—'}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0' }}>{d.phone || '—'}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0' }}>{d.address || '—'}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>{d.isOccasionalDonor ? 'Sí' : 'No'}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.observations || '—'}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <button onClick={() => startEdit(d)}>Editar</button>
                  <button onClick={() => del(d.id)} style={{ marginLeft: 6 }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1, p-1))}>Anterior</button>
        <span>Página {page} / {totalPages}</span>
        <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages, p+1))}>Siguiente</button>
        <select value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); }}>
          {[10,20,50].map(s => (<option key={s} value={s}>{s} / página</option>))}
        </select>
      </div>

      {edit && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
          <h4>{isNew ? 'Nuevo donante' : 'Editar donante'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(200px,1fr))', gap: 8 }}>
            <input placeholder="Nombre" value={edit.firstName || ''} onChange={e=>setEdit({ ...edit, firstName: e.target.value })} />
            <input placeholder="Apellido" value={edit.lastName || ''} onChange={e=>setEdit({ ...edit, lastName: e.target.value })} />
            <input placeholder="Email" value={edit.email || ''} onChange={e=>setEdit({ ...edit, email: e.target.value })} />
            <input placeholder="Teléfono" value={edit.phone || ''} onChange={e=>setEdit({ ...edit, phone: e.target.value })} />
            <input placeholder="Dirección" value={edit.address || ''} onChange={e=>setEdit({ ...edit, address: e.target.value })} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input id="chk-occasional" type="checkbox" checked={!!edit.isOccasionalDonor} onChange={e=>setEdit({ ...edit, isOccasionalDonor: e.target.checked })} />
              <label htmlFor="chk-occasional">Donante ocasional</label>
            </div>
            <textarea placeholder="Observaciones" value={edit.observations || ''} onChange={e=>setEdit({ ...edit, observations: e.target.value })} rows={3} style={{ gridColumn: '1 / -1' }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={save}>{isNew ? 'Crear' : 'Guardar'}</button>
            <button onClick={cancelEdit} style={{ marginLeft: 8 }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
