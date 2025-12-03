import React, { useEffect, useState } from 'react';
import axios from '../api/client';
import useDebounced from '../hooks/useDebounced';
import DonorAutocomplete from '../components/DonorAutocomplete';
import DonorCreateModal from '../components/DonorCreateModal';

export default function Donations() {
  const [donorId, setDonorId] = useState('');
  const [selectedDonorName, setSelectedDonorName] = useState('');
  const [selectedDonorObs, setSelectedDonorObs] = useState('');
  const [openCreateDonor, setOpenCreateDonor] = useState(false);

  const [lookups, setLookups] = useState({ currencies: [], minian: [], donationConcepts: [], destinations: [] });
  const [currency, setCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [minian, setMinian] = useState('');
  const [concept, setConcept] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [perasha, setPerasha] = useState('');
  const [perashaSuggestions, setPerashaSuggestions] = useState([]);
  const debouncedPerasha = useDebounced(perasha, 300);
  const [comment, setComment] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    axios.get(`/api/lookups`).then(r => {
      setLookups(r.data);
      setCurrency(r.data.currencies?.[0] || '');
      setMinian(r.data.minian?.[0] || '');
      setConcept(r.data.donationConcepts?.[0] || '');
      setDestination(r.data.destinations?.[0] || '');
    });
  }, []);

  useEffect(() => {
    axios.get(`/api/autocomplete/perashot`, { params: { q: debouncedPerasha || '', limit: 8 } })
      .then(r => setPerashaSuggestions(r.data || []))
      .catch(() => setPerashaSuggestions([]));
  }, [debouncedPerasha]);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const createDonation = async () => {
    if (!donorId) { setErrorMsg('Seleccione o cree un donante primero'); return; }
    const amt = parseInt((amount || '').toString().replace(/[^0-9]/g, ''), 10) || 0;
    if (!isFinite(amt) || amt <= 0) { setErrorMsg('Ingrese un monto entero válido (> 0)'); return; }
    if (!perasha || !perasha.trim()) { setErrorMsg('La Perashá no puede estar vacía'); return; }
    try {
      await axios.post(`/api/donations`, {
        donorId,
        currency,
        amount: amt,
        donationDate: date,
        perasha,
        minian,
        concept,
        destination,
        comment
      });
      setSuccessMsg('Donación creada');
      setErrorMsg('');
      // preparar formulario para una nueva entrada: mantener Perashá y Fecha
      setDonorId('');
      setSelectedDonorName('');
      setSelectedDonorObs('');
      setAmount('');
      setComment('');
      // mover el Concepto al siguiente valor de la lista (cíclico)
      setConcept(prev => {
        const list = lookups?.donationConcepts || [];
        if (!list.length) return prev;
        const idx = list.indexOf(prev);
        return list[(idx >= 0 ? (idx + 1) % list.length : 0)];
      });
    } catch (e) {
      setErrorMsg('No se pudo crear la donación');
    }
  };

  return (
    <div>
      <h3>Donaciones</h3>
      {successMsg && <div className="alert success" role="status" style={{marginTop:8}}>{successMsg}</div>}
      {errorMsg && <div className="alert danger" role="alert" style={{marginTop:8}}>{errorMsg}</div>}
      {/* Upper section: Fecha, Perashá, Minián, Destino */}
      <div className="form-grid" style={{marginTop:10}}>
        <label htmlFor="donation-date">Fecha</label>
        <input id="donation-date" type="date" value={date} onChange={e=>setDate(e.target.value)} />

        <label htmlFor="donation-perasha">Perashá</label>
        <div>
          <input id="donation-perasha" list="perasha-list" placeholder="Perashá" value={perasha} onChange={e=>setPerasha(e.target.value)} />
          <datalist id="perasha-list">
            {perashaSuggestions.map((s, i) => (<option key={i} value={s} />))}
          </datalist>
        </div>

        <label htmlFor="donation-minian">Minián</label>
        <select id="donation-minian" value={minian} onChange={e=>setMinian(e.target.value)}>
          {lookups.minian.map(m => (<option key={m} value={m}>{m}</option>))}
        </select>

        <label htmlFor="donation-destination">Destino</label>
        <select id="donation-destination" value={destination} onChange={e=>setDestination(e.target.value)}>
          {lookups.destinations.map(d => (<option key={d} value={d}>{d}</option>))}
        </select>
      </div>

      <hr style={{ marginTop: 16, marginBottom: 16, border: 'none', borderTop: '1px solid #e5e5e5' }} />

      {/* Bottom section: Donante, Concepto, Monto, Comentarios (Moneda stays with Monto) */}
      <div style={{marginTop:16}}>
        <div style={{marginBottom:8, display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0}}>
            <label style={{fontWeight:600, minWidth:140}}>Donante</label>
            <div style={{display:'flex', alignItems:'center', gap:8, minWidth:0}}>
              <DonorAutocomplete
                value={donorId}
                onChange={(id, donor)=>{
                  setDonorId(id);
                  const name = (donor?.fullName) || `${donor?.firstName || ''}${donor?.lastName ? ' ' + donor.lastName : ''}`.trim();
                  setSelectedDonorName(name);
                  setSelectedDonorObs(donor?.observations || '');
                }}
                style={donorId ? { boxShadow: '0 0 0 3px rgba(82,196,26,.35)', borderRadius: 6 } : {}}
              />
              <div
                aria-live="polite"
                role="status"
                style={{
                  display:'flex',
                  alignItems:'center',
                  gap:8,
                  marginLeft:8,
                  padding:'8px 12px',
                  background: donorId ? '#f6ffed' : '#fafafa',
                  border: donorId ? '2px solid #52c41a' : '1px solid #e5e5e5',
                  color:'#1f1f1f',
                  borderRadius:8,
                  boxShadow: donorId ? '0 2px 10px rgba(82,196,26,.25)' : 'none',
                  minHeight:40,
                  maxWidth: 520
                }}
                title={selectedDonorObs || undefined}
              >
                <span
                  style={{
                    display:'inline-flex',
                    alignItems:'center',
                    justifyContent:'center',
                    width:24,
                    height:24,
                    borderRadius:'50%',
                    background: donorId ? '#52c41a' : '#d9d9d9',
                    color:'#fff',
                    fontWeight:700
                  }}
                  aria-hidden="true"
                >✓</span>
                <div style={{display:'flex', flexDirection:'column'}}>
                  <span style={{fontWeight:700}}>{selectedDonorName || '— Sin donante seleccionado —'}</span>
                  {!!selectedDonorObs && <span style={{fontSize:12, color:'#595959'}}>{selectedDonorObs.length > 100 ? selectedDonorObs.slice(0,100) + '…' : selectedDonorObs}</span>}
                </div>
              </div>
            </div>
          </div>
          <button
            className="primary"
            onClick={()=>setOpenCreateDonor(true)}
            style={{ padding:'8px 12px', whiteSpace:'nowrap' }}
          >
            Crear donante
          </button>
        </div>
      </div>

      <div className="form-grid" style={{marginTop:10}}>
        <label htmlFor="donation-concept">Concepto</label>
        <select id="donation-concept" value={concept} onChange={e=>setConcept(e.target.value)}>
          {lookups.donationConcepts.map(c => (<option key={c} value={c}>{c}</option>))}
        </select>

        <label htmlFor="donation-amount">Monto</label>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <input
            id="donation-amount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Monto"
            value={amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
            onChange={e=>{
              const digits = (e.target.value || '').toString().replace(/[^0-9]/g, '');
              setAmount(digits);
            }}
            style={{ flex:'0 1 220px' }}
          />
          {(() => {
            const cur = (currency || '').toString();
            const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
            const style = {
              padding: '6px 10px',
              border: isUsd ? '1px solid #a7f3d0' : '1px solid #d6e4ff',
              background: isUsd ? '#ecfdf5' : '#f0f5ff',
              color: isUsd ? '#065f46' : '#1d39c4',
              borderRadius: 6,
              fontWeight: 600
            };
            return (
              <select
                aria-label="Moneda"
                id="donation-currency"
                value={currency}
                onChange={e=>setCurrency(e.target.value)}
                style={style}
                title="Moneda"
              >
                {lookups.currencies.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
            );
          })()}
          <div style={{ display:'inline-flex', gap:6 }}>
            {[
              { label: '+1.000', inc: 1000 },
              { label: '+10.000', inc: 10000 },
              { label: '+18.000', inc: 18000 },
              { label: '+26.000', inc: 26000 },
              { label: '+52.000', inc: 52000 },
              { label: '+100.000', inc: 100000 }
            ].map(btn => (
              <button
                key={btn.label}
                type="button"
                aria-label={`Sumar ${btn.label.replace('+','')}`}
                onClick={()=>{
                  const current = parseInt((amount || '0'), 10) || 0;
                  const next = current + btn.inc;
                  setAmount(String(next));
                }}
                style={{
                  padding:'6px 10px',
                  border:'1px solid #d9d9d9',
                  background:'#fafafa',
                  borderRadius:6,
                  cursor:'pointer',
                  fontWeight:600
                }}
              >{btn.label}</button>
            ))}
            <button
              type="button"
              aria-label="Borrar monto"
              onClick={()=>setAmount('')}
              style={{
                padding:'6px 10px',
                border:'1px solid #d9d9d9',
                background:'#fff1f0',
                borderRadius:6,
                cursor:'pointer',
                fontWeight:600,
                color:'#cf1322'
              }}
            >Borrar</button>
          </div>
        </div>


        <label htmlFor="donation-comment">Comentarios</label>
        <textarea id="donation-comment" placeholder="Comentarios" value={comment} onChange={e=>setComment(e.target.value)} style={{minWidth:220}} />
        <button
          type="button"
          onClick={createDonation}
          style={{
            padding: '12px 18px',
            background: '#52c41a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            cursor: 'pointer'
          }}
        >
          Crear donación
        </button>
      </div>

      <DonorCreateModal
        open={openCreateDonor}
        onClose={()=>setOpenCreateDonor(false)}
        onCreated={(donor)=>{ setDonorId(donor.id); setSelectedDonorName(donor.fullName || `${donor.firstName}${donor.lastName ? ' ' + donor.lastName : ''}`); }}
      />
    </div>
  );
}
