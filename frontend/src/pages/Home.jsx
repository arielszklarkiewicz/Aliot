import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/client';

export default function Home() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    axios.get(`/healthz`).then(r => setHealth(r.data)).catch(() => setHealth({ status: 'error' }));
  }, []);
  
  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Sistema de Donaciones Ieshiva</h1>
          <p className="hero-subtitle">Gestión integral de donaciones y pagos</p>
        </div>
      </div>

      <div className="content-wrapper">

        {/* Status Card */}
        <div className="stats-container" style={{ gridTemplateColumns: '1fr' }}>
          <div className="stat-card">
            <div className="stat-icon green">
              <span style={{ fontSize: '1.5rem' }}>✓</span>
            </div>
            <div className="stat-content">
              <div className="stat-label">Estado del Sistema</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {health ? (health.status === 'Healthy' ? 'Operativo' : 'Error') : 'Cargando...'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="form-container">
          <h3 style={{ marginBottom: '1rem' }}>Accesos Rápidos</h3>
          <div className="form-grid">
            <Link to="/donations/list" className="mobile-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="mobile-card-title">Listado de Donaciones</div>
              <p style={{ marginTop: '0.5rem', color: 'var(--neutral-600)' }}>Ver todas las donaciones registradas</p>
            </Link>
            <Link to="/donors/summary" className="mobile-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="mobile-card-title">Resumen de Donante</div>
              <p style={{ marginTop: '0.5rem', color: 'var(--neutral-600)' }}>Consultar historial de un donante</p>
            </Link>
            <Link to="/admin/donors" className="mobile-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="mobile-card-title">Administrar Donantes</div>
              <p style={{ marginTop: '0.5rem', color: 'var(--neutral-600)' }}>Gestionar donantes del sistema</p>
            </Link>
            <Link to="/reports/donor-balances" className="mobile-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="mobile-card-title">Saldos por Donante</div>
              <p style={{ marginTop: '0.5rem', color: 'var(--neutral-600)' }}>Ver balances de donantes</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
