# Quick Fix for Production Login - Step by Step

## Problem
- Login returns "Not Found" 
- Frontend deployed at https://aliot-1.onrender.com/
- API backend is NOT deployed
- Frontend can't make API calls

## Solution: Deploy the API Service

### Step 1: Go to Render Dashboard
Go to: https://dashboard.render.com

### Step 2: Create PostgreSQL Database

1. Click **"New +"** button (top right)
2. Select **"PostgreSQL"**
3. Fill in:
   - **Name**: `donaciones-db`
   - **Database**: `donaciones`
   - **User**: `donaciones`
   - **Region**: Choose your region
   - **Plan**: Select **Free** or **Starter**
4. Click **"Create Database"**
5. Wait for it to be created (2-3 minutes)
6. Once created, go to the database page and find **"Internal Database URL"**
7. **COPY THIS URL** - it looks like:
   ```
   postgresql://donaciones:password@dpg-xxx.oregon-postgres.render.com/donaciones
   ```

### Step 3: Create API Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect to your GitHub repository
3. Fill in the form:

   **Basic Settings:**
   - **Name**: `donaciones-api-1` (or any unique name)
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Runtime**: Select **"Docker"**
   - **Dockerfile Path**: `./Dockerfile`

   **Environment Variables:**
   Click **"Add Environment Variable"** for each:
   
   | Key | Value |
   |-----|-------|
   | `ASPNETCORE_ENVIRONMENT` | `Production` |
   | `ConnectionStrings__Default` | *Paste the PostgreSQL Internal URL from Step 2* |
   | `Cors__AllowedOrigins` | `https://aliot-1.onrender.com` |

   **Advanced Settings:**
   - **Health Check Path**: `/healthz`

4. Click **"Create Web Service"**
5. Wait for deployment (5-10 minutes) - Render will build your Docker image
6. Once deployed, **COPY THE API URL** - it looks like:
   ```
   https://donaciones-api-1.onrender.com
   ```

### Step 4: Update Frontend to Use API

1. Go to your `aliot-1` service in Render Dashboard
2. Click **"Environment"** tab on the left
3. Click **"Add Environment Variable"**
4. Add:
   - **Key**: `REACT_APP_API_BASE_URL`
   - **Value**: *Paste the API URL from Step 3* (e.g., `https://donaciones-api-1.onrender.com`)
5. Click **"Save Changes"**
6. Render will ask if you want to deploy - Click **"Manual Deploy"** → **"Deploy latest commit"**
7. Wait for rebuild (5-10 minutes)

### Step 5: Test Login

1. Go to https://aliot-1.onrender.com/
2. You should be redirected to https://aliot-1.onrender.com/login (no 404)
3. Login with:
   - Email: `admin@admin.com`
   - Password: `admin123`
4. Open browser DevTools (F12) → Network tab to see API calls going to your production API

## Expected Result

After these steps:
- ✅ API is deployed at `https://donaciones-api-1.onrender.com`
- ✅ Database is created and connected
- ✅ Frontend calls production API instead of localhost
- ✅ Login works
- ✅ Default admin user is auto-created on first run

## Troubleshooting

**If API fails to deploy:**
- Check the Render logs for errors
- Make sure your GitHub repo has the latest code with Dockerfile
- Verify the database URL is correct

**If login still fails:**
- Open browser DevTools → Network tab
- Look for the login request
- Check if it's going to the correct API URL
- Look for CORS errors in Console tab

**If CORS errors appear:**
- Make sure `Cors__AllowedOrigins` in API matches your frontend URL exactly
- No trailing slash in the URL

## Alternative: Use render.yaml (Faster)

If you want to start fresh and avoid manual configuration:

1. Delete `aliot-1` service
2. In Render Dashboard, look for "New +" → "Blueprint" or "YAML" option
3. If available, connect your GitHub repo
4. Render will read `render.yaml` and create all services automatically

This is faster and less error-prone!
