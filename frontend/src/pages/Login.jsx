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
      <h3>Login</h3>
      <div ref={googleDivRef} style={{marginBottom:12}} />
      <div style={{opacity:0.6, fontSize:12, marginBottom:12}}>or use email/password:</div>
      <form onSubmit={onSubmit}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Ingresar</button>
      </form>
      {error && <div style={{color:'red'}}>{error}</div>}
    </div>
  );
}
