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
  const [matana, setMatana] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    axios.get(`/api/lookups`).then(r => {
      setLookups(r.data);
      setCurrency(r.data.currencies?.[0] || '');
      setMinian(r.data.minian?.[0] || '');
      setConcept(r.data.donationConcepts?.[0]?.id || '');
      setDestination(r.data.destinations?.[0]?.id || '');
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
    if (!matana) {
      const amt = parseInt((amount || '').toString().replace(/[^0-9]/g, ''), 10) || 0;
      if (!isFinite(amt) || amt <= 0) { setErrorMsg('Ingrese un monto entero válido (> 0)'); return; }
    }
    if (!perasha || !perasha.trim()) { setErrorMsg('La Perashá no puede estar vacía'); return; }
    try {
      await axios.post(`/api/donations`, {
        donorId,
        currency,
        amount: matana ? 0 : (parseInt((amount || '').toString().replace(/[^0-9]/g, ''), 10) || 0),
        donationDate: date,
        perasha,
        minian,
        conceptId: concept,
        destinationId: destination,
        comment,
        matana
      });
      setSuccessMsg('Donación creada');
      setErrorMsg('');
      // preparar formulario para una nueva entrada: mantener Perashá y Fecha
      setDonorId('');
      setSelectedDonorName('');
      setSelectedDonorObs('');
      setAmount('');
      setComment('');
      setMatana(false);
      // mover el Concepto al siguiente valor de la lista (cíclico)
      setConcept(prev => {
        const list = lookups?.donationConcepts || [];
        if (!list.length) return prev;
        const idx = list.findIndex(c => c.id === prev);
        return list[(idx >= 0 ? (idx + 1) % list.length : 0)]?.id || prev;
      });
    } catch (e) {
      setErrorMsg('No se pudo crear la donación');
    }
  };

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Nueva Donación</h1>
          <p className="hero-subtitle">Registre una nueva donación en el sistema</p>
        </div>
      </div>

      <div className="content-wrapper">
        {successMsg && <div className="alert success" role="status">{successMsg}</div>}
        {errorMsg && <div className="alert danger" role="alert">{errorMsg}</div>}
        {/* Upper section: Fecha, Perashá, Minián, Destino */}
        <div className="form-container">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="donation-date">Fecha</label>
            <input id="donation-date" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="donation-perasha">Perashá</label>
            <div>
              <input id="donation-perasha" list="perasha-list" placeholder="Perashá" value={perasha} onChange={e=>setPerasha(e.target.value)} />
              <datalist id="perasha-list">
                {perashaSuggestions.map((s, i) => (<option key={i} value={s} />))}
              </datalist>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="donation-minian">Minián</label>
            <select id="donation-minian" value={minian} onChange={e=>setMinian(e.target.value)}>
              {lookups.minian.map(m => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="donation-destination">Destino</label>
            <select id="donation-destination" value={destination} onChange={e=>setDestination(e.target.value)}>
              {lookups.destinations.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
        </div>

        <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--neutral-200)' }} />

        {/* Bottom section: Donante, Concepto, Monto, Comentarios */}
        <div style={{marginBottom:16}}>
          <div style={{marginBottom:8, display:'flex', alignItems:'center', gap:8, justifyContent:'space-between', flexWrap:'wrap'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0, flexWrap:'wrap'}}>
              <label style={{fontWeight:600, minWidth:100}}>Donante</label>
              <div style={{display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1}}>
                <DonorAutocomplete
                  id="donor-autocomplete"
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
              type="button"
              className="btn btn-secondary"
              onClick={()=>setOpenCreateDonor(true)}
              style={{ whiteSpace:'nowrap' }}
              aria-label="Crear nuevo donante"
            >
              Crear donante
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="donation-concept">Concepto</label>
            <select id="donation-concept" value={concept} onChange={e=>setConcept(e.target.value)}>
              {lookups.donationConcepts.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="donation-amount">Monto</label>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <input
                id="donation-amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={matana ? "Matana - Sin monto" : "Monto"}
                value={matana ? '' : (amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '')}
                onChange={e=>{
                  const digits = (e.target.value || '').toString().replace(/[^0-9]/g, '');
                  setAmount(digits);
                }}
                style={{ flex:'0 1 220px' }}
                disabled={matana}
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
              <div style={{ display:'inline-flex', gap:6, flexWrap:'wrap' }}>
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
                    disabled={matana}
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
                  disabled={matana}
                >Borrar</button>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={matana}
                  onChange={e => {
                    setMatana(e.target.checked);
                    if (e.target.checked) setAmount('');
                  }}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600 }}>Matana (sin precio)</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="donation-comment">Comentarios</label>
            <textarea id="donation-comment" placeholder="Comentarios" value={comment} onChange={e=>setComment(e.target.value)} style={{minWidth:220}} />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-success btn-lg"
            onClick={createDonation}
            aria-label="Crear nueva donación"
          >
            Crear donación
          </button>
        </div>
        </div>

        <DonorCreateModal
          open={openCreateDonor}
          onClose={()=>setOpenCreateDonor(false)}
          onCreated={(donor)=>{ setDonorId(donor.id); setSelectedDonorName(donor.fullName || `${donor.firstName}${donor.lastName ? ' ' + donor.lastName : ''}`); }}
        />
      </div>
    </div>
  );
}
