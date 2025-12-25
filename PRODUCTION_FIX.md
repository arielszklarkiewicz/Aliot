# Production Deployment Issue - Diagnosis and Fix

## Problems Found

### 1. Login gives 404 Not Found
The URL `https://aliot-1.onrender.com/login` returns "Not Found" because Render's static hosting isn't serving the SPA correctly.

### 2. API calls going to localhost
The frontend at https://aliot-1.onrender.com/ is trying to call the API at `http://localhost:5047` instead of the production API URL.

## Root Causes

### Issue 1: SPA Routing Not Configured
Render static sites need the `_redirects` file to be in the published directory. The file exists at `frontend/public/_redirects` but Render might not be seeing it, or the site wasn't deployed using the Blueprint method.

### Issue 2: Missing Environment Variable
The React app build is missing the `REACT_APP_API_BASE_URL` environment variable, so it defaults to localhost as configured in `frontend/src/api/client.js`:

```javascript
baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5047',
```

## Solution

### Option 1: Deploy Using render.yaml (Recommended)

The project has a `render.yaml` file that defines TWO services:
- `donaciones-api` - Backend API (.NET)
- `donaciones-frontend` - Frontend (React static site)

**Steps:**
1. Go to Render Dashboard
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Select the repo with the `render.yaml` file
5. Render will automatically create BOTH services with proper environment variables linked

This will:
- Create the PostgreSQL database
- Deploy the API with correct DB connection
- Deploy the frontend with `REACT_APP_API_BASE_URL` automatically pointing to the API
- Configure CORS on the API to allow the frontend

### Option 2: Manual Fix (Current Deployment)

If you want to fix the existing `aliot-1` deployment:

1. **Deploy the API first** (if not already deployed):
   - Create a new Web Service on Render
   - Connect to GitHub repo
   - Use Dockerfile
   - Set environment variables:
     - `ConnectionStrings__Default` → (PostgreSQL connection string)
     - `Cors__AllowedOrigins` → `https://aliot-1.onrender.com`
   - Note the API URL (e.g., `https://aliot-1-api.onrender.com`)

2. **Fix the Frontend**:
   - Go to `aliot-1` service in Render Dashboard
   - Click "Environment" tab
   - Add environment variable:
     - Key: `REACT_APP_API_BASE_URL`
     - Value: `https://aliot-1-api.onrender.com` (your actual API URL)
   - Click "Save"
   - Go to "Manual Deploy" and click "Deploy latest commit"

3. **Wait for rebuild** (5-10 minutes)
   - The frontend needs to be rebuilt with the new environment variable
   - The variable is baked into the JavaScript bundle at build time

## Verification

After deploying:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to https://aliot-1.onrender.com/
4. Try to login with admin@admin.com / admin123
5. Check the network requests - they should go to your production API URL, not localhost

## Current Status

- ✅ Frontend is deployed and accessible at https://aliot-1.onrender.com/
- ✅ `_redirects` file exists in `frontend/public/_redirects` for SPA routing
- ❌ Routes like `/login` return 404 (SPA routing not working)
- ❌ API is not accessible (or not deployed)
- ❌ Frontend is configured to call localhost instead of production API
- ❌ Login will fail because browser can't reach localhost:5047

## Quick Fix

The `aliot-1` service appears to be a manual deployment that's incomplete. The best solution is to **delete it and redeploy properly** using the Blueprint method which will:

1. ✅ Configure SPA routing automatically
2. ✅ Create both API and frontend services
3. ✅ Link them with correct environment variables
4. ✅ Set up the database
5. ✅ Configure CORS properly

## Recommended Action

**Delete the `aliot-1` service and use Option 1** (Blueprint deployment with render.yaml) for a clean, properly configured deployment with both services, routing, and environment variables set correctly.
