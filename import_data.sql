-- ============================================================================
-- DONACIONES IESHIVA - DATA IMPORT SCRIPT
-- Generated: 2026-02-19 23:59:08
-- Source: Bueno6.xlsx
-- ============================================================================

BEGIN;

-- Create Import User
INSERT INTO users (id, email, password_hash, role, is_active, created_at)
VALUES ('c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5', 'import@donaciones.internal', 'IMPORT_USER_NO_LOGIN', 1, true, NOW())
ON CONFLICT (email) DO NOTHING;

-- Get import user ID (in case it already exists)
DO $$
DECLARE
  v_import_user_id uuid;
BEGIN
  SELECT id INTO v_import_user_id FROM users WHERE email = 'import@donaciones.internal';
  IF v_import_user_id IS NULL THEN
    v_import_user_id := 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 1: Create Missing Lookup Values
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Concepts (inserting 13 new, 9 already exist)
INSERT INTO concepts (id, name, created_at, created_by)
SELECT * FROM (VALUES
  ('b6a0e915-66d6-46a1-98c4-5cedc31d075c'::uuid, 'Agve', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('5e4a0b2c-a6e1-44a6-b899-105f899e1b2c'::uuid, 'Aliá', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('fbdab99a-7fef-480b-a0ae-674efdc4b645'::uuid, 'Cohen', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('38c6bde6-cbb2-41e1-b2f3-58311167d32a'::uuid, 'Glile', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('818db3ea-846e-48c4-a6dc-2b58ad42b712'::uuid, 'Ieshiva', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('35c1bebf-971d-4e14-af18-1993c029e953'::uuid, 'Levi', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('873ff6c8-24e8-45d9-8f72-a66bfbb84e45'::uuid, 'Maftir', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('633250c0-b1ca-4e8a-b2d0-08a6700aad71'::uuid, 'Minja 3ro', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('124eab36-1f5c-42cc-bcb2-bea60234c65e'::uuid, 'Minja Cohen', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('47d9905f-e478-4c15-ac5d-d2281a0e661f'::uuid, 'Minja Levi', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('677b2a46-d714-4777-8930-944d064d6230'::uuid, 'Petija', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('97d8fb8f-b156-496c-9c09-138bd05d045c'::uuid, 'Sefaradi', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('f87c9bee-f4a6-4a9a-8e58-57ef18d49ee3'::uuid, 'Seudat 3', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid)
) AS v(id, name, created_at, created_by)
WHERE NOT EXISTS (SELECT 1 FROM concepts WHERE concepts.name = v.name);

-- Destinations (inserting 19 new, 7 already exist)
INSERT INTO destinations (id, name, created_at, created_by)
SELECT * FROM (VALUES
  ('2d585bd5-f619-49dd-bbec-aef1866e02e6'::uuid, 'Campaña', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('5083521e-b69a-4294-81e6-37fa0b447e0a'::uuid, 'Escuela', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('3cc604fc-8907-43a7-a459-3e423987cd9c'::uuid, 'Gan', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('f34cc61d-9424-4546-ac8e-dceaaa06f9aa'::uuid, 'Ieshiva', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('26ed900d-f68c-4ce5-b112-3291c8e1060d'::uuid, 'Ieshiva Guedola', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('00f95947-a5b1-49d4-8fcd-eb06f50e7d23'::uuid, 'Ieshiva Ketana', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('31688671-6b4b-4b99-95e8-87a34764c8ae'::uuid, 'Keila', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('934659fe-0e01-4ab0-ab00-b7f6650e3129'::uuid, 'Kolel', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('67dcffeb-e158-49d4-b4ed-47d115161015'::uuid, 'Kolel Erev', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('98380fd9-3388-419e-a19b-6faf9c9d924b'::uuid, 'Kolel Jizuk', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('34510876-132f-46e6-9486-69750e3c3cdc'::uuid, 'Kolel Tzeirim', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('bd3e6bbe-971b-4bdd-950d-29dc7716aa4f'::uuid, 'Mejirot', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('c47e0c52-b3e6-4223-b63c-1495f54daded'::uuid, 'Ohel Braja', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('d837ecea-f852-45e5-83a6-a71cc1146896'::uuid, 'Otro', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('ccb7901c-f375-4628-b69f-84b533df2a3b'::uuid, 'Peulot', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('b1b1feec-4d45-43e8-b6a6-7e3455956cfe'::uuid, 'Peulot Mujeres', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('c26aa678-6533-4d93-aef1-e3a1741214be'::uuid, 'Peulot Varones', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('396367d5-9f16-4026-bd51-d11a5f2e72f9'::uuid, 'Seuda Shlishit', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('fa187d51-76fc-49da-a100-d71f1e13365b'::uuid, 'Sillas Sued', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid)
) AS v(id, name, created_at, created_by)
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE destinations.name = v.name);

-- Collectors (inserting 9 new, 10 already exist)
INSERT INTO collectors (id, name, created_at, created_by)
SELECT * FROM (VALUES
  ('1b5f1c48-943c-4dcf-9f70-2f03e561f35f'::uuid, 'Alberto Cohen', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('23d54dd5-eb1c-42c3-a7f8-36f59ba4867b'::uuid, 'Ariel Szklarkiewicz', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('87aff58f-d1b3-4fab-abd7-af8f98baceb3'::uuid, 'Ioni Salama', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('f41fc226-7e1c-4543-b6fe-6c4455e4dc14'::uuid, 'Iosi', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('8e91b0c6-b453-4dfa-8c51-b1b0a81caa28'::uuid, 'Iosi De Dani', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('599d9cb8-044b-4aca-93a5-8d0ea37db256'::uuid, 'Iosi Mauas', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('d52c18fb-1ca7-4006-ad77-b4e0faf6acac'::uuid, 'More Iosi', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('9558a94f-1e07-4fb8-982f-c4307d0d77ee'::uuid, 'Sin Especificar', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid),
  ('c202432b-d865-4c43-81c9-dba8c92c0808'::uuid, 'Sued', NOW(), 'c82fd8eb-ea87-4eb7-9225-d0be7d50a0a5'::uuid)
) AS v(id, name, created_at, created_by)
WHERE NOT EXISTS (SELECT 1 FROM collectors WHERE collectors.name = v.name);

-- Create temporary table to hold lookup IDs
CREATE TEMP TABLE lookup_ids (
  concept_name text,
  concept_id uuid,
  destination_name text,
  destination_id uuid,
  collector_name text,
  collector_id uuid
);

