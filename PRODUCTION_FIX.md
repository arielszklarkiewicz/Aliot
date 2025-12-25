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

### Option 1: Use render.yaml (Infrastructure as Code)

Your project has a `render.yaml` file that defines all services! This is the best way to deploy.

**render.yaml content:**
```yaml
services:
  # Backend API (.NET)
  - type: web
    name: donaciones-api
    runtime: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    envVars:
      - key: ASPNETCORE_ENVIRONMENT
        value: Production
      - key: ConnectionStrings__Default
        fromDatabase:
          name: donaciones-db
          property: connectionString
      - key: Cors__AllowedOrigins
        fromService:
          type: web
          name: donaciones-frontend
          property: url
    healthCheckPath: /healthz

  # Frontend (React)
  - type: web
    name: donaciones-frontend
    runtime: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: ./frontend/build
    envVars:
      - key: REACT_APP_API_BASE_URL
        fromService:
          type: web
          name: donaciones-api
          property: url

databases:
  - name: donaciones-db
    plan: starter
    databaseName: donaciones
    user: donaciones
```

**How to deploy with render.yaml:**

#### Method A: Via Render Dashboard (if available)

1. Go to https://dashboard.render.com
2. Click "New +"
3. Look for one of these options:
   - **"Blueprint"** or **"YAML"** or **"Infrastructure as Code"**
   - If you see it, select it and connect your GitHub repo
   - Render will read the `render.yaml` and create all services automatically

#### Method B: Via Render CLI (Alternative)

If the dashboard doesn't show Blueprint option:

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Deploy from render.yaml
render up
```

#### Method C: Push to GitHub and Use Dashboard

1. Make sure your `render.yaml` is in the root of your GitHub repo
2. In Render Dashboard, when creating a new service:
   - Select "Web Service" or "Static Site"
   - Connect your GitHub repo
   - Render should auto-detect the `render.yaml` file
   - It may prompt you to deploy all services defined in the file

**Benefits of using render.yaml:**
- ✅ All services created at once
- ✅ Environment variables automatically linked between services
- ✅ Database automatically created and connected
- ✅ CORS automatically configured with frontend URL
- ✅ Easy to version control and redeploy

---

### Option 2: Manual Step-by-Step Deployment

If render.yaml doesn't work, follow these manual steps:

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

The `aliot-1` service is incomplete. You have two options:

### Recommended: Use render.yaml (Option 1 above)
This will create a complete deployment with proper routing and API connection.

### Alternative: Keep aliot-1 and add API manually (Option 2 above)
Follow the manual steps to create the missing API service and configure aliot-1.

## Recommended Action

**Best option: Deploy using your render.yaml file (Option 1)**
- Your project already has everything configured
- All services will be created and linked automatically
- Proper routing, environment variables, and CORS will be set up
- Try Methods A, B, or C from Option 1 above

**Alternative: Fix aliot-1 manually (Option 2 + Alternative)**
- Requires more manual configuration
- You'll need to create API service and update aliot-1
- Follow the detailed steps in Option 2

The render.yaml approach is much faster and less error-prone!
