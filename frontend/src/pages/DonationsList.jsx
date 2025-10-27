import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import DonorAutocomplete from '../components/DonorAutocomplete';
import useDebounced from '../hooks/useDebounced';

export default function DonationsList() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [donorId, setDonorId] = useState('');
  const [destination, setDestination] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [perasha, setPerasha] = useState('');
  const [includeOccasional, setIncludeOccasional] = useState(true);
  const debouncedPerasha = useDebounced(perasha, 300);

  const [perashaSuggestions, setPerashaSuggestions] = useState([]);
  const [lookups, setLookups] = useState({ destinations: [] });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/lookups').then(r => {
      setLookups({ destinations: r.data.destinations || [] });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!debouncedPerasha) { setPerashaSuggestions([]); return; }
    axios.get('/api/autocomplete/perashot', { params: { q: debouncedPerasha, limit: 8 } })
      .then(r => setPerashaSuggestions(r.data || []))
      .catch(() => setPerashaSuggestions([]));
  }, [debouncedPerasha]);

  async function load() {
    setLoading(true); setError('');
    try {
      const params = {
        page,
        pageSize,
        destination: destination || undefined,
        donorId: donorId || undefined,
        isOccasionalDonor: includeOccasional ? undefined : false,
        from: from || undefined,
        to: to || undefined,
      };
      // perasha is not part of the backend filter signature; we can approximate by client-side filter if needed.
      const { data } = await axios.get('/api/donations', { params });
      let list = data.items || [];
      if (perasha && perasha.trim()) {
        const p = perasha.trim().toLowerCase();
        list = list.filter(x => (x.perasha || '').toLowerCase().includes(p));
      }
      setItems(list);
      setTotal(data.total || list.length || 0);
    } catch (e) {
      setError('Failed to load donations');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize, donorId, destination, from, to, debouncedPerasha, includeOccasional]);

  const clearFilters = () => {
    setDonorId(''); setDestination(''); setFrom(''); setTo(''); setPerasha(''); setIncludeOccasional(true); setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  return (
    <div>
      <h3>Listado de donaciones</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(160px, 1fr))', gap: 8, alignItems: 'end', marginBottom: 12 }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Donante</label>
          <DonorAutocomplete value={donorId} onChange={(id)=>{ setDonorId(id); setPage(1); }} placeholder="Buscar donante" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Desde</label>
          <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1); }} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Hasta</label>
          <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1); }} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Perashá</label>
          <input list="perasha-sugg" placeholder="Perashá" value={perasha} onChange={e=>{ setPerasha(e.target.value); setPage(1); }} style={{ width: '100%' }} />
          <datalist id="perasha-sugg">
            {perashaSuggestions.map((s, i) => (<option key={i} value={s} />))}
          </datalist>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Destino</label>
          <select value={destination} onChange={e=>{ setDestination(e.target.value); setPage(1); }} style={{ width: '100%' }}>
            <option value="">Todos</option>
            {lookups.destinations.map(d => (<option key={d} value={d}>{d}</option>))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Incluir donantes ocasionales</label>
          <input type="checkbox" checked={includeOccasional} onChange={e=>{ setIncludeOccasional(e.target.checked); setPage(1); }} />
        </div>
        <div>
          <button onClick={clearFilters} style={{ width: '100%', height: 32 }}>Limpiar</button>
        </div>
      </div>

      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {!loading && (
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#fafafa' }}>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Fecha</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Donante</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 10 }}>Monto</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Moneda</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Minián</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Concepto</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Destino</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Perashá</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Comentario</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 18, textAlign: 'center', color: '#666' }}>No se encontraron donaciones</td>
                </tr>
              )}
              {items.map((d, idx) => {
                const cur = (d.currency || '').toString();
                const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                return (
                  <tr key={d.id} style={{ background: idx % 2 ? '#fcfcfc' : '#fff' }}>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.donationDate}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.donorName || '—'}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{typeof d.amount === 'number' ? new Intl.NumberFormat('es-AR').format(Math.round(d.amount)) : d.amount}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>
                      <span style={{ display:'inline-block', padding: '2px 8px', background: isUsd ? '#ecfdf5' : '#f0f5ff', border: isUsd ? '1px solid #a7f3d0' : '1px solid #d6e4ff', color: isUsd ? '#065f46' : '#1d39c4', borderRadius: 999, fontSize: 12 }}>
                        {d.currency}
                      </span>
                    </td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.minian}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.concept}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.destination === 'Other' ? 'Otro' : d.destination}{d.destination === 'Other' && d.destinationOther ? ` (${d.destinationOther})` : ''}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10 }}>{d.perasha || '—'}</td>
                    <td style={{ borderBottom: '1px solid #f6f6f6', padding: 10, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.comment || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1, p-1))}>Anterior</button>
        <span>Página {page} / {totalPages}</span>
        <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages, p+1))}>Siguiente</button>
        <select value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); }}>
          {[10,20,50].map(s => (<option key={s} value={s}>{s} / página</option>))}
        </select>
        <span style={{ marginLeft: 'auto' }}>Total: {total}</span>
      </div>
    </div>
  );
}
