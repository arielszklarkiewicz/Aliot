# User Administration Guide

This guide covers the user administration features for managing system users.

## Overview

Administrators can manage users through dedicated endpoints that allow:
- Viewing all users
- Creating new users
- Updating user information
- Changing user passwords (without requiring current password)
- Activating/deactivating users
- Deleting users

## Permissions

Only users with the **Admin** role have access to user management features:
- `ViewUsers` - View user list and details
- `ManageUsers` - Create, update, delete users and change passwords

## API Endpoints

### 1. List All Users

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 20) - Items per page

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "email": "admin@admin.com",
      "fullName": "System Administrator",
      "role": "Admin",
      "isActive": true,
      "createdAt": "2024-12-25T15:00:00Z",
      "updatedAt": null
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

**Example:**
```bash
curl -X GET http://localhost:5047/api/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. Get User Details

**Endpoint:** `GET /api/admin/users/{id}`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "DataEntry",
  "isActive": true,
  "createdAt": "2024-12-25T15:00:00Z",
  "updatedAt": "2024-12-25T16:00:00Z"
}
```

**Example:**
```bash
curl -X GET http://localhost:5047/api/admin/users/{userId} \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. Create New User

**Endpoint:** `POST /api/auth/users`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "DataEntry",
  "fullName": "New User"
}
```

**Roles:** `Admin`, `DataEntry`, `ReadOnly`

**Response:**
```json
{
  "id": "uuid",
  "email": "newuser@example.com",
  "fullName": "New User",
  "role": "DataEntry",
  "isActive": true
}
```

**Example:**
```bash
curl -X POST http://localhost:5047/api/auth/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "role": "DataEntry",
    "fullName": "New User"
  }'
```

---

### 4. Update User Information

**Endpoint:** `PUT /api/admin/users/{id}`

**Request Body:**
```json
{
  "fullName": "Updated Name"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "Updated Name",
  "role": "DataEntry",
  "isActive": true
}
```

**Example:**
```bash
curl -X PUT http://localhost:5047/api/admin/users/{userId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Updated Name"
  }'
```

---

### 5. Change User Password (Admin)

**Endpoint:** `POST /api/admin/users/{id}/change-password`

**Request Body:**
```json
{
  "userId": "uuid",
  "newPassword": "newpassword123"
}
```

**Notes:**
- Admin can change any user's password without knowing current password
- Minimum password length: 6 characters
- Password is automatically hashed with PBKDF2-SHA256

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:5047/api/admin/users/{userId}/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-here",
    "newPassword": "newpassword123"
  }'
```

---

### 6. Toggle User Active Status

**Endpoint:** `POST /api/admin/users/{id}/toggle-active`

**Description:** Activates an inactive user or deactivates an active user

**Response:**
```json
{
  "isActive": false,
  "message": "User deactivated successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:5047/api/admin/users/{userId}/toggle-active \
  -H "Authorization: Bearer $TOKEN"
```

---

### 7. Delete User

**Endpoint:** `DELETE /api/admin/users/{id}`

**Notes:**
- Admin cannot delete their own account
- Returns 400 Bad Request if attempting to delete self
- Permanently removes user from database

**Response:** `204 No Content`

**Example:**
```bash
curl -X DELETE http://localhost:5047/api/admin/users/{userId} \
  -H "Authorization: Bearer $TOKEN"
```

---

## User Self-Service

Users can change their own password using:

**Endpoint:** `POST /api/auth/change-password`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Notes:**
- Requires current password verification
- Users can only change their own password
- Different from admin password change

**Example:**
```bash
curl -X POST http://localhost:5047/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpassword",
    "newPassword": "newpassword123"
  }'
```

---

## Common Workflows

### Create a New Data Entry User

```bash
# 1. Login as admin
TOKEN=$(curl -X POST http://localhost:5047/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123"}' \
  | jq -r '.accessToken')

# 2. Create user
curl -X POST http://localhost:5047/api/auth/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dataentry@example.com",
    "password": "initialpass",
    "role": "DataEntry",
    "fullName": "Data Entry Person"
  }'
```

### Reset User Password

```bash
# Admin resets password for user
curl -X POST http://localhost:5047/api/admin/users/{userId}/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "newPassword": "resetpassword123"
  }'
```

### Deactivate User

```bash
# Toggle user to inactive
curl -X POST http://localhost:5047/api/admin/users/{userId}/toggle-active \
  -H "Authorization: Bearer $TOKEN"
```

### View All Users

```bash
# List all users with pagination
curl -X GET "http://localhost:5047/api/admin/users?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Security Notes

1. **Password Changes:**
   - Admin password changes don't require current password
   - User self-service password changes require current password
   - All passwords hashed with PBKDF2-SHA256 (100,000 iterations)

2. **User Deletion:**
   - Admins cannot delete themselves
   - Deletion is permanent (consider deactivation instead)

3. **Active Status:**
   - Inactive users cannot login
   - Existing sessions remain valid until token expiration
   - Consider inactive as "soft delete"

4. **Permissions:**
   - Only Admin role can manage users
   - DataEntry and ReadOnly cannot access user management

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Cannot delete your own account"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Please login to access this resource"
}
```

### 403 Forbidden
User doesn't have required permissions (not an Admin)

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 409 Conflict
```json
{
  "error": "Email already exists"
}
```

---

## Frontend Integration Example

```javascript
// UserManagement.jsx
import { useState, useEffect } from 'react';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const token = localStorage.getItem('accessToken');

  // Load users
  useEffect(() => {
    fetch('http://localhost:5047/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data.items));
  }, []);

  // Change password
  const changePassword = async (userId, newPassword) => {
    await fetch(`http://localhost:5047/api/admin/users/${userId}/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, newPassword })
    });
    alert('Password changed successfully');
  };

  // Toggle active
  const toggleActive = async (userId) => {
    await fetch(`http://localhost:5047/api/admin/users/${userId}/toggle-active`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Reload users
  };

  return (
    <div>
      <h1>User Management</h1>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.fullName}</td>
              <td>{user.role}</td>
              <td>{user.isActive ? 'Active' : 'Inactive'}</td>
              <td>
                <button onClick={() => {
                  const newPassword = prompt('Enter new password:');
                  if (newPassword) changePassword(user.id, newPassword);
                }}>
                  Change Password
                </button>
                <button onClick={() => toggleActive(user.id)}>
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Summary

The user administration system provides:
- ✅ Complete user management for admins
- ✅ Password reset without requiring current password
- ✅ User activation/deactivation
- ✅ Safe user deletion with self-protection
- ✅ Paginated user listing
- ✅ Role-based access control
- ✅ Comprehensive audit logging

**All operations require Admin role permissions.**
