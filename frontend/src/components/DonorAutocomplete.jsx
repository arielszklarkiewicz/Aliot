import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import axios from '../api/client';
import useDebounced from '../hooks/useDebounced';

const DonorAutocomplete = React.forwardRef(({ value, onChange, placeholder = 'Search donor by name or observations', style }, ref) => {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 250);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const valueRef = useRef(value);

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!debounced) { setResults([]); setLoading(false); setError(''); return; }
    console.log('DonorAutocomplete - Searching for:', debounced);
    setLoading(true); setError('');
    axios.get(`/api/donors`, { params: { q: debounced, page: 1, pageSize: 50 } })
      .then(r => { 
        console.log('DonorAutocomplete - Results:', r.data.items?.length, 'donors');
        setResults(r.data.items || []); 
        // Only open dropdown if we don't have a selected donor
        if (!valueRef.current) {
          setOpen(true);
        }
        setActiveIndex(-1); 
      })
      .catch(() => { setResults([]); setError('Failed to search'); })
      .finally(() => setLoading(false));
  }, [debounced]);

  // When parent clears the selection (value becomes falsy), also clear the input UI
  // When value changes to a truthy value, set it as the query to display
  useEffect(() => {
    if (!value) {
      setQuery('');
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      setError('');
    } else if (value && query === '') {
      // Only set query from value if query is empty (initial load)
      setQuery(value);
    }
  }, [value]);

  const selectDonor = (donor) => {
    console.log('DonorAutocomplete - Donor selected:', donor);
    onChange?.(donor?.id || '', donor || null);
    setQuery(donor?.fullName || '');
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min((i + 1), results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max((i - 1), 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0 && activeIndex < results.length) selectDonor(results[activeIndex]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="donor-ac" ref={wrapRef} style={{ position: 'relative', display: 'inline-block', width: 360, ...style }}>
      <input
        ref={inputRef}
        placeholder={placeholder}
        value={query}
        onChange={(e) => { 
          const newValue = e.target.value;
          setQuery(newValue);
          if (!newValue && value) {
            onChange?.('', null);
          }
          // Clear selection if user modifies the text
          if (value && newValue !== value) {
            onChange?.('', null);
          }
        }}
        onFocus={() => { if (results.length && !value) setOpen(true); }}
        onKeyDown={onKeyDown}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="donor-ac-list"
        style={{ width: '100%' }}
      />
      {value && (
        <span className="donor-selected" style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>Selected ✓</span>
      )}
      {open && (
        <div id="donor-ac-list" role="listbox" className="donor-ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', boxShadow: '0 2px 8px rgba(0,0,0,.08)', zIndex: 10, maxHeight: 240, overflowY: 'auto' }}>
          {loading && <div className="donor-ac-item" style={{ padding: 8, fontStyle: 'italic' }}>Searching...</div>}
          {!loading && error && <div className="donor-ac-item" style={{ padding: 8, color: 'red' }}>{error}</div>}
          {!loading && !error && results.length === 0 && debounced && (
            <div className="donor-ac-item" style={{ padding: 8, opacity: 0.7 }}>No donors found</div>
          )}
          {!loading && !error && results.map((d, idx) => (
            <div
              key={d.id}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectDonor(d)}
              className="donor-ac-item"
              style={{ padding: 8, background: idx === activeIndex ? '#f0f6ff' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
            >
              <span style={{ fontWeight: 600 }}>{d.fullName || `${d.firstName || ''}${d.lastName ? ' ' + d.lastName : ''}`.trim()}</span>
              <span style={{ fontSize: 12, color: '#555' }}>
                {[d.email, d.phone].filter(Boolean).join(' • ') || '—'}
              </span>
              {d.observations && (
                <span style={{ fontSize: 12, color: '#777', marginTop: 2 }} title={d.observations}>
                  {d.observations.length > 80 ? d.observations.slice(0, 80) + '…' : d.observations}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

DonorAutocomplete.displayName = 'DonorAutocomplete';

export default DonorAutocomplete;
