import React, { useEffect, useState } from 'react';
import axios from '../api/client';
import DonorAutocomplete from '../components/DonorAutocomplete';
import DonorCreateModal from '../components/DonorCreateModal';
import '../styles/GlobalStyles.css';

export default function Payments() {
  const [donorId, setDonorId] = useState('');
  const [selectedDonorName, setSelectedDonorName] = useState('');
  const [selectedDonorObs, setSelectedDonorObs] = useState('');
  const [openCreateDonor, setOpenCreateDonor] = useState(false);

  const [lookups, setLookups] = useState({ currencies: [], destinations: [] });
  const [collectors, setCollectors] = useState([]);
  const [collectorsLoading, setCollectorsLoading] = useState(false);
  const [currency, setCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [collector, setCollector] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [comment, setComment] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    axios.get(`/api/lookups`).then(r => {
      const data = r.data || {};
      setLookups({
        currencies: data.currencies || [],
        destinations: data.destinations || []
      });
      setCurrency((data.currencies || [])[0] || '');
      setDestination((data.destinations || [])[0] || '');
    });
    loadCollectors();
    /* eslint-disable-next-line */
  }, []);

  const loadCollectors = async () => {
    setCollectorsLoading(true);
    try {
      const { data } = await axios.get('/api/admin/collectors');
      const names = (data.items || []).map(x => x.name).sort((a,b)=>a.localeCompare(b));
      setCollectors(names);
      // only set default if none selected
      setCollector(prev => prev || names[0] || '');
    } catch (e) {
      setCollectors([]);
    } finally {
      setCollectorsLoading(false);
    }
  };

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

  const createPayment = async () => {
    if (!donorId) { setErrorMsg('Seleccione o cree un donante primero'); return; }
    const amt = parseInt((amount || '').toString().replace(/[^0-9]/g, ''), 10) || 0;
    if (!isFinite(amt) || amt <= 0) { setErrorMsg('Ingrese un monto entero válido (> 0)'); return; }
    try {
      await axios.post(`/api/payments`, { donorId, currency, amount: amt, paymentDate: date, destination, collector, comment });
      setSuccessMsg('Pago creado');
      setErrorMsg('');
      // preparar formulario para una nueva entrada: restablecer campos incluyendo donante
      setDonorId('');
      setSelectedDonorName('');
      setSelectedDonorObs('');
      setAmount('');
      setComment('');
      setDate(new Date().toISOString().slice(0,10));
    } catch (e) {
      setErrorMsg('No se pudo crear el pago');
    }
  };

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Nuevo Pago</h1>
          <p className="hero-subtitle">Registre un nuevo pago en el sistema</p>
        </div>
      </div>

      <div className="content-wrapper">
        {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}
        {errorMsg && <div className="alert alert-error" role="alert">{errorMsg}</div>}
        
        <div className="form-section">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="payment-date" className="form-label">Fecha</label>
              <input id="payment-date" type="date" value={date} onChange={e=>setDate(e.target.value)} className="form-input" />
            </div>

          <div className="form-group">
            <label htmlFor="payment-destination" className="form-label">Destino</label>
            <select id="payment-destination" value={destination} onChange={e=>setDestination(e.target.value)} className="form-select">
              {lookups.destinations.map(d => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="payment-collector" className="form-label">Cobrador</label>
            <select id="payment-collector" value={collector} onChange={e=>setCollector(e.target.value)} onFocus={loadCollectors} className="form-select">
              {collectors.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </div>

        <div className="form-divider"></div>

        <div style={{marginBottom:16}}>
          <div style={{marginBottom:8, display:'flex', alignItems:'center', gap:8, justifyContent:'space-between', flexWrap:'wrap'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0, flexWrap:'wrap'}}>
              <label style={{fontWeight:600, minWidth:100}}>Donante</label>
              <div style={{display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1}}>
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
              className="btn btn-secondary"
              onClick={()=>setOpenCreateDonor(true)}
              style={{ whiteSpace:'nowrap' }}
            >
              Crear donante
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="payment-amount" className="form-label">Monto</label>
            <div className="amount-input-row">
              <input
                id="payment-amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Monto"
                value={amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                onChange={e=>{
                  const digits = (e.target.value || '').toString().replace(/[^0-9]/g, '');
                  setAmount(digits);
                }}
                className="form-input"
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
                    id="payment-currency"
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
          </div>

          <div className="form-group">
            <label htmlFor="payment-comment" className="form-label">Comentarios</label>
            <textarea id="payment-comment" placeholder="Comentarios" value={comment} onChange={e=>setComment(e.target.value)} className="form-textarea" style={{minHeight: '100px'}} />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={createPayment}
          >
            Crear Pago
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
