import React, { useEffect, useState } from 'react';
import axios from '../api/client';
import { formatCurrency, getCurrencyStyle, getCurrencyColor } from '../utils/currency';

export default function DonorBalances() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get('/api/reports/donor-balances');
        setItems(data.items || []);
      } catch (e) {
        setError('No se pudieron cargar los saldos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Saldos por Donante</h1>
          <p className="hero-subtitle">Balance de donaciones y pagos por donante</p>
        </div>
      </div>

      <div className="content-wrapper">
      {loading && <div className="loading-state">Cargando saldos...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Donante</th>
                <th>Destino</th>
                <th>Moneda</th>
                <th style={{ textAlign: 'right' }}>Donaciones</th>
                <th style={{ textAlign: 'right' }}>Pagos</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <p>No hay saldos registrados</p>
                  </td>
                </tr>
              )}
              {items.map((r, i) => (
                <tr key={`${r.donorId}-${r.currency}-${i}`}>
                  <td><strong>{r.donorName}</strong></td>
                  <td>{r.destino || '—'}</td>
                  <td>
                    {(() => {
                      const cur = (r.currency || '').toString();
                      const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                      const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                      const label = curNorm === 'pesos' ? 'Pesos' : (curNorm === 'dolares' ? 'Dólares' : r.currency);
                      const color = getCurrencyColor(r.currency);
                      return (
                        <span className="badge" style={{ 
                          backgroundColor: isUsd ? '#d1fae5' : '#dbeafe',
                          color: color,
                          fontWeight: 500
                        }}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={getCurrencyStyle(r.currency)}>{formatCurrency(r.donationsTotal, r.currency)}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={getCurrencyStyle(r.currency)}>{formatCurrency(r.paymentsTotal, r.currency)}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={getCurrencyStyle(r.currency)}>{formatCurrency(r.saldo, r.currency)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
