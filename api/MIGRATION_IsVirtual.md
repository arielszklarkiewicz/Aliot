# IsVirtual Column Migration Guide

## Overview
Added `IsVirtual` boolean column to both `donations` and `payments` tables to track virtual/pledge transactions versus actual cash transactions.

## Database Changes

### Tables Modified
1. **donations** - Added `is_virtual` column
2. **payments** - Added `is_virtual` column

### SQL Generated
```sql
ALTER TABLE payments ADD is_virtual boolean NOT NULL DEFAULT FALSE;
ALTER TABLE donations ADD is_virtual boolean NOT NULL DEFAULT FALSE;
```

## Migration Details

**Migration Name:** `AddIsVirtualColumn`  
**Migration ID:** `20251203044610`  
**Created:** 2025-12-03

### Properties
- **Column Name:** `is_virtual`
- **Data Type:** `boolean`
- **Nullable:** `NO` (NOT NULL)
- **Default Value:** `false`

## Use Cases

The `IsVirtual` field enables tracking of:

1. **Pledges/Commitments**
   - Donor promises to pay in the future
   - Multi-payment commitments

2. **Bookkeeping Entries**
   - Internal transfers
   - Corrections or adjustments

3. **Virtual Donations**
   - Online pledges pending confirmation
   - Recurring donation setup (before first payment)

4. **Reporting**
   - Separate actual cash from commitments
   - Track fulfillment rates
   - Calculate true vs. pledged revenue

## API Impact

### Model Changes

**Donation Model:**
```csharp
public bool IsVirtual { get; set; }  // New property
```

**Payment Model:**
```csharp
public bool IsVirtual { get; set; }  // New property
```

### Default Behavior
- All new donations/payments: `IsVirtual = false`
- All existing donations/payments: `IsVirtual = false` (via default value)
- API backward compatible - field optional in DTOs

## Deployment

### Automatic Migration
The migration applies automatically on application startup:

```
info: Applying database migrations...
info: Database migrations applied successfully
```

### Manual Migration (if needed)
```bash
cd api/Donaciones.Api
dotnet ef database update
```

### Rollback (if needed)
```bash
dotnet ef database update InitialCreate
```

## Testing Checklist

- [x] Migration created successfully
- [x] Build succeeds with no errors
- [x] Default value set to `false`
- [x] Existing data unaffected
- [x] Column is NOT NULL
- [x] Backward compatible

## Future Enhancements

### Frontend (To Be Implemented)
- Add checkbox in Donation form: "Virtual/Pledge"
- Add checkbox in Payment form: "Virtual/Pledge"
- Filter donations/payments by IsVirtual
- Reports showing virtual vs. actual amounts

### API Endpoints (To Be Implemented)
- Add `isVirtual` filter to `/api/donations`
- Add `isVirtual` filter to `/api/payments`
- Include in balance calculations (with toggle)

## SQL Verification

After migration, verify columns exist:
```sql
-- Check donations table
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'donations' AND column_name = 'is_virtual';

-- Check payments table
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'payments' AND column_name = 'is_virtual';
```

Expected result:
```
column_name | data_type | column_default | is_nullable
------------|-----------|----------------|------------
is_virtual  | boolean   | false         | NO
```

## Migration History

1. `20251203041010_InitialCreate` - Initial database schema
2. `20251203044610_AddIsVirtualColumn` - Added IsVirtual field ✅ **Current**
