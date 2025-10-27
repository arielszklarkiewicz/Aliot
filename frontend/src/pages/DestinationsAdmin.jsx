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
      setError(e?.response?.data?.error || 'No se pudo guardar');
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
            <button onClick={()=>setEditing(true)}>Editar</button>
            <button className="button-danger" onClick={()=>onDelete(item)} style={{marginLeft:8}}>Eliminar</button>
          </>
        ) : (
          <>
            <button onClick={save} disabled={busy} className="primary">Guardar</button>
            <button onClick={()=>{ setEditing(false); setName(item.name); }} className="button-ghost" style={{marginLeft:8}}>Cancelar</button>
          </>
        )}
      </td>
    </tr>
  );
}

export default function DestinationsAdmin() {
  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.get('/api/admin/destinations');
      setItems(data.items || []);
    } catch (e) {
      setError('Error al cargar destinos');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    const name = newName.trim(); if (!name) return;
    try {
      await axios.post('/api/admin/destinations', { name });
      setNewName('');
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'No se pudo agregar');
    }
  };

  const save = async (updated) => {
    await axios.put(`/api/admin/destinations/${updated.id}`, updated);
    await load();
  };

  const remove = async (it) => {
    if (!confirm(`¿Eliminar destino \"${it.name}\"?`)) return;
    try {
      await axios.delete(`/api/admin/destinations/${it.id}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'No se pudo eliminar');
    }
  };

  return (
    <div>
      <h3>Administrar Destinos</h3>
      <div className="toolbar">
        <div className="row">
          <input placeholder="Nuevo destino" value={newName} onChange={e=>setNewName(e.target.value)} />
          <button onClick={add} className="primary">Agregar</button>
        </div>
      </div>
      {error && <div className="alert danger" role="alert" style={{marginTop:10}}>{error}</div>}
      <div className="section" style={{marginTop:12}}>
        {loading ? (
          <div>Cargando…</div>
        ) : (
          <table>
            <thead><tr><th>Nombre</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
            <tbody>
              {items.map(it => (
                <Row key={it.id} item={it} onSave={save} onDelete={remove} />
              ))}
              {items.length === 0 && (
                <tr><td colSpan={2} className="muted">Aún no hay destinos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
