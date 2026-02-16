# Create Missing Users Feature

## Overview
Added a bulk user creation feature in the System Admin page to automatically create user accounts for all donors that don't have one.

## Use Case
When donors are:
- Migrated from another system
- Created manually without automatic user creation
- Have their user accidentally deleted
- Added through bulk import

This feature allows admins to create all missing user accounts in one click.

## Changes Made

### Backend: New Endpoint
**File**: `api/Donaciones.Api/Program.cs`

Created `/api/admin/create-missing-users` endpoint that:

1. **Finds all donors without users**
   ```csharp
   var donorsWithoutUsers = await db.Donors
       .Where(d => d.UserId == null)
       .ToListAsync();
   ```

2. **Generates usernames** using the same logic as donor creation:
   - Format: `firstname.lastname`
   - Lowercase
   - Removes accents (á→a, é→e, etc.)
   - Handles duplicates (adds 1, 2, 3, etc.)

3. **Creates users** with:
   - Username: Generated from donor name
   - Password: `123456` (default)
   - Role: `Donor`
   - Full Name: From donor record
   - Active: `true`

4. **Links user to donor**
   - Updates `donor.UserId` with new user ID

5. **Returns statistics**:
   - `created` - Number of users created
   - `skipped` - Number of donors already with users
   - `errors` - Number of failures

### Frontend: System Admin Page
**File**: `frontend/src/pages/SystemAdmin.jsx`

Added new section with:

1. **UI Section**:
   - Icon: 👥
   - Title: "Crear Usuarios para Donantes"
   - Description
   - Success/Error messages
   - Create button

2. **Button**: "👥 Crear Usuarios Faltantes"
   - Shows loading state
   - Confirmation dialog before execution
   - Displays results

3. **Result Display**:
   - ✅ Usuarios creados: X
   - ⏭️ Donantes con usuario existente: X
   - ⚠️ Errores: X (if any)

4. **Warning Box**:
   - Explains default password is `123456`
   - Notes that donors must change it on first login

## User Flow

### Admin executes bulk creation:
1. Go to "Administración del Sistema"
2. Scroll to "Crear Usuarios para Donantes" section
3. Click "👥 Crear Usuarios Faltantes"
4. Confirm action in dialog
5. Wait for process to complete
6. Review results:
   - Number created
   - Number skipped (already had users)
   - Any errors
7. View console logs for credentials (server side)

### For each donor without user:
1. System generates username from name
2. Checks for duplicates, adds number if needed
3. Creates user with password `123456`
4. Links user to donor via `UserId`
5. Logs credentials to console
6. Continues to next donor

## Security Considerations

✅ **Admin only** - Endpoint requires Admin role  
✅ **Default password** - All users get `123456`  
✅ **Force password change** - System prompts on first login  
✅ **Console logging** - Credentials logged for admin reference  
✅ **Transaction safety** - All changes saved together  
✅ **Error handling** - Continues if one donor fails  

## Example Console Output

```
Created user for donor Juan Pérez: username=juan.perez, password=123456
Created user for donor María García: username=maria.garcia, password=123456
Created user for donor Juan Pérez: username=juan.perez1, password=123456
Error creating user for donor Invalid Name: Username generation failed
```

## API Response Example

```json
{
  "created": 25,
  "skipped": 150,
  "errors": 0
}
```

## Error Handling

- **Individual donor failures** - Logged but don't stop process
- **Database errors** - Transaction rolls back, returns error
- **Duplicate usernames** - Auto-increments counter (juan.perez1, juan.perez2, etc.)
- **Invalid names** - Caught and logged as error

## Files Modified

### Backend
- `api/Donaciones.Api/Program.cs` - Added bulk user creation endpoint

### Frontend
- `frontend/src/pages/SystemAdmin.jsx` - Added UI section and functionality

## Testing Checklist

- [ ] Log in as Admin
- [ ] Go to "Administración del Sistema"
- [ ] Verify new section appears
- [ ] Click "Crear Usuarios Faltantes"
- [ ] Verify confirmation dialog
- [ ] Confirm action
- [ ] Wait for completion
- [ ] Verify success message with counts
- [ ] Check console logs for credentials
- [ ] Go to "Usuarios del Sistema"
- [ ] Verify new users exist with Donor role
- [ ] Go to "Gestión de Donantes"
- [ ] Pick a new user donor
- [ ] Click "Instrucciones"
- [ ] Verify username matches
- [ ] Try logging in as new donor
- [ ] Verify password `123456` works
- [ ] Verify force password change prompt

## Build Status

✅ Backend build successful  
✅ Frontend build successful  
✅ No compilation errors  
✅ Ready for deployment

## Use Cases

### 1. After Data Migration
You imported 100 donors from Excel, none have users:
- Click button
- System creates 100 users
- All donors can now log in

### 2. After Manual Donor Creation
Staff created 5 donors without clicking user creation:
- Click button
- System creates 5 users
- Skips 145 existing users

### 3. After User Deletion
Accidentally deleted a user:
- Click button
- System recreates the missing user
- Donor can log in again

### 4. Mixed Scenario
Some donors have users, some don't:
- Click button
- System creates only missing users
- Reports: Created: 10, Skipped: 140, Errors: 0

## Notes

- **Idempotent**: Safe to run multiple times, only creates missing users
- **Fast**: Processes all donors in one request
- **Logged**: All credentials printed to console
- **Safe**: Errors don't stop the process
- **Complete**: Returns full statistics

## Summary

System Admins now have a one-click solution to create user accounts for all donors that don't have one. This is particularly useful after data migrations, bulk imports, or when donors are created manually without user accounts. The feature handles username conflicts automatically and provides detailed feedback on the operation results.
