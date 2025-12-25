import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function Navigation() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const { user, isAdmin, isDataEntry, loading } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const isActive = (path) => location.pathname === path;

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
      roles: ['Admin', 'DataEntry', 'ReadOnly'],
      items: [
        { path: '/donations/list', label: 'Listado de Donaciones', icon: '📊', roles: ['Admin', 'DataEntry', 'ReadOnly'] },
        { path: '/donors/summary', label: 'Resumen de Donante', icon: '👤', roles: ['Admin', 'DataEntry', 'ReadOnly'] },
        { path: '/reports/donor-balances', label: 'Saldos por Donante', icon: '💵', roles: ['Admin', 'DataEntry', 'ReadOnly'] },
      ]
    },
    {
      id: 'administration',
      label: 'Administración',
      icon: '⚙️',
      roles: ['Admin', 'DataEntry'],
      items: [
        { path: '/admin/donors', label: 'Gestión de Donantes', icon: '👥', roles: ['Admin', 'DataEntry'] },
        { path: '/admin/concepts', label: 'Conceptos', icon: '🏷️', roles: ['Admin'] },
        { path: '/admin/destinations', label: 'Destinos', icon: '🎯', roles: ['Admin'] },
        { path: '/admin/collectors', label: 'Cobradores', icon: '🤝', roles: ['Admin'] },
        { path: '/admin/users', label: 'Usuarios del Sistema', icon: '👤', roles: ['Admin'] },
      ]
    }
  ];

  const hasAccess = (allowedRoles) => {
    if (loading || !user) return false;
    return allowedRoles.includes(user.role);
  };

  const filteredSections = menuSections
    .filter(section => hasAccess(section.roles))
    .map(section => ({
      ...section,
      items: section.items.filter(item => hasAccess(item.roles))
    }))
    .filter(section => section.items.length > 0);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className={`main-navigation ${!isVisible ? 'nav-hidden' : ''}`}>
      {/* Header */}
      <div className="nav-header">
        <div className="nav-brand">
          <span className="brand-icon">🕍</span>
          <span className="brand-name">Sistema de Donaciones</span>
        </div>
        
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
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            ☰
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
    ReadOnly: 'Consulta'
  };
  return labels[role] || role;
}
