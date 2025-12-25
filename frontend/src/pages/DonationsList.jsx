import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/client';
import DonorAutocomplete from '../components/DonorAutocomplete';
import useDebounced from '../hooks/useDebounced';
import '../styles/DonationsListImproved.css';

export default function DonationsList() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [donorId, setDonorId] = useState('');
  const [destination, setDestination] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [perasha, setPerasha] = useState('');
  const [includeOccasional, setIncludeOccasional] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const debouncedPerasha = useDebounced(perasha, 300);
  const debouncedSearch = useDebounced(searchQuery, 400);

  const [perashaSuggestions, setPerashaSuggestions] = useState([]);
  const [lookups, setLookups] = useState({ destinations: [] });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const stats = useMemo(() => {
    const totalAmount = items.reduce((sum, item) => {
      const amount = typeof item.amount === 'number' ? item.amount : 0;
      return sum + amount;
    }, 0);
    return { totalAmount, donationCount: items.length };
  }, [items]);

  useEffect(() => {
    axios.get('/api/lookups').then(r => {
      setLookups({ destinations: r.data.destinations || [] });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!debouncedPerasha) { setPerashaSuggestions([]); return; }
    axios.get('/api/autocomplete/perashot', { params: { q: debouncedPerasha, limit: 8 } })
      .then(r => setPerashaSuggestions(r.data || []))
      .catch(() => setPerashaSuggestions([]));
  }, [debouncedPerasha]);

  async function load() {
    setLoading(true); setError('');
    try {
      const params = {
        page,
        pageSize,
        destination: destination || undefined,
        donorId: donorId || undefined,
        isOccasionalDonor: includeOccasional ? undefined : false,
        from: from || undefined,
        to: to || undefined,
      };
      const { data } = await axios.get('/api/donations', { params });
      let list = data.items || [];
      
      if (perasha && perasha.trim()) {
        const p = perasha.trim().toLowerCase();
        list = list.filter(x => (x.perasha || '').toLowerCase().includes(p));
      }
      
      if (debouncedSearch && debouncedSearch.trim()) {
        const s = debouncedSearch.trim().toLowerCase();
        list = list.filter(x => 
          (x.donorName || '').toLowerCase().includes(s) ||
          (x.comment || '').toLowerCase().includes(s) ||
          (x.concept || '').toLowerCase().includes(s)
        );
      }
      
      list = sortDonations(list, sortBy, sortOrder);
      
      setItems(list);
      setTotal(data.total || list.length || 0);
    } catch (e) {
      setError('No se pudieron cargar las donaciones. Por favor, intente nuevamente.');
    } finally { setLoading(false); }
  }

  function sortDonations(list, by, order) {
    const sorted = [...list];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch(by) {
        case 'date':
          comparison = new Date(a.donationDate) - new Date(b.donationDate);
          break;
        case 'amount':
          comparison = (a.amount || 0) - (b.amount || 0);
          break;
        case 'donor':
          comparison = (a.donorName || '').localeCompare(b.donorName || '');
          break;
        default:
          return 0;
      }
      return order === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }

  useEffect(() => { 
    load(); 
  }, [page, pageSize, donorId, destination, from, to, debouncedPerasha, includeOccasional, debouncedSearch, sortBy, sortOrder]);

  const clearFilters = () => {
    setDonorId(''); 
    setDestination(''); 
    setFrom(''); 
    setTo(''); 
    setPerasha(''); 
    setSearchQuery('');
    setIncludeOccasional(true); 
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const hasActiveFilters = donorId || destination || from || to || perasha || searchQuery || !includeOccasional;

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Listado de Donaciones</h1>
          <p className="hero-subtitle">Explore todas las donaciones registradas en el sistema</p>
        </div>
        <button 
          className="button-primary cta-donate" 
          onClick={() => window.location.href = '/donations'}
          aria-label="Realizar nueva donación"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          Nueva Donación
        </button>
      </div>

      <div className="content-wrapper">
        <div className="stats-cards" role="region" aria-label="Estadísticas de donaciones">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e7f5ff' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1971c2" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Recaudado</div>
            <div className="stat-value">${new Intl.NumberFormat('es-AR').format(Math.round(stats.totalAmount))}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e7f5ff' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1971c2" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Donaciones Registradas</div>
            <div className="stat-value">{total}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff4e6' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e8590c" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">En esta Página</div>
            <div className="stat-value">{items.length}</div>
          </div>
        </div>
      </div>

      <div className="search-toolbar">
        <div className="search-box" role="search">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Buscar por donante, concepto o comentario..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="search-input"
            aria-label="Buscar donaciones"
          />
          {searchQuery && (
            <button 
              className="search-clear" 
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <button 
          className={'filter-toggle ' + (showFilters ? 'active ' : '') + (hasActiveFilters ? 'has-filters' : '')}
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-label="Mostrar filtros"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Filtros
          {hasActiveFilters && <span className="filter-badge">{[donorId, destination, from, to, perasha, searchQuery, !includeOccasional].filter(Boolean).length}</span>}
        </button>

        <div className="sort-controls">
          <label htmlFor="sort-select" className="sort-label">Ordenar:</label>
          <select 
            id="sort-select"
            value={sortBy + '-' + sortOrder}
            onChange={e => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by);
              setSortOrder(order);
            }}
            className="sort-select"
            aria-label="Ordenar donaciones"
          >
            <option value="date-desc">Más recientes</option>
            <option value="date-asc">Más antiguas</option>
            <option value="amount-desc">Mayor monto</option>
            <option value="amount-asc">Menor monto</option>
            <option value="donor-asc">Donante A-Z</option>
            <option value="donor-desc">Donante Z-A</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel" role="region" aria-label="Filtros avanzados">
          <div className="filters-grid">
            <div className="filter-field">
              <label htmlFor="donor-filter">Donante</label>
              <DonorAutocomplete 
                id="donor-filter"
                value={donorId} 
                onChange={(id) => { setDonorId(id); setPage(1); }} 
                placeholder="Buscar donante" 
                style={{ width: '100%' }} 
              />
            </div>
            
            <div className="filter-field">
              <label htmlFor="from-date">Desde</label>
              <input 
                id="from-date"
                type="date" 
                value={from} 
                onChange={e => { setFrom(e.target.value); setPage(1); }} 
                aria-label="Fecha desde"
              />
            </div>
            
            <div className="filter-field">
              <label htmlFor="to-date">Hasta</label>
              <input 
                id="to-date"
                type="date" 
                value={to} 
                onChange={e => { setTo(e.target.value); setPage(1); }} 
                aria-label="Fecha hasta"
              />
            </div>
            
            <div className="filter-field">
              <label htmlFor="perasha-filter">Perashá</label>
              <input 
                id="perasha-filter"
                list="perasha-sugg" 
                placeholder="Perashá" 
                value={perasha} 
                onChange={e => { setPerasha(e.target.value); setPage(1); }} 
                aria-label="Filtrar por Perashá"
              />
              <datalist id="perasha-sugg">
                {perashaSuggestions.map((s, i) => (<option key={i} value={s} />))}
              </datalist>
            </div>
            
            <div className="filter-field">
              <label htmlFor="destination-filter">Destino</label>
              <select 
                id="destination-filter"
                value={destination} 
                onChange={e => { setDestination(e.target.value); setPage(1); }}
                aria-label="Filtrar por destino"
              >
                <option value="">Todos</option>
                {lookups.destinations.map(d => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>
            
            <div className="filter-field checkbox-field">
              <label>
                <input 
                  type="checkbox" 
                  checked={includeOccasional} 
                  onChange={e => { setIncludeOccasional(e.target.checked); setPage(1); }}
                  aria-label="Incluir donantes ocasionales"
                />
                <span>Incluir donantes ocasionales</span>
              </label>
            </div>
          </div>

          <div className="filters-actions">
            <button onClick={clearFilters} className="button-ghost" aria-label="Limpiar todos los filtros">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner"></div>
          <p>Cargando donaciones...</p>
        </div>
      )}

      {error && (
        <div className="alert danger" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {error}
        </div>
      )}

      {!loading && (
        <div className="table-container">
          <table className="donations-table" role="table" aria-label="Tabla de donaciones">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Donante</th>
                <th scope="col" style={{ textAlign: 'right' }}>Monto</th>
                <th scope="col">Moneda</th>
                <th scope="col">Minián</th>
                <th scope="col">Concepto</th>
                <th scope="col">Destino</th>
                <th scope="col">Perashá</th>
                <th scope="col">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <svg className="empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <h3>No se encontraron donaciones</h3>
                      <p>No hay donaciones que coincidan con los criterios de búsqueda.</p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="button-primary">
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {items.map((d, idx) => {
                const cur = (d.currency || '').toString();
                const curNorm = cur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                const isUsd = curNorm === 'dolares' || curNorm === 'usd' || curNorm === 'dolares estadounidenses' || curNorm === 'u$s' || curNorm === 'us$';
                return (
                  <tr key={d.id} className="donation-row">
                    <td data-label="Fecha">{d.donationDate}</td>
                    <td data-label="Donante" className="donor-name">{d.donorName || '—'}</td>
                    <td data-label="Monto" className="amount-cell">
                      {typeof d.amount === 'number' ? new Intl.NumberFormat('es-AR').format(Math.round(d.amount)) : d.amount}
                    </td>
                    <td data-label="Moneda">
                      <span className={'currency-badge ' + (isUsd ? 'usd' : 'other')}>
                        {d.currency}
                      </span>
                    </td>
                    <td data-label="Minián">{d.minian || '—'}</td>
                    <td data-label="Concepto">{d.concept || '—'}</td>
                    <td data-label="Destino">
                      {d.destination === 'Other' ? 'Otro' : d.destination}
                      {d.destination === 'Other' && d.destinationOther ? ' (' + d.destinationOther + ')' : ''}
                    </td>
                    <td data-label="Perashá">{d.perasha || '—'}</td>
                    <td data-label="Comentario" className="comment-cell" title={d.comment}>
                      {d.comment || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination-container" role="navigation" aria-label="Paginación">
        <div className="pagination-info">
          Mostrando {items.length > 0 ? ((page - 1) * pageSize + 1) : 0} - {Math.min(page * pageSize, total)} de {total}
        </div>
        
        <div className="pagination-controls">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="pagination-btn"
            aria-label="Página anterior"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Anterior
          </button>
          
          <div className="page-numbers">
            <span className="page-current">{page}</span>
            <span className="page-separator">/</span>
            <span className="page-total">{totalPages}</span>
          </div>
          
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="pagination-btn"
            aria-label="Página siguiente"
          >
            Siguiente
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div className="page-size-control">
          <label htmlFor="page-size-select">Mostrar:</label>
          <select 
            id="page-size-select"
            value={pageSize} 
            onChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
            aria-label="Cantidad de elementos por página"
          >
            {[10, 20, 50, 100].map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
      </div>
      </div>
    </div>
  );
}
