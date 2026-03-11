import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleDivRef = useRef(null);
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return; // no client id configured
    // Load Google Identity Services script
    const id = 'google-identity-services';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true; s.id = id;
      s.onload = () => initGoogle();
      document.body.appendChild(s);
    } else {
      initGoogle();
    }

    function initGoogle() {
      if (!(window.google && window.google.accounts && googleDivRef.current)) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setError(''); // Clear previous errors
          try {
            const { data } = await axios.post(`/api/auth/google`, { idToken: response.credential });
            localStorage.setItem('token', data.accessToken);
            window.dispatchEvent(new Event('storage'));
            navigate('/');
          } catch (e) {
            setError('Error al iniciar sesión con Google. Intente nuevamente');
          }
        },
        ux_mode: 'popup'
      });
      window.google.accounts.id.renderButton(googleDivRef.current, { theme: 'outline', size: 'large' });
    }
  }, [googleClientId, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`/api/auth/login`, { email, password });
      localStorage.setItem('token', data.accessToken);
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos');
      } else if (err.response?.status === 403) {
        setError('Cuenta desactivada. Contacte al administrador');
      } else {
        setError('Error al intentar iniciar sesión. Intente nuevamente');
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      {/* Hero Section */}
      <div className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-text">
            <img src="/logo.jpg" alt="Ieshivá Jajam Nissim Cohen" style={{ maxWidth: '200px', height: 'auto', marginBottom: '1.5rem', borderRadius: '8px' }} />
            <h1>Iniciar Sesión</h1>
            <p>Acceda al sistema de gestión de donaciones</p>
          </div>
        </div>
      </div>

      <div className="form-container" style={{ maxWidth: 500, margin: '0 auto' }}>
        <div ref={googleDivRef} style={{marginBottom:20, textAlign:'center'}} />
        
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="email">Usuario</label>
            <input 
              id="email"
              type="text"
              placeholder="usuario o email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              id="password"
              type="password" 
              placeholder="Contraseña" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          
          {loading && (
            <div style={{ width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ 
                height: '100%', 
                background: 'linear-gradient(90deg, #10b981, #059669)', 
                animation: 'progressBar 1.5s ease-in-out infinite',
                width: '50%'
              }} />
            </div>
          )}
          
          <button type="submit" className="btn btn-success w-full" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          
          <style>{`
            @keyframes progressBar {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </form>
      </div>
    </div>
  );
}
