import React, { useEffect, useState } from 'react';
import axios from '../api/client';

function Row({ item, onSave, onDelete }) {
  const [name, setName] = useState(item.name);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setBusy(true); setError('');
    try {
      await onSave({ ...item, name: name.trim() });
      setEditing(false);
    } catch (e) {
      setError(e?.response?.data?.error || 'Oh, no se pudo guardar');
    } finally { setBusy(false); }
  };

  return (
    <tr>
      <td style={{width: '60%'}}>
        {editing ? (
          <input value={name} onChange={e=>setName(e.target.value)} />
        ) : (
          <span>{item.name}</span>
        )}
        {error && <div className="small" style={{color:'#b91c1c'}}>{error}</div>}
      </td>
      <td style={{textAlign:'right'}}>
        {!editing ? (
          <>
            <button className="btn btn-sm btn-secondary" onClick={()=>setEditing(true)}>Editar</button>
            <button className="btn btn-sm btn-ghost" onClick={()=>onDelete(item)} style={{marginLeft:8}}>Eliminar</button>
          </>
        ) : (
          <>
            <button className="btn btn-sm btn-success" onClick={save} disabled={busy}>Guardar</button>
            <button className="btn btn-sm btn-ghost" onClick={()=>{ setEditing(false); setName(item.name); }} style={{marginLeft:8}}>Cancelar</button>
          </>
        )}
      </td>
    </tr>
  );
}

export default function CollectorsAdmin() {
  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.get('/api/admin/collectors');
      setItems(data.items || []);
    } catch (e) {
      setError('Error al cargar cobradores');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    const name = newName.trim(); if (!name) return;
    try {
      await axios.post('/api/admin/collectors', { name });
      setNewName('');
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'No se pudo agregar');
    }
  };

  const save = async (updated) => {
    await axios.put(`/api/admin/collectors/${updated.id}`, updated);
    await load();
  };

  const remove = async (it) => {
    if (!confirm(`¿Eliminar cobrador \"${it.name}\"?`)) return;
    try {
      await axios.delete(`/api/admin/collectors/${it.id}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'No se pudo eliminar');
    }
  };

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Administrar Cobradores</h1>
          <p className="hero-subtitle">Gestione los cobradores del sistema</p>
        </div>
      </div>

      <div className="content-wrapper">
        {/* Add New Section */}
        <div className="form-section">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            className="search-input"
            style={{ flex: 1, minWidth: 250 }}
            placeholder="Nuevo cobrador" 
            value={newName} 
            onChange={e=>setNewName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && add()}
          />
          <button className="btn btn-success" onClick={add}>
            <span>➕</span> Agregar
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      
      {loading ? (
        <div className="loading-state">Cargando cobradores...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th style={{textAlign:'right'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <Row key={it.id} item={it} onSave={save} onDelete={remove} />
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={2} className="empty-state">
                    <p>Aún no hay cobradores registrados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
