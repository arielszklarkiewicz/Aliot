# Authentication and Authorization System

This document describes the authentication and role-based authorization system implemented in the Donaciones API.

## Overview

The system implements:
- **JWT-based authentication** with username and password
- **Role-based authorization** with three user roles
- **Permission-based access control** using a centralized permission system
- **Secure password hashing** using PBKDF2 with SHA256

## User Roles

### 1. Admin
**Full access to all features**
- Can create, view, edit, and delete all data
- Can manage Concepts, Destinations, and Collectors
- Can create virtual donations and payments
- Can create and manage other users

### 2. DataEntry
**Can create, edit, delete and view everything EXCEPT:**
- Cannot manage Concepts (can view only)
- Cannot manage Destinations (can view only)
- Cannot manage Collectors (can view only)
- Can create virtual donations and payments

### 3. ReadOnly
**Limited read-only access:**
- Can view Donor Summary only
- Can view donors, donations, and payments for context
- Cannot create virtual records
- Cannot create, edit, or delete any data

## Architecture

### Permission System

Permissions are defined in `/Authorization/Permission.cs` as an enum:

```csharp
public enum Permission
{
    // Donor permissions
    ViewDonors, CreateDonors, EditDonors, DeleteDonors,
    
    // Donation permissions
    ViewDonations, CreateDonations, EditDonations, DeleteDonations, CreateVirtualDonations,
    
    // Payment permissions
    ViewPayments, CreatePayments, EditPayments, DeletePayments, CreateVirtualPayments,
    
    // Admin permissions
    ViewConcepts, ManageConcepts,
    ViewDestinations, ManageDestinations,
    ViewCollectors, ManageCollectors,
    
    // Reports and Summary
    ViewReports, ViewDonorSummary
}
```

### Role-Permission Mapping

The mapping between roles and permissions is centralized in `/Authorization/RolePermissions.cs`:

```csharp
public static class RolePermissions
{
    private static readonly Dictionary<UserRole, HashSet<Permission>> _rolePermissions;
    
    public static bool HasPermission(this UserRole role, Permission permission)
    public static IEnumerable<Permission> GetPermissions(this UserRole role)
}
```

This makes it easy to:
- See all permissions for a role at a glance
- Add new permissions
- Modify role capabilities
- Add new roles

## Authentication Flow

### 1. Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 28800,
  "user": {
    "id": "guid",
    "username": "admin",
    "fullName": "System Administrator",
    "email": "admin@donaciones.local",
    "role": "Admin",
    "permissions": ["ViewDonors", "CreateDonors", ...]
  }
}
```

### 2. Using the Token

Include the token in the `Authorization` header:
```
Authorization: Bearer <token>
```

### 3. Get Current User

**Endpoint:** `GET /api/auth/me`

Returns information about the currently authenticated user including their permissions.

### 4. Change Password

**Endpoint:** `POST /api/auth/change-password`

**Request:**
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}
```

## Authorization

### Protecting Endpoints

Endpoints are protected using the `.RequirePermission()` extension method:

```csharp
app.MapGet("/api/donors", async (IDonorService svc, ...) => {
    // handler code
})
.RequirePermission(Permission.ViewDonors);
```

### Permission Checks in Code

For additional runtime checks (e.g., virtual donations):

```csharp
var userRole = httpContext.User.GetUserRole();
if (userRole == null || !userRole.Value.HasPermission(Permission.CreateVirtualDonations))
{
    return Results.Forbid();
}
```

### Helper Extensions

The `/Authorization/AuthorizationExtensions.cs` provides useful helpers:

```csharp
// Get user role
UserRole? role = httpContext.User.GetUserRole();

// Get user ID
Guid? userId = httpContext.User.GetUserId();

// Get username
string? username = httpContext.User.GetUsername();
```

## User Management

### Creating Users (Admin Only)

**Endpoint:** `POST /api/auth/users`

**Request:**
```json
{
  "username": "john.doe",
  "password": "securepass123",
  "role": "DataEntry",
  "fullName": "John Doe",
  "email": "john@example.com"
}
```

### Default Admin User

On first run, a default admin user is automatically created:
- **Username:** `admin`
- **Password:** `admin123`
- **⚠️ IMPORTANT:** Change this password immediately after first login!

## Configuration

### JWT Settings

