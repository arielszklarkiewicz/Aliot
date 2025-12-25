# Authentication & Authorization - Usage Examples

This document provides practical code examples for implementing and using the authentication and authorization system.

## Table of Contents
- [Backend Examples](#backend-examples)
- [Frontend/Client Examples](#frontendclient-examples)
- [Adding New Features](#adding-new-features)

## Backend Examples

### Example 1: Adding a New Protected Endpoint

```csharp
// Simple endpoint with single permission
app.MapGet("/api/my-resource", async (AppDbContext db) => {
    var data = await db.MyResources.ToListAsync();
    return Results.Ok(data);
})
.RequirePermission(Permission.ViewMyResource);

// Endpoint with complex authorization logic
app.MapPost("/api/my-resource", async (
    AppDbContext db, 
    HttpContext httpContext, 
    MyResourceDto dto) => 
{
    // Get current user's role
    var userRole = httpContext.User.GetUserRole();
    
    // Custom permission check
    if (dto.IsSpecialType && !userRole.Value.HasPermission(Permission.ManageSpecialResources))
    {
        return Results.Forbid();
    }
    
    // Create resource
    var resource = new MyResource { /* ... */ };
    db.MyResources.Add(resource);
    await db.SaveChangesAsync();
    
    return Results.Created($"/api/my-resource/{resource.Id}", resource);
})
.RequirePermission(Permission.CreateMyResource);
```

### Example 2: Adding a New Permission

**Step 1:** Add to Permission enum
```csharp
// In /Authorization/Permission.cs
public enum Permission
{
    // ... existing permissions
    
    // MyResource permissions
    ViewMyResource,
    CreateMyResource,
    EditMyResource,
    DeleteMyResource,
    ManageSpecialResources
}
```

**Step 2:** Add to role permissions
```csharp
// In /Authorization/RolePermissions.cs
[UserRole.Admin] = new HashSet<Permission>
{
    // ... existing permissions
    Permission.ViewMyResource,
    Permission.CreateMyResource,
    Permission.EditMyResource,
    Permission.DeleteMyResource,
    Permission.ManageSpecialResources
},

[UserRole.DataEntry] = new HashSet<Permission>
{
    // ... existing permissions
    Permission.ViewMyResource,
    Permission.CreateMyResource,
    Permission.EditMyResource,
    Permission.DeleteMyResource
    // Note: NOT ManageSpecialResources
}
```

### Example 3: Using Claims and User Context

```csharp
app.MapPost("/api/audit-log", async (
    AppDbContext db,
    HttpContext httpContext,
    AuditLogDto dto) => 
{
    // Get user information from claims
    var userId = httpContext.User.GetUserId();
    var username = httpContext.User.GetUsername();
    var userRole = httpContext.User.GetUserRole();
    
    var auditLog = new AuditLog
    {
        Id = Guid.NewGuid(),
        UserId = userId.Value,
        Username = username,
        UserRole = userRole.ToString(),
        Action = dto.Action,
        ResourceType = dto.ResourceType,
        ResourceId = dto.ResourceId,
        Timestamp = DateTimeOffset.UtcNow
    };
    
    db.AuditLogs.Add(auditLog);
    await db.SaveChangesAsync();
    
    return Results.Created($"/api/audit-log/{auditLog.Id}", auditLog);
})
.RequireAuthorization(); // Any authenticated user
```

### Example 4: Custom Authorization Filter

```csharp
// Create a reusable filter for checking multiple permissions
public static IEndpointConventionBuilder RequireAnyPermission(
    this IEndpointConventionBuilder builder,
    params Permission[] permissions)
{
    return builder.AddEndpointFilter(async (context, next) =>
    {
        var httpContext = context.HttpContext;
        
        if (!httpContext.User.Identity?.IsAuthenticated ?? true)
            return Results.Unauthorized();

        var roleClaim = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
        if (!Enum.TryParse<UserRole>(roleClaim, out var userRole))
            return Results.Forbid();

        // Check if user has ANY of the specified permissions
        if (!permissions.Any(p => userRole.HasPermission(p)))
            return Results.Forbid();

        return await next(context);
    });
}

// Usage
app.MapGet("/api/dashboard", async () => {
    return Results.Ok(new { message = "Dashboard data" });
})
.RequireAnyPermission(Permission.ViewReports, Permission.ViewDonorSummary);
```

## Frontend/Client Examples

### Example 1: Login Flow (JavaScript/TypeScript)

```typescript
// authService.ts
interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    fullName: string;
    email?: string;
    role: string;
    permissions: string[];
  };
}

class AuthService {
  private readonly API_URL = 'http://localhost:5000/api';
  
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    
    // Store token
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  }
  
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }
  
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }
  
  getCurrentUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }
  
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
  
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions?.includes(permission) ?? false;
  }
  
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }
}

export const authService = new AuthService();
```

### Example 2: Making Authenticated Requests

```typescript
// apiClient.ts
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`http://localhost:5000${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });
  
  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  
  if (response.status === 403) {
    throw new Error('Forbidden: You do not have permission to access this resource');
  }
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}

// Usage examples
export const donorsApi = {
  list: (params?: any) => 
    apiRequest('/api/donors', { method: 'GET' }),
    
  create: (donor: any) => 
    apiRequest('/api/donors', {
      method: 'POST',
      body: JSON.stringify(donor)
    }),
    
  update: (id: string, donor: any) => 
    apiRequest(`/api/donors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(donor)
    }),
    
  delete: (id: string) => 
    apiRequest(`/api/donors/${id}`, { method: 'DELETE' })
};
```

### Example 3: React Component with Permission Checks

```typescript
// ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { authService } from './authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredPermission,
  requiredRole 
}: ProtectedRouteProps) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredPermission && !authService.hasPermission(requiredPermission)) {
    return <Navigate to="/forbidden" replace />;
  }
  
  if (requiredRole && !authService.hasRole(requiredRole)) {
    return <Navigate to="/forbidden" replace />;
  }
  
  return <>{children}</>;
}

// Usage in router
<Routes>
  <Route path="/login" element={<LoginPage />} />
  
  <Route path="/donors" element={
    <ProtectedRoute requiredPermission="ViewDonors">
      <DonorsPage />
    </ProtectedRoute>
  } />
  
  <Route path="/admin/concepts" element={
    <ProtectedRoute requiredPermission="ManageConcepts">
      <ConceptsManagementPage />
    </ProtectedRoute>
  } />
  
  <Route path="/admin/users" element={
    <ProtectedRoute requiredRole="Admin">
      <UserManagementPage />
    </ProtectedRoute>
  } />
</Routes>
```

### Example 4: React Hook for Permissions

```typescript
// useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from './authService';

export function useAuth() {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  
  useEffect(() => {
    const checkAuth = () => {
      setUser(authService.getCurrentUser());
      setIsAuthenticated(authService.isAuthenticated());
    };
    
    // Listen for storage changes (logout in another tab)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);
  
  const login = async (username: string, password: string) => {
    const response = await authService.login({ username, password });
    setUser(response.user);
    setIsAuthenticated(true);
    return response;
  };
  
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) ?? false;
  };
  
  const hasRole = (role: string) => {
    return user?.role === role;
  };
  
  return {
    user,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole
  };
}

// Usage in component
function DonorsList() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('CreateDonors');
  const canEdit = hasPermission('EditDonors');
  const canDelete = hasPermission('DeleteDonors');
  
  return (
    <div>
      <h1>Donors</h1>
      {canCreate && <button>Create New Donor</button>}
      
      <table>
        {/* Donor list */}
        <tr>
          <td>John Doe</td>
          <td>
            {canEdit && <button>Edit</button>}
            {canDelete && <button>Delete</button>}
          </td>
        </tr>
      </table>
    </div>
  );
}
```

## Adding New Features

### Scenario: Adding User Activity Logging

**Step 1:** Add Permission
```csharp
public enum Permission
{
    // ... existing
    ViewAuditLogs,
    ManageAuditLogs
}
```

**Step 2:** Add to Admin Role
```csharp
[UserRole.Admin] = new HashSet<Permission>
{
    // ... existing
    Permission.ViewAuditLogs,
    Permission.ManageAuditLogs
}
```

**Step 3:** Create Model
```csharp
public class AuditLog
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Username { get; set; }
    public string Action { get; set; }
    public string ResourceType { get; set; }
    public Guid? ResourceId { get; set; }
    public DateTimeOffset Timestamp { get; set; }
}
```

**Step 4:** Add to DbContext
```csharp
public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
```

**Step 5:** Create Endpoints
```csharp
app.MapGet("/api/audit-logs", async (AppDbContext db, int page = 1, int pageSize = 50) =>
{
    var logs = await db.AuditLogs
        .OrderByDescending(x => x.Timestamp)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();
    
    return Results.Ok(logs);
})
.RequirePermission(Permission.ViewAuditLogs);
```

**Step 6:** Log Actions
```csharp
private async Task LogAction(AppDbContext db, HttpContext httpContext, string action, string resourceType, Guid? resourceId)
{
    var userId = httpContext.User.GetUserId();
    var username = httpContext.User.GetUsername();
    
    var log = new AuditLog
    {
        Id = Guid.NewGuid(),
        UserId = userId.Value,
        Username = username,
        Action = action,
        ResourceType = resourceType,
        ResourceId = resourceId,
        Timestamp = DateTimeOffset.UtcNow
    };
    
    db.AuditLogs.Add(log);
    await db.SaveChangesAsync();
}
```

## Testing with cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Save the token from response
TOKEN="your_token_here"

# Make authenticated request
curl -X GET http://localhost:5000/api/donors \
  -H "Authorization: Bearer $TOKEN"

# Create user (Admin only)
curl -X POST http://localhost:5000/api/auth/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"newuser",
    "password":"pass123",
    "role":"DataEntry",
    "fullName":"New User"
  }'

# Get current user info
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Summary

The authentication and authorization system is designed to be:
- **Extensible**: Easy to add new permissions and roles
- **Maintainable**: Centralized permission management
- **Secure**: Industry-standard password hashing and JWT
- **Flexible**: Fine-grained permission checks at endpoint and code level
- **Type-safe**: Compile-time checking with enums and extension methods

For more information, see [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md).
