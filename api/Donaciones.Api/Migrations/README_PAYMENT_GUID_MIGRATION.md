# Payment Destination & Collector GUID Migration

## Overview
This migration converts the `payments.destination` and `payments.collector` columns from text (storing names) to UUID (storing foreign key references).

**Migration File:** `20260309020924_ConvertPaymentDestinationCollectorToGuid.cs`

## ⚠️ IMPORTANT - Required Pre-Migration Step

**Before applying this migration in production**, you MUST run the pre-migration SQL script to convert existing text values to GUIDs.

### Step-by-Step Process

#### 1. Run Pre-Migration SQL Script
```bash
psql -d your_database -f PREMIGRATION_ConvertPaymentDestinationCollectorToGuid.sql
```

This script will:
- Convert destination names → destination GUIDs (as text)
- Convert collector names → collector GUIDs (as text)
- Verify all conversions succeeded

#### 2. Verify Pre-Migration Success
The script includes verification queries. Ensure they return **0 rows**:
- No unmapped destinations
- No unmapped collectors

If any rows are returned, you need to:
- Create missing destinations/collectors in the lookup tables, OR
- Manually update those specific payment records

#### 3. Apply the Migration
Once pre-migration is complete and verified:
```bash
dotnet ef database update
```

### What the Migration Does

The migration performs these steps **safely**:

1. **Add new UUID columns** (`destination_id`, `collector_id`) - nullable initially
2. **Copy data** from text columns to UUID columns (casting text to UUID)
3. **Drop old text columns** (`destination`, `collector`)
4. **Make `destination_id` NOT NULL** (since it's required)

### Rollback Support

The `Down` migration is fully implemented and will:
1. Recreate the text columns
2. Copy UUID data back to text (as UUID strings)
3. Drop the UUID columns
4. Make destination text column NOT NULL

### Frontend Changes Required

After applying this migration, the frontend must be updated to send GUIDs instead of text values:

**Before:**
```javascript
{
  destination: "Destination Name",
  collector: "Collector Name"
}
```

**After:**
```javascript
{
  destinationId: "uuid-here",
  collectorId: "uuid-here" // or null
}
```

These changes are already implemented in:
- `frontend/src/pages/Payments.jsx`
- `frontend/src/pages/PaymentsAdmin.jsx`

## Testing Locally

If you want to test this migration locally with your test data:

1. Ensure you have test data with text-based destinations/collectors
2. Run the pre-migration script
3. Apply the migration
4. Verify data integrity:
```sql
SELECT COUNT(*) as total, 
       COUNT(destination_id) as with_dest, 
       COUNT(collector_id) as with_coll 
FROM payments;
```

## Support

If you encounter issues during migration, check:
1. All payments have valid destination values that exist in the `destinations` table
2. All non-null collector values exist in the `collectors` table
3. The pre-migration SQL completed successfully without errors
