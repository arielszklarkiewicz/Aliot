import React, { useEffect, useRef, useState } from 'react';
import axios from '../api/client';
import DonorAutocomplete from '../components/DonorAutocomplete';
import DonorCreateModal from '../components/DonorCreateModal';
import '../styles/GlobalStyles.css';

export default function Payments() {
  const [donorId, setDonorId] = useState('');
  const [selectedDonorName, setSelectedDonorName] = useState('');
  const [selectedDonorObs, setSelectedDonorObs] = useState('');
  const [openCreateDonor, setOpenCreateDonor] = useState(false);
  const donorAutocompleteRef = useRef(null);

  const [lookups, setLookups] = useState({ currencies: [], destinations: [] });
  const [collectors, setCollectors] = useState([]);
  const [collectorsLoading, setCollectorsLoading] = useState(false);
  const [currency, setCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [collectorId, setCollectorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [comment, setComment] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Load currencies from lookups API
    axios.get(`/api/lookups`).then(r => {
      const data = r.data || {};
      setLookups(prev => ({
        ...prev,
        currencies: data.currencies || []
      }));
      setCurrency((data.currencies || [])[0] || '');
    });
    // Load destinations and collectors from admin API
    loadDestinationsAndCollectors();
    /* eslint-disable-next-line */
  }, []);

  const loadDestinationsAndCollectors = async () => {
    try {
      const [destResp, collResp] = await Promise.all([
        axios.get('/api/admin/destinations'),
        axios.get('/api/admin/collectors')
      ]);
      const destinations = (destResp.data.items || []).sort((a,b) => a.name.localeCompare(b.name));
      const collectors = (collResp.data.items || []).sort((a,b) => a.name.localeCompare(b.name));
      
      setLookups(prev => ({ ...prev, destinations }));
      setCollectors(collectors);
      
      if (destinations.length > 0) setDestinationId(destinations[0].id);
      if (collectors.length > 0) setCollectorId(collectors[0].id);
    } catch (e) {
      console.error('Failed to load destinations/collectors', e);
    }
  };

  const loadCollectors = async () => {
    setCollectorsLoading(true);
    try {
      const { data } = await axios.get('/api/admin/collectors');
      const items = (data.items || []).sort((a,b)=>a.name.localeCompare(b.name));
      setCollectors(items);
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
    
    setSubmitting(true);
    try {
      await axios.post(`/api/payments`, { 
        donorId, 
        currency, 
        amount: amt, 
        paymentDate: date, 
        destinationId, 
        collectorId: collectorId || null, 
        comment 
      });
      setSuccessMsg('Pago creado');
      setErrorMsg('');
      // preparar formulario para una nueva entrada: restablecer campos incluyendo donante
      setDonorId('');
      setSelectedDonorName('');
      setSelectedDonorObs('');
      setAmount('');
      setComment('');
      setDate(new Date().toISOString().slice(0,10));
      setCurrency('Pesos');
      // Focus on donor autocomplete
      setTimeout(() => donorAutocompleteRef.current?.focus(), 100);
    } catch (e) {
      setErrorMsg('No se pudo crear el pago');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createPayment();
  };

  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      createPayment();
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
        {successMsg && <div className="alert success" role="status">{successMsg}</div>}
        {errorMsg && <div className="alert danger" role="alert">{errorMsg}</div>}
        
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        
        <div className="form-container" style={{ position: 'relative' }}>
          {/* Floating Crear button - sticky at top right */}
          <div style={{ 
            position: 'sticky', 
            top: '80px', 
            float: 'right', 
            zIndex: 10,
            marginLeft: '16px',
            marginBottom: '16px'
          }}>
            <button
              type="submit"
              className="btn btn-success btn-lg"
              aria-label="Crear nuevo pago (o presione Ctrl+Enter)"
              title="Atajo: Ctrl+Enter"
              disabled={submitting}
              style={{ 
                minWidth: '180px',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '1.1rem'
              }}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></span>
                  Guardando...
                </>
              ) : (
                <>
                  <span style={{ fontSize: '1.3rem' }}>✓</span>
                  Crear Pago
                </>
              )}
            </button>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#666', 
              marginTop: '6px', 
              textAlign: 'center',
              background: '#f9fafb',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              <strong>Ctrl+Enter</strong> para crear
            </div>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="payment-date">Fecha</label>
              <input id="payment-date" type="date" value={date} onChange={e=>setDate(e.target.value)} />
            </div>

            <div className="form-group">
              <label htmlFor="payment-destination">Destino *</label>
              <select id="payment-destination" value={destinationId} onChange={e=>setDestinationId(e.target.value)}>
                {lookups.destinations.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="payment-collector">Cobrador</label>
              <select id="payment-collector" value={collectorId} onChange={e=>setCollectorId(e.target.value)} onFocus={loadCollectors}>
                <option value="">-- Sin cobrador --</option>
                {collectors.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            
            {/* Add spinner animation */}
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
          
          <div style={{ clear: 'both' }}></div>

          <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--neutral-200)' }} />

          <div style={{marginBottom:16}}>
            <div style={{marginBottom:8, display:'flex', alignItems:'center', gap:8, justifyContent:'space-between', flexWrap:'wrap'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0, flexWrap:'wrap'}}>
              <label style={{fontWeight:600, minWidth:100}}>Donante</label>
              <div style={{display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1}}>
                <DonorAutocomplete
                  ref={donorAutocompleteRef}
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
              <label htmlFor="payment-amount">Monto</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
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
                <div style={{ display:'flex', gap:6 }}>
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
                        fontWeight:600,
                        display:'inline-block'
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
                      color:'#cf1322',
                      display:'inline-block'
                    }}
                  >Borrar</button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="payment-comment">Comentarios</label>
            <textarea id="payment-comment" placeholder="Comentarios" value={comment} onChange={e=>setComment(e.target.value)} style={{minWidth:220}} rows={3} />
          </div>
        </div>
        </form>

        <DonorCreateModal
          open={openCreateDonor}
          onClose={()=>setOpenCreateDonor(false)}
          onCreated={(donor)=>{ setDonorId(donor.id); setSelectedDonorName(donor.fullName || `${donor.firstName}${donor.lastName ? ' ' + donor.lastName : ''}`); setSelectedDonorObs(donor?.observations || ''); }}
        />
      </div>
    </div>
  );
}