Configure in `appsettings.json` or environment variables:

```json
{
  "Jwt": {
    "Secret": "YourSecretKeyThatIsAtLeast32CharactersLong",
    "Issuer": "Donaciones.Api",
    "Audience": "Donaciones.Client",
    "ExpiryMinutes": "480"
  }
}
```

Environment variables (for production):
- `Jwt__Secret`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__ExpiryMinutes`

**⚠️ IMPORTANT:** Always use a strong, randomly generated secret in production.

## Security Features

### Password Hashing
- **Algorithm:** PBKDF2 with SHA256
- **Salt:** 16 bytes, randomly generated per user
- **Iterations:** 100,000
- **Hash size:** 32 bytes

### Token Security
- JWT tokens are signed using HMAC-SHA256
- Tokens have configurable expiration (default: 8 hours)
- No refresh tokens (re-authenticate when expired)

## Adding New Permissions

1. Add the permission to the `Permission` enum:
```csharp
public enum Permission
{
    // ... existing permissions
    MyNewPermission
}
```

2. Add the permission to appropriate roles in `RolePermissions.cs`:
```csharp
[UserRole.Admin] = new HashSet<Permission>
{
    // ... existing permissions
    Permission.MyNewPermission
}
```

3. Protect endpoints with the new permission:
```csharp
app.MapGet("/api/my-endpoint", async () => { ... })
    .RequirePermission(Permission.MyNewPermission);
```

## Adding New Roles

1. Add the role to the `UserRole` enum:
```csharp
public enum UserRole
{
    Admin = 1,
    DataEntry = 2,
    ReadOnly = 3,
    MyNewRole = 4
}
```

2. Define permissions for the new role in `RolePermissions.cs`:
```csharp
[UserRole.MyNewRole] = new HashSet<Permission>
{
    Permission.ViewDonors,
    Permission.ViewDonations,
    // ... other permissions
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    full_name VARCHAR,
    email VARCHAR,
    role INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ
);
```

## Testing

### Test Users

Create test users for each role:

```bash
# Admin (already created by default)
username: admin
password: admin123

# Create DataEntry user (via API as admin)
POST /api/auth/users
{
  "username": "dataentry",
  "password": "pass123",
  "role": "DataEntry"
}

# Create ReadOnly user (via API as admin)
POST /api/auth/users
{
  "username": "readonly",
  "password": "pass123",
  "role": "ReadOnly"
}
```

### Test Scenarios

1. **Login as Admin** - Should have access to everything
2. **Login as DataEntry** - Should be able to create/edit data but not manage Concepts/Destinations/Collectors
3. **Login as ReadOnly** - Should only be able to view summaries, not create/edit anything
4. **Try creating virtual donation as ReadOnly** - Should be forbidden
5. **Try accessing admin endpoints as DataEntry** - Should be forbidden

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` - Login (no auth required)
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/change-password` - Change password (requires auth)
- `POST /api/auth/users` - Create user (requires Admin role)

### Protected Endpoints
All other endpoints now require authentication and specific permissions. See the Permission enum for the complete list of protected resources.

## Troubleshooting

### "JWT secret is not configured" error
Set the `Jwt:Secret` configuration value.

### "Unauthorized" on valid token
- Check token hasn't expired
- Verify the JWT secret matches between token creation and validation
- Ensure Authorization header format: `Bearer <token>`

### "Forbidden" with valid token
- User doesn't have required permission
- Check role-permission mapping in `RolePermissions.cs`

## Best Practices

1. **Always use HTTPS in production** - JWT tokens should never be transmitted over HTTP
2. **Change default admin password** - Immediately after first deployment
3. **Use strong JWT secrets** - Generate random 32+ character secrets
4. **Store JWT secret securely** - Use environment variables or secret management services
5. **Implement token refresh** - Consider adding refresh tokens for better UX (future enhancement)
6. **Audit user actions** - Log sensitive operations (future enhancement)
7. **Implement rate limiting** - Prevent brute force attacks (future enhancement)

## Future Enhancements

- Refresh tokens for seamless session renewal
- Two-factor authentication (2FA)
- Password reset functionality
- User activity logging and audit trail
- Account lockout after failed login attempts
- Password complexity requirements
- Session management and revocation
- OAuth2/OpenID Connect integration
