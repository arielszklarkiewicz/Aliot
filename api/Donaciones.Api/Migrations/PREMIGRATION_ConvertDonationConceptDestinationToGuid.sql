-- ============================================================================
-- PRE-MIGRATION SCRIPT: Convert Donation Concept & Destination to GUID
-- ============================================================================
-- This script converts text-based concept and destination values in the 
-- donations table to UUIDs, preparing for the migration that will change 
-- the column types from text to uuid.
--
-- IMPORTANT: Run this BEFORE applying the EF Core migration
-- ============================================================================

BEGIN;

-- Step 1: Convert concept names/IDs to concept GUIDs
-- ----------------------------------------------------------------------------
-- This updates donations.concept from name or ID string to the actual UUID
UPDATE donations d
SET concept = c.id::text
FROM concepts c
WHERE d.concept IS NOT NULL 
  AND (
    -- Match by name (case-insensitive)
    LOWER(d.concept) = LOWER(c.name)
    OR
    -- Match by ID as lowercase string
    LOWER(d.concept) = LOWER(c.id::text)
  )
  -- Only update if not already a valid UUID
  AND d.concept !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 2: Convert destination names/IDs to destination GUIDs
-- ----------------------------------------------------------------------------
-- This updates donations.destination from name or ID string to the actual UUID
UPDATE donations d
SET destination = dest.id::text
FROM destinations dest
WHERE d.destination IS NOT NULL
  AND (
    -- Match by name (case-insensitive)
    LOWER(d.destination) = LOWER(dest.name)
    OR
    -- Match by ID as lowercase string
    LOWER(d.destination) = LOWER(dest.id::text)
  )
  -- Only update if not already a valid UUID
  AND d.destination !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check for unmapped concepts (should return 0 rows)
-- ----------------------------------------------------------------------------
\echo '=== Checking for unmapped concepts ==='
SELECT id, concept, donation_date
FROM donations
WHERE concept IS NOT NULL
  AND concept !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Check for unmapped destinations (should return 0 rows)
-- ----------------------------------------------------------------------------
\echo '=== Checking for unmapped destinations ==='
SELECT id, destination, donation_date
FROM donations
WHERE destination IS NOT NULL
  AND destination !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Show conversion summary
-- ----------------------------------------------------------------------------
\echo '=== Conversion Summary ==='
SELECT 
    COUNT(*) as total_donations,
    COUNT(CASE WHEN concept ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as concepts_converted,
    COUNT(CASE WHEN destination ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as destinations_converted
FROM donations;

COMMIT;

-- ============================================================================
-- If the verification queries show unmapped records, you need to either:
-- 1. Create missing concepts/destinations in the lookup tables
-- 2. Manually update those donation records with valid UUIDs
-- 
-- DO NOT proceed with the EF migration until all verifications pass!
-- ============================================================================
