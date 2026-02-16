# Database Migration Troubleshooting Guide

Your app is configured to auto-migrate on startup (Program.cs lines 111-147), but tables aren't being created. Here's how to diagnose and fix:

## Quick Fix: Force Redeploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your **donaciones-api** service
3. Click **Manual Deploy** → **Deploy latest commit**
4. Watch the logs for migration messages

## Check Render Logs

1. In Render Dashboard → **donaciones-api** → **Logs** tab
2. Look for these messages:
   - ✅ "Applying database migrations..."
   - ✅ "Database migrations applied successfully"
   - ✅ "Creating default admin user..."
   - ❌ Any errors mentioning "database", "migration", or "connection"

## Common Issues & Solutions

### Issue 1: Connection String Not Set
**Symptom:** Logs show "Using InMemory database"
**Fix:** Verify `ConnectionStrings__Default` is set in Render Environment variables

### Issue 2: Migration Errors
**Symptom:** Errors like "relation does not exist" or "permission denied"
**Fix:** Check your Supabase connection string has correct permissions

### Issue 3: App Crashes on Startup
**Symptom:** Deployment fails, health check fails
**Fix:** Check for syntax errors in connection string (special characters must be URL-encoded)

## Manual Migration (If Auto-Migration Fails)

### Option A: Using Render Shell
1. Render Dashboard → donaciones-api → **Shell** tab
2. Run: `dotnet ef database update --project /opt/render/project/src/api/Donaciones.Api`

### Option B: Generate SQL Script Locally
1. On your local machine:
   ```bash
   cd /Users/ariel/DonacionesIeshiva/Donaciones/api/Donaciones.Api
   dotnet ef migrations script --output schema.sql --idempotent
   ```

2. This creates `schema.sql` with all migration SQL

3. Run the SQL in Supabase:
   - Go to Supabase Dashboard → SQL Editor
   - Paste and execute the schema.sql content

### Option C: Use EF Core Bundle
Create a migration bundle that can run independently:
```bash
cd /Users/ariel/DonacionesIeshiva/Donaciones/api/Donaciones.Api
dotnet ef migrations bundle --self-contained -o efbundle
```

## Verify Database After Migration

### Check Tables in Supabase:
1. Supabase Dashboard → **Table Editor**
2. You should see these tables:
   - Users
   - Donors
   - Donations
   - Payments
   - Concepts
   - Destinations
   - Collectors
   - DeletionLogs
   - __EFMigrationsHistory (tracks applied migrations)

### Test the Default Admin User:
Your app creates a default admin on first run:
- **Email:** admin@admin.com
- **Password:** admin123
- **IMPORTANT:** Change this password immediately after first login!

## Next Steps After Migration

1. **Test Login:** Try logging in with admin@admin.com / admin123
2. **Check API:** Visit https://donaciones-api.onrender.com/healthz
3. **Create New Admin:** Use the app to create your real admin user
4. **Delete Default Admin:** Remove the default admin@admin.com user

## Still Not Working?

Run this command to check EF Core tools:
```bash
cd /Users/ariel/DonacionesIeshiva/Donaciones/api/Donaciones.Api
dotnet tool list -g
```

If dotnet-ef is missing, install it:
```bash
dotnet tool install --global dotnet-ef
```

Then verify migrations exist:
```bash
dotnet ef migrations list
```
