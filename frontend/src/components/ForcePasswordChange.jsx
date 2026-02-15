import React, { useState, useEffect } from 'react';
import axios from '../api/client';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function ForcePasswordChange() {
  const { user, isDonor } = useCurrentUser();
  const [showModal, setShowModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Only check for donors
    if (!isDonor || !user) return;

    // Check if password is default (try to login with 123456)
    // Actually, we'll assume if they logged in, we need to check via backend
    // For now, we'll show the modal and let them change it
    checkIfDefaultPassword();
  }, [isDonor, user]);

  const checkIfDefaultPassword = async () => {
    try {
      // Try to verify if current password is 123456
      // We'll do this by attempting to change password with current = 123456
      const response = await axios.post('/api/auth/check-default-password');
      if (response.data.isDefault) {
        setShowModal(true);
      }
    } catch (e) {
      // Endpoint doesn't exist yet, we'll add it
      // For now, always show for donors on first login
      // We can track this with localStorage
      const hasChangedPassword = localStorage.getItem(`password_changed_${user?.id}`);
      if (!hasChangedPassword) {
        setShowModal(true);
      }
    }
  };

  const handleChangePassword = async () => {
    setError('');
    
    if (!newPassword || newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (newPassword === '123456') {
      setError('No puede usar la contraseña predeterminada. Por favor elija una contraseña diferente.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSaving(true);
    try {
      await axios.post('/api/auth/change-password', {
        currentPassword: '123456',
        newPassword: newPassword
      });
      
      // Mark as changed in localStorage
      localStorage.setItem(`password_changed_${user?.id}`, 'true');
      
      alert('Contraseña cambiada exitosamente');
      setShowModal(false);
    } catch (e) {
      if (e.response?.status === 400 || e.response?.status === 401) {
        setError('No se pudo cambiar la contraseña. Puede que ya la haya cambiado anteriormente.');
      } else {
        setError('Error al cambiar la contraseña');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!showModal) return null;

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: 500, 
          width: '90%',
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 0
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ 
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#fef3c7'
        }}>
          <h2 style={{ margin: 0, color: '#92400e' }}>🔒 Cambio de Contraseña Requerido</h2>
        </div>
        
        <div className="modal-body" style={{ padding: '24px' }}>
          <div style={{ 
            padding: '12px', 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: 6, 
            marginBottom: 20 
          }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
              ⚠️ Está usando la contraseña predeterminada (123456). Por razones de seguridad, debe cambiarla antes de continuar.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="new-password" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Nueva Contraseña (mínimo 6 caracteres)
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Ingrese nueva contraseña"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              disabled={saving}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Confirmar Nueva Contraseña
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirme la contraseña"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              disabled={saving}
            />
          </div>

          {error && (
            <div style={{ 
              padding: '12px', 
              background: '#fee2e2', 
              border: '1px solid #ef4444', 
              borderRadius: 6, 
              marginBottom: 16,
              color: '#991b1b'
            }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ 
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button 
            className="btn btn-primary" 
            onClick={handleChangePassword}
            disabled={saving}
            style={{ minWidth: 150 }}
          >
            {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}
