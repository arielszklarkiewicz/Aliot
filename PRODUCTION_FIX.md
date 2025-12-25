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

### How to Deploy Using render.yaml (Blueprint)

**If you don't see "Blueprint" option in Render:**

Render may have changed the UI. Here's the updated process:

#### Method 1: Create from Repository (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** button in the top right
3. You should see options like:
   - Web Service
   - Static Site
   - Private Service
   - PostgreSQL
   - **Look for "YAML"** or similar option
4. If YAML option exists, select it and connect your GitHub repo

#### Method 2: Manual Approach (If YAML not available)

Since Render's UI changes, you may need to create services manually:

**Step 1: Create PostgreSQL Database**
1. Click "New +" → "PostgreSQL"
2. Name: `donaciones-db`
3. Database Name: `donaciones`
4. User: `donaciones`
5. Select free plan
6. Click "Create Database"
7. **Copy the Internal Database URL** (looks like `postgresql://...`)

**Step 2: Create API Service**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `donaciones-api`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty (or `.`)
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
4. Add Environment Variables:
   - `ASPNETCORE_ENVIRONMENT` = `Production`
   - `ConnectionStrings__Default` = (paste the PostgreSQL Internal Database URL from Step 1)
   - `Cors__AllowedOrigins` = (leave empty for now, we'll add frontend URL later)
5. **Health Check Path**: `/healthz`
6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. **Copy the API URL** (e.g., `https://donaciones-api-xxx.onrender.com`)

**Step 3: Create Frontend Service**
1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `donaciones-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
4. Add Environment Variables:
   - `REACT_APP_API_BASE_URL` = (paste the API URL from Step 2)
5. Click "Create Static Site"
6. Wait for deployment (5-10 minutes)
7. **Copy the Frontend URL** (e.g., `https://donaciones-frontend.onrender.com`)

**Step 4: Update API CORS**
1. Go back to the API service (`donaciones-api`)
2. Click "Environment" tab
3. Edit `Cors__AllowedOrigins` environment variable
4. Set value to the Frontend URL from Step 3
5. Click "Save Changes"
6. The API will redeploy automatically

**Step 5: Verify**
1. Go to your Frontend URL
2. You should be redirected to `/login`
3. Login with `admin@admin.com` / `admin123`
4. Check browser DevTools Network tab to confirm API calls are working

### Alternative: Fix Existing `aliot-1` Deployment

If you want to keep the existing deployment:

### Alternative: Fix Existing `aliot-1` Deployment

You need to create the API service first, then update `aliot-1`:

**Step 1: Create API Service** (follow Step 2 above)

**Step 2: Fix `aliot-1` Frontend**
1. Go to `aliot-1` service in Render Dashboard
2. Click "Environment" tab
3. Add environment variable:
   - Key: `REACT_APP_API_BASE_URL`
   - Value: (paste your API URL from Step 1)
4. Click "Save Changes"
5. Click "Manual Deploy" → "Deploy latest commit"
6. Wait 5-10 minutes for rebuild

**Step 3: Update API CORS**
1. Go to API service
2. Add/edit `Cors__AllowedOrigins` = `https://aliot-1.onrender.com`
3. Save and redeploy

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
