CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE TABLE collectors (
        id uuid NOT NULL,
        name text NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        CONSTRAINT "PK_collectors" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE TABLE concepts (
        id uuid NOT NULL,
        name text NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        CONSTRAINT "PK_concepts" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE TABLE destinations (
        id uuid NOT NULL,
        name text NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        CONSTRAINT "PK_destinations" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE TABLE donors (
        id uuid NOT NULL,
        first_name text NOT NULL,
        last_name text,
        email text,
        phone text,
        address text,
        observations text,
        is_occasional_donor boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        CONSTRAINT "PK_donors" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE TABLE donations (
        id uuid NOT NULL,
        donor_id uuid NOT NULL,
        currency text NOT NULL,
        amount numeric NOT NULL,
        donation_date date NOT NULL,
        perasha text,
        minian text NOT NULL,
        concept text NOT NULL,
        destination text NOT NULL,
        destination_other text,
        comment text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        CONSTRAINT "PK_donations" PRIMARY KEY (id),
        CONSTRAINT "FK_donations_donors_donor_id" FOREIGN KEY (donor_id) REFERENCES donors (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE TABLE payments (
        id uuid NOT NULL,
        donor_id uuid NOT NULL,
        currency text NOT NULL,
        amount numeric NOT NULL,
        payment_date date NOT NULL,
        destination text NOT NULL,
        collector text,
        comment text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        CONSTRAINT "PK_payments" PRIMARY KEY (id),
        CONSTRAINT "FK_payments_donors_donor_id" FOREIGN KEY (donor_id) REFERENCES donors (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_collectors_name" ON collectors (name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_concepts_name" ON concepts (name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_destinations_name" ON destinations (name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE INDEX "IX_donations_donor_id" ON donations (donor_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    CREATE INDEX "IX_payments_donor_id" ON payments (donor_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203041010_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251203041010_InitialCreate', '9.0.0');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203044610_AddIsVirtualColumn') THEN
    ALTER TABLE payments ADD is_virtual boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203044610_AddIsVirtualColumn') THEN
    ALTER TABLE donations ADD is_virtual boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251203044610_AddIsVirtualColumn') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251203044610_AddIsVirtualColumn', '9.0.0');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225153811_AddUserAuthenticationWithEmail') THEN
    CREATE TABLE users (
        id uuid NOT NULL,
        email text NOT NULL,
        password_hash text NOT NULL,
        full_name text,
        role integer NOT NULL,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        CONSTRAINT "PK_users" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225153811_AddUserAuthenticationWithEmail') THEN
    CREATE UNIQUE INDEX "IX_users_email" ON users (email);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225153811_AddUserAuthenticationWithEmail') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251225153811_AddUserAuthenticationWithEmail', '9.0.0');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225174145_AddMatanaField') THEN
    ALTER TABLE donations ADD matana boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225174145_AddMatanaField') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251225174145_AddMatanaField', '9.0.0');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE users ADD created_by uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE users ADD updated_by uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE payments ADD created_by uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE payments ADD updated_by uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE donors ADD created_by uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE donors ADD updated_by uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE donations ADD created_by uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE donations ADD updated_by uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE destinations ADD created_by uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE destinations ADD updated_by uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE concepts ADD created_by uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE concepts ADD updated_by uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE collectors ADD created_by uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    ALTER TABLE collectors ADD updated_by uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225181935_AddAuditFields') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251225181935_AddAuditFields', '9.0.0');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225183108_AddDeletionLogTable') THEN
    CREATE TABLE deletion_logs (
        id uuid NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        entity_details text,
        deleted_by uuid NOT NULL,
        deleted_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_deletion_logs" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225183108_AddDeletionLogTable') THEN
    CREATE INDEX "IX_deletion_logs_deleted_at" ON deletion_logs (deleted_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225183108_AddDeletionLogTable') THEN
    CREATE INDEX "IX_deletion_logs_entity_type" ON deletion_logs (entity_type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225183108_AddDeletionLogTable') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251225183108_AddDeletionLogTable', '9.0.0');
    END IF;
END $EF$;
COMMIT;

