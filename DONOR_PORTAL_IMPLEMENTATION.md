# Donor Portal Implementation

## Overview
Added a new "Donor" user role that allows donors to access their own summary page with read-only access to their donations and payments.

## Changes Made

### 1. Database Schema
- **Added `UserId` column to `Donors` table** (nullable Guid)
  - Links a donor to their user account
  - Migration: `AddUserIdToDonor`

### 2. User Role
- **Added `Donor` role to `UserRole` enum** (value: 4)
  - Located in: `Models/UserRole.cs`
  
### 3. Permissions
- **Added Donor role permissions** in `Authorization/RolePermissions.cs`
  - Donors can only access: `ViewDonorSummary`
  - Cannot create, edit, or delete any data

### 4. Automatic User Creation
- **Modified `DonorService.CreateAsync`** to automatically create user accounts
  - Username format: `[FirstName].[LastName]` (lowercase, no spaces)
  - If username exists, appends numbers (1, 2, 3, etc.)
  - Password: Auto-generated 6-digit number (100000-999999)
  - User role: `Donor`
  - Links user to donor via `UserId` field

### 5. Access Control
- **Modified `/api/donors/{id:guid}/summary` endpoint**
  - Donors can only view their own summary
  - Returns `403 Forbid` if donor tries to access another donor's summary
  - Other roles (Admin, DataEntry, ReadOnly) can view any donor

## How It Works

### When Creating a Donor:
1. Admin/DataEntry creates a donor through the UI
2. Backend automatically:
   - Generates username: `[firstname].[lastname]`
   - Generates 6-digit password
   - Creates user account with `Donor` role
   - Links user to donor record

### Donor Login:
1. Donor logs in with their username and password
2. They can only access: `/donors/summary` page
3. The page automatically shows ONLY their own information
4. No access to create/edit/delete functionality

## Frontend Changes Needed

### 1. Update Login Page
- No changes needed - existing login works

### 2. Update Navigation (for Donor role)
- Hide all menu items except "Resumen de Donante"
- Auto-redirect to their summary page after login

### 3. Update DonorSummary Page
- For Donor role: automatically use their own donor ID
- Hide the donor search/selection UI
- Show read-only view of their donations and payments

## Example User Credentials
When a donor named "Juan Perez" is created:
- **Username**: `juan.perez`
- **Password**: (e.g.) `347821` (auto-generated)
- **Role**: Donor
- **Access**: Can only view their own summary

If another "Juan Perez" is created:
- **Username**: `juan.perez1`
- **Password**: (e.g.) `892341`

## Security Notes
- Donors cannot see other donors' data
- Donors cannot modify any data
- Password is auto-generated (admin should communicate it securely to donor)
- Future enhancement: Add password reset functionality for donors

## Testing
To test:
1. Create a new donor through the UI
2. Check the Users table for the auto-created user
3. Log in with the generated username/password
4. Verify you can only see that donor's summary
5. Try accessing another donor's summary (should fail)

## Database Migration
```bash
cd api/Donaciones.Api
dotnet ef database update
```

## Files Modified
- `Models/UserRole.cs` - Added Donor role
- `Models/Donor.cs` - Added UserId field
- `Services/DonorService.cs` - Auto-create user logic
- `Authorization/RolePermissions.cs` - Donor permissions
- `Program.cs` - Access control for donor summary endpoint
- `Migrations/20260215044837_AddUserIdToDonor.cs` - DB migration
