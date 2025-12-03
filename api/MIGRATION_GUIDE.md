# Database Migration Summary

## Changes Made

This update migrates the application from in-memory storage to PostgreSQL database with full migration support.

### What Was Added

1. **EF Core Design Package** (`Donaciones.Api.csproj`)
   - Added `Microsoft.EntityFrameworkCore.Design` for migration tooling
   
2. **Design-Time DbContext Factory** (`Data/AppDbContextFactory.cs`)
   - Enables EF Core CLI tools to create migrations
   - Uses a default connection string for migration generation
   
3. **Initial Database Migration** (`Migrations/`)
   - `InitialCreate` migration creates all tables:
     - donors
     - donations
     - payments
     - concepts
     - destinations
     - collectors
   - Includes all indexes and foreign key constraints

4. **Automatic Migration Application** (`Program.cs`)
   - Changed from `EnsureCreated()` to `Migrate()`
   - Migrations now apply automatically on application startup
   - Falls back to InMemory database if no connection string provided
   - Logs migration progress

### Database Connection Priority

The application checks for connection strings in this order:
1. `ConnectionStrings__Default` environment variable (recommended for Render)
2. `ConnectionStrings:Default` in appsettings.json
3. Falls back to InMemory database (development only)

### Migration Commands

**Create new migration:**
```bash
cd api/Donaciones.Api
dotnet ef migrations add MigrationName
```

**View SQL that will run:**
```bash
dotnet ef migrations script
```

**Remove last migration (not applied):**
```bash
dotnet ef migrations remove
```

**Apply migrations manually:**
```bash
dotnet ef database update
```

### For Production (Render.com)

**Required Steps:**

1. Create PostgreSQL database in Render dashboard
2. Copy the Internal Database URL
3. Set environment variable in API service:
   ```
   ConnectionStrings__Default=<your-postgres-url>
   ```
4. Deploy - migrations apply automatically on startup

**Migration Process:**
- On first deployment: Creates all tables from scratch and seeds default data
- Default collectors: Ezra, Marcelo, Rab Dines, Kupa, Rab Pinjas Pasteloff, Rab Pinjas Corin, Transferencia, Elazar, Ari Grunblatt, Ari Szklarkiewicz
- On subsequent deployments: Applies only new migrations incrementally
- Database schema version tracked in `__EFMigrationsHistory` table

### Backward Compatibility

✅ **Existing code unchanged** - All models and services work the same
✅ **Development workflow unchanged** - Can still use InMemory database
✅ **Production ready** - Full PostgreSQL support with migrations
✅ **Zero downtime** - Migrations apply before serving requests

### Testing Locally

**With InMemory (no setup):**
```bash
cd api/Donaciones.Api
dotnet run
```

**With PostgreSQL:**
```bash
# Create database
createdb donaciones

# Set connection
export ConnectionStrings__Default="Host=localhost;Database=donaciones;Username=postgres;Password=postgres"

# Run (migrations apply automatically)
dotnet run
```

### Troubleshooting

**"Unable to resolve service for type IMigrator"**
- Solution: AppDbContextFactory has been created to fix this

**Migrations not applying**
- Check logs for "Applying database migrations..." message
- Verify connection string is correct
- Ensure PostgreSQL is running and accessible

**Data persistence issues**
- Confirm ConnectionStrings__Default is set (otherwise using InMemory)
- Check connection string format matches: `Host=...;Database=...;Username=...;Password=...`

### Documentation

See full documentation:
- [docs/DATABASE_SETUP.md](../docs/DATABASE_SETUP.md) - Complete database setup guide
- [api/.env.example](../.env.example) - Environment variable template
- [README.md](../README.md) - Quick start guide
