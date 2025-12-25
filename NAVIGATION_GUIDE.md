# Professional Navigation Menu - Documentation

## Overview

A clean, scalable, and professional navigation menu system with role-based access control.

## Features

### ✅ Professional Design
- Clean, business-oriented interface
- Consistent visual hierarchy
- Clear iconography for easy recognition
- Responsive design for mobile devices

### ✅ Role-Based Access Control
Three user roles with different access levels:

**Admin (Administrador)**
- Full access to all features
- Can manage users, concepts, destinations, collectors
- Access to all operations and reports

**DataEntry (Operador)**
- Can create and manage donations, payments
- Can manage donors
- Access to all reports
- Cannot manage system configuration

**ReadOnly (Consulta)**
- View-only access to reports
- Can view donation lists and donor summaries
- Cannot create or edit any data

### ✅ Organized Structure

**1. Operaciones (Operations)**
- Nueva Donación - Create new donations
- Listado de Donaciones - View all donations
- Registrar Pago - Register payments

**2. Consultas y Reportes (Queries & Reports)**
- Resumen de Donante - Donor summary
- Saldos por Donante - Donor balances

**3. Administración (Administration)**
- Gestión de Donantes - Donor management
- Conceptos - Donation concepts (Admin only)
- Destinos - Destinations (Admin only)
- Cobradores - Collectors (Admin only)
- Usuarios del Sistema - User management (Admin only)

## Component Structure

### Navigation.jsx
Main navigation component with:
- Menu structure definition
- Role-based filtering
- Active state management
- Mobile menu support

### Navigation.css
Professional styling with:
- Dark header with branding
- Light content area
- Hover and active states
- Responsive breakpoints
- Print-friendly (hides on print)

## How It Works

### Menu Definition
```javascript
const menuSections = [
  {
    id: 'operations',
    label: 'Operaciones',
    icon: '📋',
    roles: ['Admin', 'DataEntry', 'ReadOnly'],
    items: [
      { 
        path: '/donations', 
        label: 'Nueva Donación', 
        icon: '➕', 
        roles: ['Admin', 'DataEntry'] 
      },
      // More items...
    ]
  },
  // More sections...
];
```

### Role Filtering
```javascript
const hasAccess = (allowedRoles) => {
  if (loading || !user) return false;
  return allowedRoles.includes(user.role);
};
```

Menu items are automatically filtered based on current user's role.

## Responsive Behavior

### Desktop (> 1200px)
- Horizontal menu with all sections side-by-side
- Full labels and icons visible
- User info and logout button in header

### Tablet (768px - 1200px)
- Vertical stacked sections
- Full labels still visible

### Mobile (< 768px)
- Hamburger menu toggle
- Collapsible menu
- Simplified header
- Full-screen menu overlay

## Adding New Menu Items

To add a new feature to the menu:

1. Add route in `App.jsx`
2. Add menu item in `Navigation.jsx`:
```javascript
{
  path: '/new-feature',
  label: 'New Feature',
  icon: '🆕',
  roles: ['Admin', 'DataEntry'] // Specify who can access
}
```

## Accessibility

- Semantic HTML (`<nav>`, proper headings)
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast colors
- Focus indicators

## Browser Compatibility

Tested and working on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Migration from SystemMap

The old `SystemMap.jsx` component has been replaced with `Navigation.jsx`:

**Old SystemMap:**
- Flat horizontal navigation
- Pills design
- Limited mobile support

**New Navigation:**
- Structured sections
- Professional business look
- Full responsive support
- Better role management
- Scalable for growth

## Future Enhancements

Possible additions:
- Breadcrumbs for deep navigation
- Quick search functionality
- Keyboard shortcuts
- Notifications badge
- User preferences menu
- Dark mode toggle
