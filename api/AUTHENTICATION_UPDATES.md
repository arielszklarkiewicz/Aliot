# Authentication System - Updates

## Changes Made (December 25, 2024)

### 1. ✅ Email-Based Authentication

**Changed from username to email:**
- Login now requires email address instead of username
- Email validation added to all authentication endpoints
- Unique constraint on email field in database
- Email addresses are stored in lowercase for consistency

**Updated Models:**
- `User` model: Replaced `Username` field with `Email`
- `LoginCredentials`: Changed from `username` to `email` with `[EmailAddress]` validation
- `CreateUserRequest`: Uses email instead of username
- `UserInfo` (response): Returns email instead of username

### 2. ✅ Default Admin User

**New default credentials:**
```
Email: admin@admin.com
Password: admin123
```

⚠️ **IMPORTANT:** Change this password immediately after first login!

### 3. ✅ Automatic Login Redirect

**For unauthenticated users:**
- API endpoints (`/api/*`) return 401 Unauthorized with JSON response
- Non-API requests automatically redirect to `/login`
- Implemented in JWT Bearer authentication events

**Response behavior:**
```csharp
// API request without auth
GET /api/donors
→ 401 Unauthorized
→ { "error": "Unauthorized", "message": "Please login to access this resource" }

// Web page without auth
GET /dashboard
→ 302 Redirect to /login
```

### 4. ✅ Migration Fixed

**New migration:** `AddUserAuthenticationWithEmail`
- Users table with `email` field (unique, required)
- Removed `username` field
- Password hashing with PBKDF2-SHA256
- Role-based access control

## API Changes

### Login Endpoint

**Before:**
```json
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

**After:**
```json
POST /api/auth/login
{
  "email": "admin@admin.com",
  "password": "admin123"
}
```

### Response Structure

**Before:**
```json
{
  "accessToken": "...",
  "expiresIn": 28800,
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@donaciones.local",
    "fullName": "System Administrator",
    "role": "Admin",
    "permissions": [...]
  }
}
```

**After:**
```json
{
  "accessToken": "...",
  "expiresIn": 28800,
  "user": {
    "id": "...",
    "email": "admin@admin.com",
    "fullName": "System Administrator",
    "role": "Admin",
    "permissions": [...]
  }
}
```

### Create User Endpoint

**Before:**
```json
POST /api/auth/users
{
  "username": "john",
  "password": "pass123",
  "role": "DataEntry",
  "fullName": "John Doe",
  "email": "john@example.com"
}
```

**After:**
```json
POST /api/auth/users
{
  "email": "john@example.com",
  "password": "pass123",
  "role": "DataEntry",
  "fullName": "John Doe"
}
```

## JWT Token Claims

**Updated claims structure:**
```
ClaimTypes.NameIdentifier → User ID
ClaimTypes.Email → User email address
ClaimTypes.Role → User role (Admin/DataEntry/ReadOnly)
"fullName" → User's full name
```

## Database Schema

**Users table:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,  -- Changed from username
    password_hash VARCHAR NOT NULL,
    full_name VARCHAR,
    role INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX ix_users_email ON users(email);
```

## Testing

### Test Login with cURL

```bash
# Login with email
curl -X POST http://localhost:5047/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@admin.com",
    "password": "admin123"
  }'

# Save token
TOKEN="<your-token-here>"

# Test authenticated request
curl -X GET http://localhost:5047/api/donors \
  -H "Authorization: Bearer $TOKEN"

# Test unauthenticated request (should get 401)
curl -X GET http://localhost:5047/api/donors
```

### Test Create User

```bash
curl -X POST http://localhost:5047/api/auth/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dataentry@example.com",
    "password": "pass123",
    "role": "DataEntry",
    "fullName": "Data Entry User"
  }'
```

## Frontend Integration Changes

### Update Login Form

**Before:**
```javascript
const loginData = {
  username: usernameInput.value,
  password: passwordInput.value
};
```

**After:**
```javascript
const loginData = {
  email: emailInput.value,  // Changed from username
  password: passwordInput.value
};
```

### Update User Display

**Before:**
```javascript
const user = response.user;
console.log(`Logged in as: ${user.username}`);
```

**After:**
```javascript
const user = response.user;
console.log(`Logged in as: ${user.email}`);
```

### Update localStorage

User object now contains `email` instead of `username`:
```javascript
localStorage.setItem('user', JSON.stringify({
  id: user.id,
  email: user.email,  // Changed from username
  fullName: user.fullName,
  role: user.role,
  permissions: user.permissions
}));
```

## Migration Steps

### If Updating Existing Installation

1. **Backup your database** (if using production data)

2. **Stop the application**

3. **Pull latest changes**
   ```bash
   git pull origin main
   ```

4. **Run migration**
   ```bash
   cd api/Donaciones.Api
   dotnet ef database update
   ```

5. **Update existing users** (if any):
   ```sql
   -- If you have existing users with usernames, you'll need to add emails
   -- This is a manual process if you have existing data
   UPDATE users 
   SET email = CONCAT(username, '@yourdomain.com')
   WHERE email IS NULL;
   ```

6. **Restart application**

7. **Update frontend** to use email in login form

8. **Test login** with new email-based authentication

## Breaking Changes

⚠️ **These changes are breaking if you have existing users:**

1. **User model changed:** `Username` → `Email`
2. **Login requires email** instead of username
3. **JWT claims changed:** Uses email instead of username
4. **Default admin credentials changed:** Use `admin@admin.com` instead of `admin`

## Security Notes

- Email addresses are stored in lowercase for consistency
- Email validation is enforced at the model level
- Unique constraint ensures no duplicate email addresses
- Password hashing remains unchanged (PBKDF2-SHA256)
- JWT token security unchanged

## Summary

✅ Authentication now uses email addresses (more professional)
✅ Default admin user: `admin@admin.com` / `admin123`
✅ Automatic redirect to login for unauthenticated users
✅ Migration fixed and working correctly
✅ All endpoints updated to use email
✅ JWT claims updated to use email
✅ Comprehensive validation on email fields

**All changes committed and pushed to GitHub!**
