import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/client';

export default function Home() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    axios.get(`/healthz`).then(r => setHealth(r.data)).catch(() => setHealth({ status: 'error' }));
  }, []);
  return (
    <div>
      <h2>Donaciones y Pagos</h2>
      <p>Estado de la API: {health ? JSON.stringify(health) : 'cargando...'}</p>
      <nav>
        <Link to="/login">Ingresar</Link> | <Link to="/donations">Donaciones</Link> | <Link to="/payments">Pagos</Link> | <Link to="/admin/donors">Administración de donantes</Link>
      </nav>
    </div>
  );
}
