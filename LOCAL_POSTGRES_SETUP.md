# Local PostgreSQL Setup - Complete

**Date:** 2026-02-20  
**Status:** ✅ Configured and Running

---

## 🎯 What Was Done

### 1. Database Created
- **Database Name:** `donaciones_dev`
- **Host:** localhost
- **Port:** 5432
- **Username:** ariel
- **Password:** (none - trust authentication)

### 2. Configuration Updated
**File:** `/Users/ariel/DonacionesIeshiva/Donaciones/api/Donaciones.Api/appsettings.Development.json`

```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Database=donaciones_dev;Username=ariel;Password=;Port=5432"
  }
}
```

### 3. Database Schema Created
All migrations applied successfully:
- ✅ InitialCreate
- ✅ AddIsVirtualColumn
- ✅ AddUserAuthenticationWithEmail
- ✅ AddMatanaField
- ✅ AddAuditFields
- ✅ AddDeletionLogTable
- ✅ AddUserIdToDonor
- ✅ AddMessagesTable

### 4. Tables Created (10 total)
```
public.__EFMigrationsHistory
public.collectors
public.concepts
public.deletion_logs
public.destinations
public.donations
public.donors
public.messages
public.payments
public.users
```

### 5. Default Admin User Created
- **Email:** admin@admin.com
- **Password:** admin123
- **Role:** Admin
- **User ID:** 4a2fef61-9154-4073-9562-6fec021fa431

---

## 🚀 How to Use

### Start the API
```bash
cd /Users/ariel/DonacionesIeshiva/Donaciones/api/Donaciones.Api
dotnet run
```

The API will now use PostgreSQL instead of InMemory database.

### Access PostgreSQL Directly
```bash
# Connect to database
psql -U ariel donaciones_dev

# List tables
\dt

# Query users
SELECT * FROM users;

# Query donors
SELECT * FROM donors;

# Exit
\q
```

### Run Migrations
```bash
# Apply new migrations
cd /Users/ariel/DonacionesIeshiva/Donaciones/api/Donaciones.Api
dotnet ef database update

# Create new migration
dotnet ef migrations add MigrationName

# Rollback last migration
dotnet ef database update PreviousMigrationName
```

---

## 📊 Next Steps: Data Import

Now that PostgreSQL is set up, you can import the Excel data:

### 1. Review the Import Script
```bash
# The script is ready at:
/Users/ariel/DonacionesIeshiva/Donaciones/import_data.sql

# Preview first 100 lines
head -100 /Users/ariel/DonacionesIeshiva/Donaciones/import_data.sql
```

### 2. Run the Import
```bash
# Execute the import script
psql -U ariel donaciones_dev -f /Users/ariel/DonacionesIeshiva/Donaciones/import_data.sql

# Or run it step by step in psql
psql -U ariel donaciones_dev
\i /Users/ariel/DonacionesIeshiva/Donaciones/import_data.sql
```

### 3. Verify Import
```bash
psql -U ariel donaciones_dev

# Count records
SELECT COUNT(*) FROM donors;
SELECT COUNT(*) FROM donations;
SELECT COUNT(*) FROM payments;

# Check import user
SELECT * FROM users WHERE email = 'import@donaciones.internal';

# Sum by currency
SELECT currency, SUM(amount) FROM donations GROUP BY currency;
```

---

## 🔧 Useful Commands

### Database Management
```bash
# Backup database
pg_dump -U ariel donaciones_dev > backup.sql

# Restore database
psql -U ariel donaciones_dev < backup.sql

# Drop database (careful!)
psql -U ariel postgres -c "DROP DATABASE donaciones_dev;"

# Recreate database
psql -U ariel postgres -c "CREATE DATABASE donaciones_dev;"
```

### Check Database Size
```bash
psql -U ariel donaciones_dev -c "
  SELECT pg_size_pretty(pg_database_size('donaciones_dev')) as size;
"
```

### View All Data
```bash
psql -U ariel donaciones_dev -c "
  SELECT 
    'Donors' as table, COUNT(*) as count FROM donors
  UNION ALL
  SELECT 'Donations', COUNT(*) FROM donations
  UNION ALL  
  SELECT 'Payments', COUNT(*) FROM payments
  UNION ALL
  SELECT 'Users', COUNT(*) FROM users;
"
```

---

## 📝 Important Notes

### Before Import
1. ✅ PostgreSQL is running
2. ✅ Database `donaciones_dev` exists
3. ✅ Schema is created
4. ✅ Default admin user exists
5. ⏳ Ready to import 6,169 records (658 donors + 4,280 donations + 1,230 payments + 1 import user)

### After Import
- Total expected records:
  - **Donors:** 658
  - **Donations:** 4,280
  - **Payments:** 1,230
  - **Users:** 2 (admin + import user)
  - **Concepts:** 20
  - **Destinations:** 22
  - **Collectors:** 16

---

## 🔗 Connection String

For production (Render), use environment variable:
```
ConnectionStrings__Default=Host=<db-host>;Database=<db-name>;Username=<user>;Password=<pass>;SSL Mode=Require
```

For local development:
```
ConnectionStrings:Default=Host=localhost;Database=donaciones_dev;Username=ariel;Password=;Port=5432
```

---

**Status:** ✅ Ready for data import!
