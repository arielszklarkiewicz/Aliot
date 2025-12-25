import React, { useEffect, useState } from 'react';
import axios from '../api/client';

export default function AuditLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [userFilter, setUserFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;
  
  // Users list for filter dropdown
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadActivities();
  }, [page, userFilter, entityFilter, fromDate, toDate]);

  const loadUsers = async () => {
    try {
      const { data } = await axios.get('/api/admin/users', { params: { pageSize: 100 } });
      setUsers(data.items || []);
    } catch (e) {
      console.error('Error loading users:', e);
    }
  };

  const loadActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize };
      if (userFilter) params.userId = userFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      
      const { data } = await axios.get('/api/admin/audit-log', { params });
      setActivities(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError('Error loading audit log');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    loadActivities();
  };

  const handleClearFilters = () => {
    setUserFilter('');
    setEntityFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadge = (action) => {
    const classes = {
      'Created': 'badge-success',
      'Updated': 'badge-info',
      'Deleted': 'badge-error'
    };
    return classes[action] || 'badge-secondary';
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Registro de Actividad</h1>
          <p className="hero-subtitle">Auditoría de todas las operaciones del sistema</p>
        </div>
      </div>

      <div className="content-wrapper">
        {/* Filters */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="userFilter">Usuario</label>
              <select 
                id="userFilter"
                className="form-select" 
                value={userFilter} 
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="">Todos los usuarios</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="entityFilter">Entidad</label>
              <select 
                id="entityFilter"
                className="form-select" 
                value={entityFilter} 
                onChange={(e) => setEntityFilter(e.target.value)}
              >
                <option value="">Todas las entidades</option>
                <option value="Donation">Donación</option>
                <option value="Payment">Pago</option>
                <option value="Donor">Donante</option>
                <option value="Concept">Concepto</option>
                <option value="Destination">Destino</option>
                <option value="Collector">Cobrador</option>
                <option value="User">Usuario</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fromDate">Fecha Desde</label>
              <input
                id="fromDate"
                type="date"
                className="form-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="toDate">Fecha Hasta</label>
              <input
                id="toDate"
                type="date"
                className="form-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleFilter}>
                <span>🔍</span> Filtrar
              </button>
              <button className="btn btn-ghost" onClick={handleClearFilters} style={{ marginLeft: '8px' }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {/* Results summary */}
        <div className="info-card">
          <p>
            Mostrando <strong>{activities.length}</strong> de <strong>{total}</strong> actividades
            {(userFilter || entityFilter || fromDate || toDate) && ' (filtrado)'}
          </p>
        </div>

        {loading ? (
          <div className="loading-state">Cargando actividades...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Usuario</th>
                    <th>Entidad</th>
                    <th>Acción</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, index) => (
                    <tr key={index}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatTimestamp(activity.timestamp)}</td>
                      <td>
                        <div>
                          <strong>{activity.userName}</strong>
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>{activity.userEmail}</div>
                      </td>
                      <td>{activity.entity}</td>
                      <td>
                        <span className={`badge ${getActionBadge(activity.action)}`}>
                          {activity.action}
                        </span>
                      </td>
                      <td>{activity.details}</td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        <p>No se encontraron actividades</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Anterior
                </button>
                <span className="pagination-info">
                  Página {page} de {totalPages}
                </span>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
