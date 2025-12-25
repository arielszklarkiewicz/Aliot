# Production Deployment Issue - Diagnosis and Fix

## Problem
The frontend at https://aliot-1.onrender.com/ is not working because it's trying to call the API at `http://localhost:5047` instead of the production API URL.

## Root Cause
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
- ❌ API is not accessible (or not deployed)
- ❌ Frontend is configured to call localhost instead of production API
- ❌ Login will fail because browser can't reach localhost:5047

## Recommended Action

Use **Option 1** (Blueprint deployment with render.yaml) for a clean, properly configured deployment with both services linked correctly.
