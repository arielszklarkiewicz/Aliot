import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function SystemMap() {
  const loc = useLocation();
  const isActive = (path) => loc.pathname === path;

  const baseLinkStyle = {
    padding: '8px 12px',
    borderRadius: 10,
    textDecoration: 'none',
    border: '1px solid #eef2f7',
    background: '#f8fafc',
    color: '#1f2a44',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 500
  };

  const activeLinkStyle = {
    color: '#1d4ed8',
    background: '#e7f1ff',
    border: '1px solid #dbeafe'
  };

  const linkStyle = (path) => ({
    ...baseLinkStyle,
    ...(isActive(path) ? activeLinkStyle : null)
  });

  return (
    <nav aria-label="Mapa del sistema" style={{display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-start', borderBottom:'1px solid var(--border)', paddingBottom:12, marginBottom:18}}>
      <div className="nav-group" style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
        <span className="nav-label pill" style={{fontSize:12, fontWeight:700, letterSpacing:.4, textTransform:'uppercase', color:'var(--muted)', padding:'6px 10px', border:'1px solid var(--border)', borderRadius:999}}>General</span>
        <Link to="/donations" style={linkStyle('/donations')}>Donaciones</Link>
        <Link to="/payments" style={linkStyle('/payments')}>Pagos</Link>
        <Link to="/donors/summary" style={linkStyle('/donors/summary')}>Resumen de donante</Link>
        <Link to="/donations/list" style={linkStyle('/donations/list')}>Listado de donaciones</Link>
        <Link to="/reports/donor-balances" style={linkStyle('/reports/donor-balances')}>Saldos por Donante</Link>
      </div>

      <div aria-hidden="true" style={{flexBasis:'100%', height:0}} />

      <div className="nav-group" style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
        <span className="nav-label pill" style={{fontSize:12, fontWeight:700, letterSpacing:.4, textTransform:'uppercase', color:'var(--muted)', padding:'6px 10px', border:'1px solid var(--border)', borderRadius:999}}>Administración</span>
        <Link to="/admin/donors" style={linkStyle('/admin/donors')}>Donantes</Link>
        <Link to="/admin/concepts" style={linkStyle('/admin/concepts')}>Conceptos</Link>
        <Link to="/admin/destinations" style={linkStyle('/admin/destinations')}>Destinos</Link>
        <Link to="/admin/collectors" style={linkStyle('/admin/collectors')}>Cobradores</Link>
      </div>

      <div style={{marginLeft:'auto', display:'flex', gap:8}}>
        <Link to="/login" style={linkStyle('/login')}>Ingresar</Link>
      </div>
    </nav>
  );
}
