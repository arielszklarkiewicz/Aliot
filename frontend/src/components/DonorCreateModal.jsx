import React, { useEffect, useRef, useState } from 'react';
import axios from '../api/client';
import Modal from './Modal';

export default function DonorCreateModal({ open, onClose, onCreated }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [observations, setObservations] = useState('');
  const [isOccasionalDonor, setIsOccasionalDonor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const firstNameRef = useRef(null);

  useEffect(() => {
    if (open && firstNameRef.current) {
      setTimeout(() => firstNameRef.current?.focus(), 100);
    }
  }, [open]);

  const reset = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setAddress(''); setObservations(''); setIsOccasionalDonor(false); setError('');
  };

  const close = () => { if (busy) return; reset(); onClose?.(); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const fn = firstName.trim();
    if (!fn) { setError('El nombre es obligatorio'); return; }
    setBusy(true);
    try {
      const { data } = await axios.post('/api/donors', {
        firstName: fn,
        lastName: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        observations: observations.trim() || null,
        isOccasionalDonor: !!isOccasionalDonor,
      });
      onCreated?.(data);
      reset();
      onClose?.();
    } catch (err) {
      setError('No se pudo crear el donante');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Crear donante">
      <form onSubmit={submit} className="stack">
        {error && <div className="alert danger" role="alert">{error}</div>}
        <div className="row">
          <div className="stack" style={{flex:1, minWidth: 220}}>
            <label>Nombre *</label>
            <input ref={firstNameRef} value={firstName} onChange={(e)=>setFirstName(e.target.value)} placeholder="Nombre" required />
          </div>
          <div className="stack" style={{flex:1, minWidth: 220}}>
            <label>Apellido</label>
            <input value={lastName} onChange={(e)=>setLastName(e.target.value)} placeholder="Apellido" />
          </div>
        </div>
        <div className="row">
          <div className="stack" style={{flex:1, minWidth: 220}}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="nombre@ejemplo.com" />
          </div>
          <div className="stack" style={{flex:1, minWidth: 220}}>
            <label>Teléfono</label>
            <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Teléfono" />
          </div>
        </div>
        <div className="stack">
          <label>Dirección</label>
          <input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Dirección" />
        </div>
        <div className="stack">
          <label>Observaciones</label>
          <textarea value={observations} onChange={(e)=>setObservations(e.target.value)} placeholder="Notas sobre este donante" rows={3} />
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <input id="chk-occasional-create" type="checkbox" checked={!!isOccasionalDonor} onChange={e=>setIsOccasionalDonor(e.target.checked)} />
          <label htmlFor="chk-occasional-create" style={{ marginLeft: 8 }}>Donante ocasional</label>
        </div>
        <div className="modal-footer" style={{justifyContent:'flex-end'}}>
          <button type="button" className="button-ghost" onClick={close} disabled={busy}>Cancelar</button>
          <button type="submit" className="primary" disabled={busy}>{busy ? 'Creando...' : 'Crear donante'}</button>
        </div>
      </form>
    </Modal>
  );
}
