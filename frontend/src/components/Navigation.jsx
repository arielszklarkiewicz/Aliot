import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import api from '../api/client';

export default function Navigation() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const { user, isAdmin, isDataEntry, loading } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path) => location.pathname === path;

  // Load unread message count
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  // Refresh unread count when location changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUnreadCount();
    }
  }, [location.pathname]);

  const loadUnreadCount = async () => {
    try {
      const response = await api.get('/api/messages/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (err) {
      console.error('Error loading unread count', err);
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen) {
        const nav = document.querySelector('.main-navigation');
        if (nav && !nav.contains(event.target)) {
          setMobileMenuOpen(false);
        }
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Auto-hide navigation on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        // Always show at top of page
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past threshold - hide
        setIsVisible(false);
        setMobileMenuOpen(false); // Close mobile menu when hiding
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Define menu structure with role-based access
  const menuSections = [
    {
      id: 'operations',
      label: 'Operaciones',
      icon: '📋',
      roles: ['Admin', 'DataEntry'],
      items: [
        { path: '/donations', label: 'Registrar Donación', icon: '➕', roles: ['Admin', 'DataEntry'] },
        { path: '/payments', label: 'Registrar Pago', icon: '💰', roles: ['Admin', 'DataEntry'] },
      ]
    },
    {
      id: 'reports',
      label: 'Consultas y Reportes',
      icon: '📈',
      roles: ['Admin', 'DataEntry', 'ReadOnly', 'Donor'],
      items: [
        { path: '/donations/list', label: 'Listado de Donaciones', icon: '📊', roles: ['Admin', 'DataEntry', 'ReadOnly'] },
        { path: '/donors/summary', label: 'Resumen de Donante', icon: '👤', roles: ['Admin', 'DataEntry', 'ReadOnly', 'Donor'] },
        { path: '/reports/donor-balances', label: 'Saldos por Donante', icon: '💵', roles: ['Admin', 'DataEntry', 'ReadOnly'] },
        { path: '/messages', label: 'Mensajes', icon: '💬', roles: ['Admin', 'DataEntry', 'Donor'], badge: true },
      ]
    },
    {
      id: 'administration',
      label: 'Administración',
      icon: '⚙️',
      roles: ['Admin', 'DataEntry'],
      items: [
        { path: '/admin/donors', label: 'Gestión de Donantes', icon: '👥', roles: ['Admin', 'DataEntry'] },
        { path: '/admin/donations', label: 'Gestión de Donaciones', icon: '📋', roles: ['Admin'] },
        { path: '/admin/payments', label: 'Gestión de Pagos', icon: '💳', roles: ['Admin'] },
        { path: '/admin/concepts', label: 'Conceptos', icon: '🏷️', roles: ['Admin'] },
        { path: '/admin/destinations', label: 'Destinos', icon: '🎯', roles: ['Admin'] },
        { path: '/admin/collectors', label: 'Cobradores', icon: '🤝', roles: ['Admin'] },
        { path: '/admin/users', label: 'Usuarios del Sistema', icon: '👤', roles: ['Admin'] },
        { path: '/admin/audit-log', label: 'Registro de Actividad', icon: '📋', roles: ['Admin'] },
        { path: '/admin/system', label: 'Administración del Sistema', icon: '🔧', roles: ['Admin'] },
      ]
    }
  ];

  const hasAccess = (allowedRoles) => {
    if (loading || !user) return false;
    return allowedRoles.includes(user.role);
  };

  const canAccessMessages = () => {
    if (loading || !user) return false;
    // Check if user has messaging permission AND canSendMessage flag is true
    return user.canSendMessage !== false;
  };

  const filteredSections = menuSections
    .filter(section => hasAccess(section.roles))
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!hasAccess(item.roles)) return false;
        // Special check for messages
        if (item.path === '/messages') return canAccessMessages();
        return true;
      })
    }))
    .filter(section => section.items.length > 0);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className={`main-navigation ${!isVisible ? 'nav-hidden' : ''}`}>
      {/* Header */}
      <div className="nav-header">
        <Link to="/" className="nav-brand" style={{ textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Ieshivá Rab Dines" className="brand-logo" style={{ height: '40px', width: 'auto', marginRight: '12px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
          <span className="brand-name">Sistema de Donaciones</span>
        </Link>
        
        <div className="nav-actions">
          {user && (
            <div className="user-info">
              <span className="user-name">{user.fullName || user.email}</span>
              <span className="user-role">{getRoleLabel(user.role)}</span>
            </div>
          )}
          <button className="btn-logout" onClick={logout} title="Cerrar Sesión">
            <span className="logout-icon">🚪</span>
            <span className="logout-text">Salir</span>
          </button>
          <button 
            className="mobile-menu-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Menu Sections */}
      <div className={`nav-content ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {filteredSections.map(section => (
          <div key={section.id} className="nav-section">
            <div className="section-header">
              <span className="section-icon">{section.icon}</span>
              <span className="section-label">{section.label}</span>
            </div>
            <div className="section-items">
              {section.items.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={(e) => {
                    console.log('Navigation clicked:', item.path);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="item-icon">{item.icon}</span>
                  <span className="item-label">{item.label}</span>
                  {item.badge && unreadCount > 0 && (
                    <span className="unread-badge">{unreadCount}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

function getRoleLabel(role) {
  const labels = {
    Admin: 'Administrador',
    DataEntry: 'Operador',
    ReadOnly: 'Consulta',
    Donor: 'Donante'
  };
  return labels[role] || role;
}
