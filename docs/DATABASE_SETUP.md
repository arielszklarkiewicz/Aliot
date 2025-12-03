# Database Configuration Guide

This application uses PostgreSQL as the primary database with Entity Framework Core for data access and migrations.

## Overview

- **Database Provider**: PostgreSQL (via Npgsql)
- **ORM**: Entity Framework Core 9.0
- **Migrations**: Automatic on application startup
- **Fallback**: InMemory database for development (when no connection string provided)

## Local Development Setup

### Option 1: Use InMemory Database (No Setup Required)

If you don't provide a connection string, the application will automatically use an in-memory database for development:

```bash
cd api/Donaciones.Api
dotnet run
```

**Note**: Data will be lost when the application stops.

### Option 2: Use PostgreSQL Locally

1. **Install PostgreSQL**
   - macOS: `brew install postgresql@16`
   - Ubuntu: `sudo apt-get install postgresql-16`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Create Database**
   ```bash
   # Start PostgreSQL service
   # macOS: brew services start postgresql@16
   # Linux: sudo systemctl start postgresql
   
   # Create database
   createdb donaciones
   ```

3. **Configure Connection String**
   
   Create `appsettings.Development.json`:
   ```json
   {
     "ConnectionStrings": {
       "Default": "Host=localhost;Database=donaciones;Username=postgres;Password=yourpassword"
     }
   }
   ```

4. **Run Application**
   ```bash
   cd api/Donaciones.Api
   dotnet run
   ```
   
   Migrations will be applied automatically on startup.

## Production Setup (Render.com)

### 1. Create PostgreSQL Database on Render

1. Go to your Render dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: donaciones-db
   - **Database**: donaciones
   - **User**: (auto-generated)
   - **Region**: Choose closest to your API
   - **Plan**: Select appropriate tier
4. Click "Create Database"
5. Copy the **Internal Database URL** (it looks like: `postgresql://user:password@host:5432/database`)

### 2. Configure API Service on Render

1. Go to your API web service settings
2. Navigate to "Environment" tab
3. Add environment variable:
   - **Key**: `ConnectionStrings__Default`
   - **Value**: Paste the Internal Database URL from step 1
4. Save changes

### 3. Deploy

The application will automatically:
1. Apply all pending migrations on startup
2. Create necessary tables if they don't exist
3. Seed default lookup data (concepts, destinations)

## Database Migrations

### Creating New Migrations

When you modify entity models or DbContext configuration:

```bash
cd api/Donaciones.Api
dotnet ef migrations add YourMigrationName
```

### Viewing Migration SQL

To see what SQL will be executed:

```bash
dotnet ef migrations script
```

### Removing Last Migration (if not applied)

```bash
dotnet ef migrations remove
```

### Manual Migration Application (if needed)

Migrations are applied automatically on startup, but you can also apply manually:

```bash
dotnet ef database update
```

## Connection String Formats

The application accepts connection strings from multiple sources (in order of precedence):

1. `ConnectionStrings__Default` environment variable (double underscore)
2. `ConnectionStrings:Default` in appsettings.json
3. Falls back to InMemory database

### PostgreSQL Connection String Format

```
Host=hostname;Database=dbname;Username=user;Password=pass;Port=5432
```

### Example Connection Strings

**Local Development:**
```
Host=localhost;Database=donaciones;Username=postgres;Password=postgres
```

**Render.com (use Internal URL):**
```
postgresql://user:password@internal-host.oregon-postgres.render.com:5432/database
```

## Database Schema

The application manages these tables:

- **donors** - Donor information
- **donations** - Donation records
- **payments** - Payment records
- **concepts** - Donation concept lookup
- **destinations** - Destination lookup
- **collectors** - Collector lookup

## Troubleshooting

### "No database provider configured" error

Make sure:
1. `Microsoft.EntityFrameworkCore.Design` package is installed
2. `AppDbContextFactory` exists in `Data` folder
3. Running commands from the project directory

### Migrations not applied

Check application logs on startup:
```
info: Applying database migrations...
info: Database migrations applied successfully
```

If you see errors:
1. Verify connection string is correct
2. Ensure database server is running
3. Check user has CREATE TABLE permissions

### Data loss in development

If using InMemory database, data is lost on restart. Use PostgreSQL for persistent data:
```bash
export ConnectionStrings__Default="Host=localhost;Database=donaciones;Username=postgres;Password=postgres"
dotnet run
```

## Best Practices

1. **Never commit connection strings** with real credentials to Git
2. **Use environment variables** for production connection strings
3. **Always test migrations** in a non-production environment first
4. **Backup production database** before deploying schema changes
5. **Review migration scripts** before applying to production

## Additional Resources

- [EF Core Migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/)
- [Npgsql Documentation](https://www.npg sql.org/efcore/)
- [Render PostgreSQL Guide](https://render.com/docs/databases)
