-- Migration: Split donors.name into first_name and last_name
-- Date: 2025-10-16
-- Notes:
-- 1) Adds first_name (NOT NULL) and last_name (NULL) to donors
-- 2) Backfills from existing name column by splitting on first space
-- 3) Drops old name column and its index
-- 4) Adds new trigram index on concatenated full name for search performance

BEGIN;

-- 1) Add new columns (first_name required, last_name optional)
ALTER TABLE donors
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 2) Backfill data from existing name column when present
-- Rule: FirstName = first token; LastName = remaining tokens (if any)
UPDATE donors
SET first_name = COALESCE(NULLIF(split_part(name, ' ', 1), ''), name),
    last_name = NULLIF(
        TRIM(
            CASE WHEN name LIKE '% %' THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
                 ELSE '' END
        ), ''
    )
WHERE first_name IS NULL;  -- idempotent: only set when not previously set

-- 2.1) Ensure first_name is not null after backfill
UPDATE donors SET first_name = name WHERE COALESCE(first_name, '') = '' AND name IS NOT NULL;

-- 3) Drop old index on name if exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = ANY(current_schemas(false)) AND indexname = 'idx_donors_name'
  ) THEN
    EXECUTE 'DROP INDEX idx_donors_name';
  END IF;
END $$;

-- 3.1) Drop old name column if exists (after backfill)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'donors' AND column_name = 'name'
  ) THEN
    EXECUTE 'ALTER TABLE donors DROP COLUMN name';
  END IF;
END $$;

-- 4) Set NOT NULL constraint for first_name
ALTER TABLE donors
    ALTER COLUMN first_name SET NOT NULL;

-- 5) Create search index on concatenated full name using pg_trgm
-- Requires pg_trgm extension; create if missing
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_donors_fullname_trgm
ON donors USING gin ((first_name || ' ' || COALESCE(last_name, '')) gin_trgm_ops);

COMMIT;
