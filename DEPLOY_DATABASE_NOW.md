# Deploy Database Schema to Supabase - Quick Start

## ✅ SQL Script Generated Successfully!

The database migration script has been created at:
```
/Users/ariel/DonacionesIeshiva/Donaciones/api/Donaciones.Api/schema.sql
```

This file contains 365 lines of SQL that will create all your database tables.

## 🚀 Option 1: Deploy via Supabase Dashboard (EASIEST)

### Step 1: Copy the SQL Script
```bash
cd /Users/ariel/DonacionesIeshiva/Donaciones/api/Donaciones.Api
cat schema.sql | pbcopy
```
This copies the entire SQL script to your clipboard.

### Step 2: Run in Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Paste the SQL script (Cmd+V)
6. Click **Run** (or press Cmd+Enter)

### Step 3: Verify Tables Created
1. Click **Table Editor** in the left sidebar
2. You should see these tables:
   - ✅ collectors
   - ✅ concepts
   - ✅ destinations
   - ✅ donors
   - ✅ users
   - ✅ donations
   - ✅ payments
   - ✅ deletion_logs
   - ✅ __EFMigrationsHistory

## 🚀 Option 2: Force Render to Run Migrations

If you prefer Render to handle it automatically:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select **donaciones-api** service
3. Click **Manual Deploy** → **Deploy latest commit**
4. Go to **Logs** tab
5. Watch for these messages:
   ```
   Applying database migrations...
   Database migrations applied successfully
   Creating default admin user...
   ```

**Note:** This only works if your connection string is correctly configured in Render.

## 🔐 Default Admin User

After running the migrations, your app will create a default admin user:

- **Email:** `admin@admin.com`
- **Password:** `admin123`

**⚠️ IMPORTANT:** Change this password immediately after first login!

## ✅ Test Your Setup

### 1. Check Database Tables
In Supabase Table Editor, verify all 8 tables exist.

### 2. Test the API
Visit: `https://your-app.onrender.com/healthz`

Expected response:
```json
{
  "status": "ok",
  "time": "2026-02-11T02:17:28Z"
}
```

### 3. Test Login
1. Go to your frontend app
2. Login with:
   - Email: `admin@admin.com`
   - Password: `admin123`
3. If successful, you'll be redirected to the dashboard

## 🐛 Troubleshooting

### Login Still Fails After Migration

**Check 1:** Verify tables exist in Supabase Table Editor

**Check 2:** Check Render logs for startup errors:
```
Render Dashboard → donaciones-api → Logs
```

**Check 3:** Verify connection string in Render:
```
Render Dashboard → donaciones-api → Environment
```
Look for `ConnectionStrings__Default` - should start with `postgresql://`

**Check 4:** Manually create admin user via Render Shell:
1. Render Dashboard → donaciones-api → Shell
2. Run a curl command to create user (after tables exist)

### Migration Says "Already Applied"

This is normal! The script is idempotent (safe to run multiple times).

### Permission Denied Errors

Your Supabase user needs permission to create tables. By default, this should work.
If not, run this in Supabase SQL Editor first:
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

## 📝 Next Steps

1. ✅ Run the SQL script in Supabase
2. ✅ Login with admin@admin.com / admin123
3. ✅ Create your real admin user in the app
4. ✅ Change the default admin password or delete that user
5. ✅ Start using the application!

## 🆘 Still Having Issues?

Check the Render logs in real-time:
```
Render Dashboard → donaciones-api → Logs → Auto-scroll ON
```

Look for any errors related to:
- Database connection
- Migrations
- User creation
- Authentication

If you see "Using InMemory database" in logs, your connection string isn't being read correctly.
