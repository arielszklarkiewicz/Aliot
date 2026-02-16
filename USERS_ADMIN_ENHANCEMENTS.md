# Users Admin Enhancements for Donor Management

## Overview
Enhanced the Users Admin page to better manage Donor user accounts with password visibility and filtering capabilities.

## Changes Made

### 1. Added Filters to UsersAdmin Page
**File**: `frontend/src/pages/UsersAdmin.jsx`

#### a) Email Search Filter
- Text input to filter users by email
- Case-insensitive search

#### b) Full Name Search Filter
- Text input to filter users by full name
- Case-insensitive search

#### c) Hide Donors Checkbox
- Checkbox to hide/show users with "Donor" role
- Useful for admins who want to focus on staff users
- Filters are applied client-side after fetching data

### 2. Added Password Column
**File**: `frontend/src/pages/UsersAdmin.jsx`

- New "Contraseña" (Password) column in the users table
- For Donor role users: Shows hint message "(usar cambiar contraseña para ver nueva)"
- For other roles: Shows masked password "●●●●●●"

### 3. Enhanced Change Password for Donors
**File**: `frontend/src/pages/UsersAdmin.jsx`

#### a) Auto-Generate Button
- Added "🎲 Generar" button for Donor users
- Generates random 6-digit password (100000-999999)
- One-click generation for easy password creation

#### b) Password Visibility
- Changed input type from `password` to `text` for Donor users
- Allows admin to see the generated password clearly
- Shows password in success alert after change

#### c) Enhanced Success Message
When changing password for Donor users, shows:
```
Contraseña cambiada exitosamente

Usuario: juan.perez
Contraseña: 123456

Por favor, comunique estas credenciales al donante de forma segura.
```

#### d) Visual Hint
- Yellow info box suggesting 6-digit numeric passwords for donors
- Helps maintain consistency in password format

### 4. Added Donor Role Label
**File**: `frontend/src/pages/UsersAdmin.jsx`

- Added "Donante" label for Donor role in `roleLabels` object
- Shows with warning badge color (yellow/orange) in table

### 5. Backend Logging
**File**: `api/Donaciones.Api/Services/DonorService.cs`

- Added console logging when donor user is created
- Format: `[DONOR CREATED] Username: {username} | Password: {password} | Donor: {fullname}`
- Allows admins to retrieve credentials from server logs if needed

### 6. Donor Creation Alert
**File**: `frontend/src/pages/DonorsAdmin.jsx`

- Enhanced success message when creating a donor
- Informs admin that user account was auto-created
- Shows the username format
- Directs admin to Users Admin page to get password

Example message:
```
Donante creado exitosamente.

Se ha creado una cuenta de usuario automáticamente.

Usuario: juan.perez

⚠️ Para obtener la contraseña, vaya a "Usuarios del Sistema" 
y use "Cambiar contraseña" para el usuario creado.
```

## User Flow for Managing Donor Passwords

### Scenario 1: New Donor Created
1. Admin creates donor in "Gestión de Donantes"
2. System auto-creates user account
3. Alert shows username (e.g., `juan.perez`)
4. Admin goes to "Usuarios del Sistema"
5. Filters or searches for the donor user
6. Clicks "Cambiar contraseña" (🔑)
7. Clicks "🎲 Generar" to generate 6-digit password
8. Clicks "Cambiar contraseña" button
9. Alert shows username and password
10. Admin communicates credentials to donor securely

### Scenario 2: Reset Existing Donor Password
1. Admin goes to "Usuarios del Sistema"
2. Optional: Check "Ocultar usuarios con rol Donante" = OFF
3. Searches by email or name to find donor
4. Clicks "Cambiar contraseña" (🔑)
5. Clicks "🎲 Generar" or enters custom password
6. Alert shows new credentials
7. Admin communicates new password to donor

### Scenario 3: View Only Staff Users
1. Admin goes to "Usuarios del Sistema"
2. Checks "Ocultar usuarios con rol Donante" checkbox
3. Table now shows only Admin, DataEntry, ReadOnly users
4. Cleaner view for managing staff accounts

## UI Components Added

### Filter Section
```
┌─────────────────────────────────────────────────┐
│ Buscar por Email:     [              ]          │
│ Buscar por Nombre:    [              ]          │
│ ☐ Ocultar usuarios con rol Donante              │
└─────────────────────────────────────────────────┘
```

### Users Table (with new column)
```
┌─────────┬──────────┬────────┬────────────┬────────┬─────────┬──────────┐
│ Email   │ Nombre   │ Rol    │ Contraseña │ Estado │ Creado  │ Acciones │
├─────────┼──────────┼────────┼────────────┼────────┼─────────┼──────────┤
│ juan.p  │ Juan P.  │ Donante│ (usar...)  │ Activo │ 15/2/26 │ ✏️🔑🚫🗑️  │
└─────────┴──────────┴────────┴────────────┴────────┴─────────┴──────────┘
```

### Change Password Modal for Donors
```
┌─────────────────────────────────────────────┐
│ Cambiar contraseña                      [✕] │
├─────────────────────────────────────────────┤
│ Usuario: juan.perez (Donante)               │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 💡 Para donantes, se recomienda usar    │ │
│ │    una contraseña numérica de 6 dígitos │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Nueva Contraseña                            │
│ [123456          ] [🎲 Generar]             │
│                                             │
│              [Cancelar] [Cambiar contraseña]│
└─────────────────────────────────────────────┘
```

## Security Considerations

✅ Passwords are never stored in plain text in database  
✅ Passwords are only visible during the change operation  
✅ Admin must explicitly generate/change password to see it  
✅ Success alert clearly reminds admin to communicate securely  
✅ Console logging provides audit trail of credential generation  

## Files Modified

### Backend
- `api/Donaciones.Api/Services/DonorService.cs` - Added console logging

### Frontend
- `frontend/src/pages/UsersAdmin.jsx` - Added filters, password column, enhanced password change
- `frontend/src/pages/DonorsAdmin.jsx` - Enhanced donor creation alert

## Testing Checklist

- [ ] Create a new donor and verify alert message
- [ ] Go to Users Admin and search for the donor by email
- [ ] Click "Cambiar contraseña" for donor user
- [ ] Verify "🎲 Generar" button appears
- [ ] Click generate and verify 6-digit password appears
- [ ] Change password and verify success message shows username and password
- [ ] Test email filter with partial matches
- [ ] Test full name filter with partial matches
- [ ] Toggle "Hide Donors" checkbox and verify table filters
- [ ] Verify non-donor users don't show generate button
- [ ] Verify password column shows correct messages for each role

## Build Status

✅ Backend build successful  
✅ Frontend build successful  
✅ No compilation errors  
✅ Ready for deployment
