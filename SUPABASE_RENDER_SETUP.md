# Supabase + Render Configuration Guide

This guide will help you configure your Render app to use a Supabase PostgreSQL database instead of Render's built-in database.

## Step 1: Set Up Supabase Database

1. Go to [Supabase](https://supabase.com) and create an account (if you don't have one)
2. Create a new project
3. Choose a project name, database password, and region
4. Wait for the database to be provisioned (takes ~2 minutes)

## Step 2: Get Your Supabase Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection String** section
3. Select **Connection Pooling** tab (recommended for production)
4. Copy the **Connection string** in "URI" format
5. Replace `[YOUR-PASSWORD]` in the string with your actual database password

Your connection string will look like:
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important Notes:**
- Use **port 6543** for connection pooling (recommended for web apps)
- Use **port 5432** for direct connection (if needed)
- Connection pooling mode: Use **Transaction** mode for most applications

## Step 3: Update Render Configuration

### Option A: Using Render Dashboard (Easiest)

1. Log in to your [Render Dashboard](https://dashboard.render.com)
2. Select your **donaciones-api** service (backend)
3. Go to the **Environment** tab
4. Find or add the following environment variable:
   - **Key**: `ConnectionStrings__Default`
   - **Value**: Your Supabase connection string from Step 2

   Example:
   ```
   postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

5. Click **Save Changes**
6. Render will automatically redeploy your service

### Option B: Update render.yaml (Infrastructure as Code)

If you prefer to manage configuration in code, update your `render.yaml`:

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
        value: postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
      - key: Cors__AllowedOrigins
        fromService:
          type: web
          name: donaciones-frontend
          property: url
      - key: Jwt__Secret
        generateValue: true  # Render will generate a secure random value
      - key: Jwt__Issuer
        value: Donaciones.Api
      - key: Jwt__Audience
        value: Donaciones.Client
      - key: Jwt__ExpiryMinutes
        value: 480
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

# Remove or comment out the databases section since we're using Supabase
# databases:
#   - name: donaciones-db
#     plan: starter
#     databaseName: donaciones
#     user: donaciones
```

**Note:** If using render.yaml, commit and push changes to trigger redeployment.

## Step 4: Additional Environment Variables (Recommended)

Add these additional environment variables in Render for better security:

1. **JWT Secret** (for authentication):
   - **Key**: `Jwt__Secret`
   - **Value**: Generate a secure random string (32+ characters)
   - Generate using: `openssl rand -base64 32` or let Render generate it

2. **JWT Configuration**:
   - **Key**: `Jwt__Issuer` → **Value**: `Donaciones.Api`
   - **Key**: `Jwt__Audience` → **Value**: `Donaciones.Client`
   - **Key**: `Jwt__ExpiryMinutes` → **Value**: `480` (8 hours)

3. **CORS Configuration** (if frontend is on different domain):
   - **Key**: `Cors__AllowedOrigins`
   - **Value**: Your frontend URL (e.g., `https://donaciones-frontend.onrender.com`)

## Step 5: Database Initialization

Your .NET application should automatically create the database schema on first run using Entity Framework migrations. However, you can also:

### Run Migrations Manually (if needed)

If your app doesn't auto-migrate, you can run migrations using Render Shell:

1. Go to your **donaciones-api** service in Render
2. Click **Shell** tab
3. Run: `dotnet ef database update`

### Initialize with Supabase SQL Editor

Alternatively, use Supabase's SQL Editor:

1. In Supabase dashboard, go to **SQL Editor**
2. Run your schema creation scripts if you have them
3. Or let Entity Framework handle it on app startup

## Step 6: Verify Connection

1. Check Render logs for your **donaciones-api** service
2. Look for successful database connection messages
3. Visit your API health endpoint: `https://donaciones-api.onrender.com/healthz`
4. Test the frontend to ensure data is loading correctly

## Troubleshooting

### Connection Timeout Issues
- Ensure you're using connection pooling (port 6543)
- Check that your Supabase project is in the same region as Render for better latency

### Authentication Errors
- Verify your database password is correct in the connection string
- Check that special characters in password are URL-encoded

### Schema/Migration Issues
- Review Render deployment logs for Entity Framework errors
- Manually run migrations using Render Shell if auto-migration fails

### SSL Connection Issues
If you encounter SSL errors, add `sslmode=require` to your connection string:
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

## Benefits of Using Supabase

✅ **Free tier**: Up to 500MB database + 2GB bandwidth  
✅ **Better performance**: Optimized PostgreSQL with connection pooling  
✅ **Built-in features**: Real-time subscriptions, Row Level Security, Storage  
✅ **Easy backups**: Automatic daily backups on paid plans  
✅ **Database UI**: Built-in table editor and SQL editor  
✅ **Monitoring**: Query performance insights and logs  

## Security Best Practices

1. **Never commit connection strings to Git** - Use environment variables
2. **Use strong database passwords** - Generate random, long passwords
3. **Enable Row Level Security (RLS)** in Supabase for multi-tenant apps
4. **Rotate JWT secrets regularly** in production
5. **Use connection pooling** to prevent connection exhaustion
6. **Monitor database usage** in Supabase dashboard

## Next Steps

- Set up database backups in Supabase (available on paid plans)
- Configure Row Level Security policies if needed
- Add database indices for better query performance
- Monitor your database usage in Supabase dashboard
- Consider upgrading Supabase plan if you need more resources

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Render Docs**: https://render.com/docs
- **PostgreSQL Connection Strings**: https://www.postgresql.org/docs/current/libpq-connect.html
