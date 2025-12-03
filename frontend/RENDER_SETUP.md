# Render.com Setup Guide

## Environment Variables Configuration

To deploy the React frontend on Render.com, you **MUST** configure the following environment variable in your Render dashboard:

### Required Environment Variable

```
REACT_APP_API_BASE_URL=https://your-backend-api.onrender.com
```

Replace `https://your-backend-api.onrender.com` with your actual backend API URL on Render.

### Steps to Configure on Render.com

1. Go to your Render dashboard
2. Select your frontend web service
3. Navigate to "Environment" tab
4. Click "Add Environment Variable"
5. Add:
   - **Key**: `REACT_APP_API_BASE_URL`
   - **Value**: Your production API URL (e.g., `https://donaciones-api.onrender.com`)
6. Save and redeploy

### Build Settings

- **Build Command**: `npm run build`
- **Publish Directory**: `build`

### Important Notes

- The environment variable MUST start with `REACT_APP_` to be included in the React build
- Without this variable set, the app will try to connect to `http://localhost:5047` which will fail in production
- After setting the environment variable, you must trigger a new build/deploy for changes to take effect
- The variable is baked into the build at build time, so any changes require a rebuild

### Verification

After deployment, check your browser's Network tab to confirm API requests are going to the correct production URL instead of localhost.
