import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
          try {
            const { data } = await axios.post(`/api/auth/google`, { idToken: response.credential });
            localStorage.setItem('token', data.accessToken);
            navigate('/donations');
          } catch (e) {
            setError('Google login failed');
          }
        },
        ux_mode: 'popup'
      });
      window.google.accounts.id.renderButton(googleDivRef.current, { theme: 'outline', size: 'large' });
    }
  }, [googleClientId, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`/api/auth/login`, { email, password });
      localStorage.setItem('token', data.accessToken);
      navigate('/donations');
    } catch (err) {
      setError('Invalid login');
    }
  };
  return (
    <div>
      {/* Hero Section */}
      <div className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-text">
            <h1>Iniciar Sesión</h1>
            <p>Acceda al sistema de gestión de donaciones</p>
          </div>
        </div>
      </div>

      <div className="form-container" style={{ maxWidth: 500, margin: '0 auto' }}>
        <div ref={googleDivRef} style={{marginBottom:20, textAlign:'center'}} />
        <div style={{opacity:0.6, fontSize:14, marginBottom:20, textAlign:'center'}}>o use email y contraseña:</div>
        
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email"
              placeholder="su@email.com" 
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
          
          <button type="submit" className="btn btn-success w-full">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
