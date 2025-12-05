import React, { useEffect, useState } from 'react';
import axios from '../api/client';

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

  const fmt = (n) => (n ?? 0).toLocaleString('es-AR');

  return (
    <div>
      <h3>Saldos por Donante</h3>
      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {!loading && !error && (
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#fafafa' }}>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Donante</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Destino</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Moneda</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 10 }}>Donaciones</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 10 }}>Pagos</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 10 }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 12, textAlign: 'center', color: '#666' }}>Sin saldos</td></tr>
              )}
              {items.map((r, i) => (
                <tr key={`${r.donorId}-${r.currency}-${i}`}>
                  <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{r.donorName}</td>
                  <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{r.destino || '-'}</td>
                  <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>
                    {(() => {
                      const cur = (r.currency || '').toString();
                      const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                      const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                      const label = curNorm === 'pesos' ? 'Pesos' : (curNorm === 'dolares' ? 'Dolares' : r.currency);
                      return (
                        <span style={{ display:'inline-block', padding: '2px 8px', background: isUsd ? '#ecfdf5' : '#f0f5ff', border: isUsd ? '1px solid #a7f3d0' : '1px solid #d6e4ff', color: isUsd ? '#065f46' : '#1d39c4', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10, textAlign: 'right' }}>{fmt(r.donationsTotal)}</td>
                  <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10, textAlign: 'right' }}>{fmt(r.paymentsTotal)}</td>
                  <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10, textAlign: 'right', fontWeight: 700 }}>{fmt(r.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
