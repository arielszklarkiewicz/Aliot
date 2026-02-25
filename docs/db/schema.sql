-- PostgreSQL DDL for Donaciones & Pagos
-- Requires extensions: pg_trgm (for autocomplete performance)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ENUM types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_enum') THEN
    CREATE TYPE currency_enum AS ENUM ('Pesos', 'Dólares');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'minian_enum') THEN
    CREATE TYPE minian_enum AS ENUM ('Ashkenazi', 'Sefaradi', 'Netz');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_concept_enum') THEN
    CREATE TYPE donation_concept_enum AS ENUM ('Cohen', 'Levi', '3ro', '4to', '5to', '6to', 'Mosif', 'Mashlim', 'Agve', 'Glile', 'Aliá');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'destination_enum') THEN
    CREATE TYPE destination_enum AS ENUM ('Yeshivá', 'Ashkenazi Minian', 'Other');
  END IF;
END $$;

-- users & roles for auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- donors
CREATE TABLE IF NOT EXISTS donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_donors_name ON donors USING gin (name gin_trgm_ops);

-- donations
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  currency currency_enum NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  donation_date DATE NOT NULL,
  perasha TEXT, -- free text with autocomplete
  minian minian_enum NOT NULL,
  concept donation_concept_enum NOT NULL,
  destination destination_enum NOT NULL,
  destination_other TEXT, -- required when destination = 'Other'
  comment TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_donations_donor_date ON donations (donor_id, donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations (donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_donations_perasha_trgm ON donations USING gin (perasha gin_trgm_ops);

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  currency currency_enum NOT NULL,
  payment_date DATE NOT NULL,
  concept TEXT NOT NULL, -- free text for payments concept
  collector TEXT, -- free text with autocomplete
  comment TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_donor_date ON payments (donor_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_collector_trgm ON payments USING gin (collector gin_trgm_ops);

-- autocomplete terms tracking
CREATE TABLE IF NOT EXISTS autocomplete_terms (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('perasha', 'collector')),
  term TEXT NOT NULL,
  usage_count BIGINT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  UNIQUE (category, term)
);

CREATE INDEX IF NOT EXISTS idx_autocomplete_terms_term_trgm ON autocomplete_terms USING gin (term gin_trgm_ops);

-- audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  diff JSONB
);

-- Constraints & triggers for data integrity

-- Ensure destination_other provided when destination = 'Other'
CREATE OR REPLACE FUNCTION validate_destination_other()
RETURNS trigger AS $$
BEGIN
  IF NEW.destination = 'Other' AND (NEW.destination_other IS NULL OR length(trim(NEW.destination_other)) = 0) THEN
    RAISE EXCEPTION 'destination_other must be provided when destination is Other';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_destination_other ON donations;
CREATE TRIGGER trg_validate_destination_other
BEFORE INSERT OR UPDATE ON donations
FOR EACH ROW EXECUTE FUNCTION validate_destination_other();

-- Normalize free text (trim/collapse whitespace)
CREATE OR REPLACE FUNCTION normalize_text(txt TEXT) RETURNS TEXT AS $$
BEGIN
  IF txt IS NULL THEN RETURN NULL; END IF;
  -- collapse multiple spaces and trim
  RETURN regexp_replace(btrim(txt), '\s+', ' ', 'g');
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION donations_normalize()
RETURNS trigger AS $$
BEGIN
  NEW.perasha := normalize_text(NEW.perasha);
  NEW.comment := normalize_text(NEW.comment);
  NEW.destination_other := normalize_text(NEW.destination_other);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_donations_normalize ON donations;
CREATE TRIGGER trg_donations_normalize
BEFORE INSERT OR UPDATE ON donations
FOR EACH ROW EXECUTE FUNCTION donations_normalize();

CREATE OR REPLACE FUNCTION payments_normalize()
RETURNS trigger AS $$
BEGIN
  NEW.collector := normalize_text(NEW.collector);
  NEW.concept := normalize_text(NEW.concept);
  NEW.comment := normalize_text(NEW.comment);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_normalize ON payments;
CREATE TRIGGER trg_payments_normalize
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION payments_normalize();

-- Upsert autocomplete terms and increment usage counts
CREATE OR REPLACE FUNCTION upsert_autocomplete_term(cat TEXT, val TEXT)
RETURNS VOID AS $$
BEGIN
  IF val IS NULL OR length(trim(val)) = 0 THEN RETURN; END IF;
  INSERT INTO autocomplete_terms(category, term, usage_count, last_used_at)
  VALUES (cat, val, 1, now())
  ON CONFLICT (category, term)
  DO UPDATE SET usage_count = autocomplete_terms.usage_count + 1, last_used_at = now();
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION donations_autocomplete_track()
RETURNS trigger AS $$
BEGIN
  PERFORM upsert_autocomplete_term('perasha', NEW.perasha);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_donations_autocomplete_track ON donations;
CREATE TRIGGER trg_donations_autocomplete_track
AFTER INSERT OR UPDATE OF perasha ON donations
FOR EACH ROW EXECUTE FUNCTION donations_autocomplete_track();

CREATE OR REPLACE FUNCTION payments_autocomplete_track()
RETURNS trigger AS $$
BEGIN
  PERFORM upsert_autocomplete_term('collector', NEW.collector);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_autocomplete_track ON payments;
CREATE TRIGGER trg_payments_autocomplete_track
AFTER INSERT OR UPDATE OF collector ON payments
FOR EACH ROW EXECUTE FUNCTION payments_autocomplete_track();
