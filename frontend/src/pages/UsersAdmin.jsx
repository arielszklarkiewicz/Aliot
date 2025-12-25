import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';

export default function UsersAdmin() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [edit, setEdit] = useState(null);
  const isNew = useMemo(() => edit && !edit.id, [edit]);
  
  const [changingPassword, setChangingPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const { data } = await axios.get('/api/admin/users', { params: { page, pageSize } });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError('No se pudieron cargar los usuarios');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize]);

  const startNew = () => setEdit({ email: '', password: '', fullName: '', role: 'DataEntry' });
  const startEdit = (u) => setEdit({ ...u, password: '' });
  const cancelEdit = () => setEdit(null);

  const save = async () => {
    if (!edit?.email?.trim()) { alert('El email es obligatorio'); return; }
    if (!edit?.fullName?.trim()) { alert('El nombre completo es obligatorio'); return; }
    if (isNew && !edit?.password?.trim()) { alert('La contraseña es obligatoria'); return; }
    
    try {
      if (isNew) {
        const roleMap = { Admin: 1, DataEntry: 2, ReadOnly: 3 };
        await axios.post('/api/auth/users', {
          email: edit.email,
          password: edit.password,
          fullName: edit.fullName,
          role: roleMap[edit.role] || 2
        });
      } else {
        await axios.put(`/api/admin/users/${edit.id}`, {
          fullName: edit.fullName
        });
      }
      setEdit(null);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'No se pudo guardar el usuario');
    }
  };

  const del = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'No se pudo eliminar el usuario');
    }
  };

  const toggleActive = async (id) => {
    try {
      await axios.post(`/api/admin/users/${id}/toggle-active`);
      await load();
    } catch (e) {
      alert('No se pudo cambiar el estado del usuario');
    }
  };

  const openChangePassword = (user) => {
    setChangingPassword(user);
    setNewPassword('');
  };

  const changePassword = async () => {
    if (!newPassword?.trim()) { alert('La contraseña no puede estar vacía'); return; }
    try {
      await axios.post(`/api/admin/users/${changingPassword.id}/change-password`, {
        userId: changingPassword.id,
        newPassword
      });
      alert('Contraseña cambiada exitosamente');
      setChangingPassword(null);
      setNewPassword('');
    } catch (e) {
      alert('No se pudo cambiar la contraseña');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const roleLabels = {
    Admin: 'Administrador',
    DataEntry: 'Entrada de Datos',
    ReadOnly: 'Solo Lectura'
  };

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Administración de Usuarios</h1>
          <p className="hero-subtitle">Gestione los usuarios del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={startNew}>
          <span>➕</span> Nuevo usuario
        </button>
      </div>

      <div className="content-wrapper">
        {error && <div className="alert alert-error">{error}</div>}

        {/* Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre Completo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>Cargando...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>No hay usuarios</td></tr>
              )}
              {!loading && items.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.fullName}</td>
                  <td>
                    <span className={`badge badge-${u.role === 'Admin' ? 'primary' : u.role === 'DataEntry' ? 'success' : 'secondary'}`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${u.isActive ? 'success' : 'danger'}`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{display:'flex', gap:8}}>
                      <button className="btn btn-sm btn-secondary" onClick={() => startEdit(u)} title="Editar">✏️</button>
                      <button className="btn btn-sm btn-warning" onClick={() => openChangePassword(u)} title="Cambiar contraseña">🔑</button>
                      <button 
                        className={`btn btn-sm ${u.isActive ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => toggleActive(u.id)}
                        title={u.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {u.isActive ? '🚫' : '✅'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => del(u.id)} title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span className="pagination-info">Página {page} de {totalPages} · Total: {total}</span>
          <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      </div>

      {/* Edit Modal */}
      {edit && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isNew ? 'Nuevo usuario' : 'Editar usuario'}</h2>
              <button className="modal-close" onClick={cancelEdit}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  type="email"
                  value={edit.email}
                  onChange={e => setEdit({ ...edit, email: e.target.value })}
                  disabled={!isNew}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="user-fullname">Nombre Completo</label>
                <input
                  id="user-fullname"
                  type="text"
                  value={edit.fullName}
                  onChange={e => setEdit({ ...edit, fullName: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="user-role">Rol</label>
                <select
                  id="user-role"
                  value={edit.role}
                  onChange={e => setEdit({ ...edit, role: e.target.value })}
                  disabled={!isNew}
                >
                  <option value="Admin">Administrador</option>
                  <option value="DataEntry">Entrada de Datos</option>
                  <option value="ReadOnly">Solo Lectura</option>
                </select>
              </div>
              
              {isNew && (
                <div className="form-group">
                  <label htmlFor="user-password">Contraseña</label>
                  <input
                    id="user-password"
                    type="password"
                    value={edit.password}
                    onChange={e => setEdit({ ...edit, password: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelEdit}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changingPassword && (
        <div className="modal-overlay" onClick={() => setChangingPassword(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cambiar contraseña</h2>
              <button className="modal-close" onClick={() => setChangingPassword(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{marginBottom: 16}}>
                Usuario: <strong>{changingPassword.email}</strong>
              </p>
              <div className="form-group">
                <label htmlFor="new-password">Nueva Contraseña</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setChangingPassword(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={changePassword}>Cambiar contraseña</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
