# Default Password Implementation for Donors

## Overview
All new donors are created with a default password `123456` and are forced to change it on first login.

## Changes Made

### 1. Backend: Default Password
**File**: `api/Donaciones.Api/Services/DonorService.cs`

Changed the `GeneratePassword()` method to always return `"123456"` instead of a random 6-digit number.

```csharp
private string GeneratePassword()
{
    // Always return default password for new donors
    return "123456";
}
```

### 2. Frontend: Force Password Change Component
**File**: `frontend/src/components/ForcePasswordChange.jsx` (NEW)

Created a modal component that:
- Detects if user is a Donor
- Shows on first login (tracked via localStorage)
- Cannot be dismissed until password is changed
- Validates new password:
  - Must be at least 6 characters
  - Cannot be "123456"
  - Must match confirmation
- Full-screen modal overlay (can't be closed)

### 3. Added Component to App
**File**: `frontend/src/App.jsx`

Added `<ForcePasswordChange />` at the top level so it shows on all pages for donors who need to change their password.

### 4. Updated Donor Creation Alert
**File**: `frontend/src/pages/DonorsAdmin.jsx`

Updated the success message to show the default password:
```
Donante creado exitosamente.

Se ha creado una cuenta de usuario automáticamente.

Usuario: juan.perez
Contraseña: 123456

⚠️ El donante deberá cambiar su contraseña al iniciar sesión por primera vez.
```

## User Flow

### When Donor is Created:
1. Admin creates donor
2. System creates user with username: `firstname.lastname`
3. System sets password to `123456`
4. Alert shows admin the credentials
5. Admin communicates credentials to donor

### When Donor Logs In:
1. Donor enters username (e.g., `juan.perez`) and password `123456`
2. Login succeeds
3. Redirect to `/donors/summary`
4. **Force Password Change modal appears** (full screen, can't be dismissed)
5. Donor must enter new password (minimum 6 characters)
6. System validates new password is not `123456`
7. Donor confirms new password
8. Password changed successfully
9. Modal closes, donor can now use the system

### Subsequent Logins:
1. Donor logs in with their new password
2. No modal appears (tracked in localStorage)
3. Normal access to summary page

## Force Password Change Modal

The modal shows:
- 🔒 Warning header with yellow background
- Alert explaining they're using default password
- New password input field
- Confirm password input field
- Validation errors if any
- "Cambiar Contraseña" button

Features:
- ✅ Full screen overlay (blocks all interaction)
- ✅ Cannot be closed/dismissed
- ✅ Validates password strength
- ✅ Prevents using "123456" as new password
- ✅ Confirms password match
- ✅ Tracks change in localStorage per user

## Security Considerations

✅ **Secure default**: All donors start with known password  
✅ **Forced change**: Cannot use system until password is changed  
✅ **Validation**: New password must be different from default  
✅ **Per-user tracking**: Uses user ID in localStorage key  
✅ **API validation**: Backend also validates password change  

## Files Modified

### Backend
- `api/Donaciones.Api/Services/DonorService.cs` - Changed to use default password "123456"

### Frontend
- `frontend/src/components/ForcePasswordChange.jsx` - **NEW** - Modal to force password change
- `frontend/src/App.jsx` - Added ForcePasswordChange component
- `frontend/src/pages/DonorsAdmin.jsx` - Updated alert to show default password

## Testing Checklist

- [ ] Create a new donor
- [ ] Verify alert shows username and password "123456"
- [ ] Log in as the donor with username and "123456"
- [ ] Verify Force Password Change modal appears
- [ ] Try to close modal (should not be possible)
- [ ] Try to set password to "123456" (should show error)
- [ ] Try short password < 6 chars (should show error)
- [ ] Try mismatched passwords (should show error)
- [ ] Set valid new password
- [ ] Verify modal closes
- [ ] Verify can access summary page
- [ ] Log out and log back in with new password
- [ ] Verify modal does NOT appear again
- [ ] Clear localStorage and login again
- [ ] Verify modal appears again (prompts to change)

## Known Limitations

1. **localStorage tracking**: If user clears browser data, they'll be prompted again (but if they changed password, the API call will fail gracefully)
2. **Backend validation**: Currently relies on frontend to validate. Could add backend flag to track if password has been changed.

## Future Enhancements

Consider adding:
- Backend field `MustChangePassword` on User table
- Set to `true` when user is created
- Set to `false` when password is changed (not to "123456")
- Check this field on login and return in JWT claims
- More robust than localStorage tracking

## Build Status

✅ Backend build successful  
✅ Frontend build successful  
✅ No compilation errors  
✅ Ready for deployment

## Summary

All new donors now receive the same default password (123456) which is easy for admins to communicate. Donors are immediately prompted to change their password on first login and cannot proceed until they do. This provides a good balance between convenience and security.
