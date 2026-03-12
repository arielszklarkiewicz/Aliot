import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';

export default function UsersAdmin() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [searchEmail, setSearchEmail] = useState('');
  const [searchFullName, setSearchFullName] = useState('');
  const [hideDonors, setHideDonors] = useState(false);

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
  
  // Filter items client-side
  const filteredItems = useMemo(() => {
    return items.filter(u => {
      if (hideDonors && u.role === 'Donor') return false;
      if (searchEmail && !u.email.toLowerCase().includes(searchEmail.toLowerCase())) return false;
      if (searchFullName && !u.fullName?.toLowerCase().includes(searchFullName.toLowerCase())) return false;
      return true;
    });
  }, [items, hideDonors, searchEmail, searchFullName]);

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
          fullName: edit.fullName,
          email: edit.email
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

  const toggleCanSendMessage = async (id) => {
    try {
      await axios.post(`/api/admin/users/${id}/toggle-can-send-message`);
      await load();
    } catch (e) {
      alert('No se pudo cambiar el permiso de mensajería');
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
      
      if (changingPassword.role === 'Donor') {
        alert(`Contraseña cambiada exitosamente\n\nUsuario: ${changingPassword.email}\nContraseña: ${newPassword}\n\nPor favor, comunique estas credenciales al donante de forma segura.`);
      } else {
        alert('Contraseña cambiada exitosamente');
      }
      
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
    ReadOnly: 'Solo Lectura',
    Donor: 'Donante'
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
        
        {/* Filters */}
        <div className="form-section" style={{ marginBottom: '20px' }}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="search-email">Buscar por Email</label>
              <input
                id="search-email"
                type="text"
                placeholder="Buscar email..."
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="search-fullname">Buscar por Nombre Completo</label>
              <input
                id="search-fullname"
                type="text"
                placeholder="Buscar nombre..."
                value={searchFullName}
                onChange={e => setSearchFullName(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hideDonors}
                onChange={e => setHideDonors(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600 }}>Ocultar usuarios con rol Donante</span>
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre Completo</th>
                <th>Donante</th>
                <th>Rol</th>
                <th>Contraseña</th>
                <th>Estado</th>
                <th>Mensajes</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="9" style={{textAlign:'center', padding:'20px'}}>Cargando...</td></tr>
              )}
              {!loading && filteredItems.length === 0 && (
                <tr><td colSpan="9" style={{textAlign:'center', padding:'20px'}}>No hay usuarios</td></tr>
              )}
              {!loading && filteredItems.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.fullName}</td>
                  <td>
                    {u.role === 'Donor' && (u.donorFirstName || u.donorLastName) ? (
                      <span style={{ color: '#1e40af', fontWeight: 500 }}>
                        {u.donorFirstName} {u.donorLastName || ''}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${u.role === 'Admin' ? 'primary' : u.role === 'DataEntry' ? 'success' : u.role === 'Donor' ? 'warning' : 'secondary'}`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    {u.role === 'Donor' ? (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                        (usar cambiar contraseña para ver nueva)
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>●●●●●●</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${u.isActive ? 'success' : 'danger'}`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${u.canSendMessage ? 'success' : 'danger'}`}>
                      {u.canSendMessage ? 'Habilitado' : 'Deshabilitado'}
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
                      <button 
                        className={`btn btn-sm ${u.canSendMessage ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => toggleCanSendMessage(u.id)}
                        title={u.canSendMessage ? 'Deshabilitar mensajes' : 'Habilitar mensajes'}
                      >
                        {u.canSendMessage ? '💬' : '🔇'}
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
                Usuario: <strong>{changingPassword.email}</strong> ({roleLabels[changingPassword.role] || changingPassword.role})
              </p>
              {changingPassword.role === 'Donor' && (
                <div style={{ padding: '12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
                    💡 Para donantes, se recomienda usar una contraseña numérica de 6 dígitos
                  </p>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="new-password">Nueva Contraseña</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="new-password"
                    type="text"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={changingPassword.role === 'Donor' ? "Ej: 123456" : "Nueva contraseña"}
                    style={{ flex: 1 }}
                  />
                  {changingPassword.role === 'Donor' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setNewPassword(Math.floor(100000 + Math.random() * 900000).toString())}
                      title="Generar contraseña de 6 dígitos"
                    >
                      🎲 Generar
                    </button>
                  )}
                </div>
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
