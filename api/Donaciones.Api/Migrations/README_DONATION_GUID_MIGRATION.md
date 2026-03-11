# Donation Concept & Destination GUID Migration

## Overview
This migration converts the `donations.concept` and `donations.destination` columns from text (storing names/IDs as strings) to UUID (storing foreign key references).

**Migration File:** `20260309030940_ConvertDonationConceptDestinationToGuid.cs`

## ⚠️ IMPORTANT - Required Pre-Migration Step

**Before applying this migration in production**, you MUST run the pre-migration SQL script to convert existing text values to GUIDs.

### Step-by-Step Process

#### 1. Run Pre-Migration SQL Script
```bash
psql -d your_database -f PREMIGRATION_ConvertDonationConceptDestinationToGuid.sql
```

This script will:
- Convert concept IDs/names → concept GUIDs (as text)
- Convert destination IDs/names → destination GUIDs (as text)
- Verify all conversions succeeded

#### 2. Verify Pre-Migration Success
The script includes verification queries. Ensure they return **0 rows**:
- No unmapped concepts
- No unmapped destinations

If any rows are returned, you need to:
- Create missing concepts/destinations in the lookup tables, OR
- Manually update those specific donation records

#### 3. Apply the Migration
Once pre-migration is complete and verified:
```bash
dotnet ef database update
```

### What the Migration Does

The migration performs these steps **safely**:

1. **Add new UUID columns** (`concept_id`, `destination_id`) - nullable initially
2. **Copy data** from text columns to UUID columns (casting text to UUID)
3. **Drop old text columns** (`concept`, `destination`)
4. **Make both columns NOT NULL** (since they're required)

### Rollback Support

The `Down` migration is fully implemented and will:
1. Recreate the text columns
2. Copy UUID data back to text (as UUID strings)
3. Drop the UUID columns
4. Make both text columns NOT NULL

### Frontend Changes Required

After applying this migration, the frontend must be updated to send GUIDs instead of text values:

**Before:**
```javascript
{
  concept: "Concept Name" or "concept-id-string",
  destination: "Destination Name" or "destination-id-string"
}
```

**After:**
```javascript
{
  conceptId: "uuid-here",
  destinationId: "uuid-here"
}
```

## Testing Locally

If you want to test this migration locally with your test data:

1. Ensure you have test data with text-based concepts/destinations
2. Run the pre-migration script
3. Apply the migration
4. Verify data integrity:
```sql
SELECT COUNT(*) as total, 
       COUNT(concept_id) as with_concept, 
       COUNT(destination_id) as with_dest 
FROM donations;
```

## Support

If you encounter issues during migration, check:
1. All donations have valid concept values that exist in the `concepts` table
2. All donations have valid destination values that exist in the `destinations` table
3. The pre-migration SQL completed successfully without errors
