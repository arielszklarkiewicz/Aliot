# Donor Access Instructions Feature

## Overview
Added a feature for System Admins to view and copy donor access instructions from the Donors Admin page.

## Changes Made

### Frontend: DonorsAdmin Page
**File**: `frontend/src/pages/DonorsAdmin.jsx`

#### 1. Added State for Instructions Modal
```javascript
const { isAdmin } = useCurrentUser();
const [showInstructions, setShowInstructions] = useState(null); // donor object to show instructions for
```

#### 2. Added "Instrucciones" Button (Admin Only)
In the table actions column, added a button that only shows for Admin users:
```javascript
{isAdmin && (
  <button className="btn btn-sm btn-primary" onClick={() => setShowInstructions(d)}>
    📋 Instrucciones
  </button>
)}
```

#### 3. Created Instructions Modal
A modal that displays:
- **Donor name** - Who the instructions are for
- **Credentials box** - URL, Username, Initial password (formatted)
- **Important notice** - Must change password on first login
- **Full message** - Complete text ready to copy
- **Copy button** - Copies full message to clipboard

### Message Format

The instructions include:

```
Hola [FirstName],

Le damos la bienvenida al sistema de gestión de donaciones de Ieshibá Rab Dines.

Para acceder a su cuenta:

🌐 URL: https://aliot-1.onrender.com/
👤 Usuario: firstname.lastname
🔑 Contraseña inicial: 123456

⚠️ Por seguridad, deberá cambiar su contraseña al iniciar sesión por primera vez.

En el sistema podrá consultar el estado de sus donaciones y pagos.

Saludos cordiales
```

## User Flow

### For System Admins:
1. Go to "Gestión de Donantes"
2. Find the donor in the table
3. Click "📋 Instrucciones" button
4. Modal opens with formatted instructions
5. Review the information:
   - URL: https://aliot-1.onrender.com/
   - Username: firstname.lastname
   - Password: 123456
6. Click "📋 Copiar Instrucciones"
7. Instructions copied to clipboard
8. Paste into email, WhatsApp, or any messaging app
9. Send to donor

### For Other Users (DataEntry):
- Button is not visible (Admin only feature)
- Can still create and edit donors
- Cannot see credentials

## UI Components

### Instructions Button
- **Icon**: 📋
- **Label**: "Instrucciones"
- **Style**: Primary blue button
- **Position**: Between Edit and Delete buttons
- **Visibility**: Admin only

### Instructions Modal
- **Title**: "Instrucciones de Acceso al Sistema"
- **Sections**:
  1. Donor name (highlighted in blue)
  2. Credentials box (monospace font, gray background)
  3. Warning notice (yellow warning box)
  4. Full message preview (pre-formatted text)
- **Actions**:
  - "Cerrar" - Close modal
  - "📋 Copiar Instrucciones" - Copy to clipboard

### Credentials Display
```
┌──────────────────────────────────────────┐
│ URL: https://aliot-1.onrender.com/      │
│ Usuario: juan.perez                      │
│ Contraseña inicial: 123456               │
└──────────────────────────────────────────┘
```

## Security Considerations

✅ **Admin only** - Button only visible to System Admins  
✅ **No password storage** - Always shows default "123456"  
✅ **Warning included** - Reminds about password change requirement  
✅ **Professional format** - Ready to send to donors  
✅ **Clipboard API** - Uses secure browser clipboard API  

## Technical Details

### Username Generation
- Format: `firstname.lastname` (lowercase)
- Example: "Juan Pérez" → `juan.pérez`
- Matches the backend username generation logic

### Copy to Clipboard
- Uses `navigator.clipboard.writeText()`
- Shows alert confirmation
- Fallback: Manual copy from preview text

### Modal Styling
- Responsive design
- Maximum width: 600px
- Monospace font for credentials
- Pre-formatted text for message
- Color-coded sections

## Files Modified

### Frontend
- `frontend/src/pages/DonorsAdmin.jsx` - Added instructions button and modal

## Testing Checklist

- [ ] Log in as Admin
- [ ] Go to "Gestión de Donantes"
- [ ] Verify "📋 Instrucciones" button appears
- [ ] Click button on any donor
- [ ] Verify modal opens with correct information
- [ ] Verify username format is correct
- [ ] Click "Copiar Instrucciones"
- [ ] Paste into text editor
- [ ] Verify full message is copied
- [ ] Close modal
- [ ] Log in as DataEntry user
- [ ] Verify button does NOT appear
- [ ] Log in as ReadOnly user
- [ ] Verify cannot access Donors Admin page

## Build Status

✅ Frontend build successful  
✅ No compilation errors  
✅ Ready for deployment

## Future Enhancements

Consider adding:
- Email integration to send directly from the system
- SMS/WhatsApp integration
- Template customization
- Multi-language support
- QR code generation for easy mobile access
- Tracking when instructions were sent

## Summary

System Admins can now easily generate and copy formatted access instructions for any donor. The feature provides a professional, consistent message that includes all necessary information for donors to access their portal. The instructions are formatted and ready to paste into any communication channel.
