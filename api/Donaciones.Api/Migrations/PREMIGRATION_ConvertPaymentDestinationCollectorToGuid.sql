-- ============================================================================
-- PRE-MIGRATION SCRIPT
-- Run this BEFORE applying migration: 20260309020924_ConvertPaymentDestinationCollectorToGuid
-- ============================================================================
-- This script converts text-based destination and collector values to GUIDs
-- by matching them with the destinations and collectors lookup tables.
-- ============================================================================

BEGIN;

-- Step 1: Convert destination names to GUIDs
-- This updates payments.destination from name (text) to id (uuid as text)
UPDATE payments p
SET destination = d.id::text
FROM destinations d
WHERE LOWER(TRIM(p.destination)) = LOWER(TRIM(d.name))
  AND p.destination !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 2: Convert collector names to GUIDs  
-- This updates payments.collector from name (text) to id (uuid as text)
UPDATE payments p
SET collector = c.id::text
FROM collectors c
WHERE p.collector IS NOT NULL
  AND LOWER(TRIM(p.collector)) = LOWER(TRIM(c.name))
  AND p.collector !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 3: Verify all destinations were converted
-- This should return 0 rows (all should be UUIDs now)
SELECT id, destination 
FROM payments 
WHERE destination IS NOT NULL
  AND destination !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 4: Verify all collectors were converted (or are NULL)
-- This should return 0 rows (all should be UUIDs or NULL)
SELECT id, collector 
FROM payments 
WHERE collector IS NOT NULL
  AND collector !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- If the above queries return any rows, you need to handle those manually
-- before proceeding with the migration!

COMMIT;

-- ============================================================================
-- After running this script successfully (and verifying steps 3 & 4 return 0 rows),
-- you can safely apply the migration:
-- dotnet ef database update
-- ============================================================================
