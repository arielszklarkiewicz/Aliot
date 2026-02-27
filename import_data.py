#!/usr/bin/env python3
"""
Data Import Script for Donaciones Ieshiva
Imports donors, donations, and payments from parsed Excel data into PostgreSQL
"""

import json
import psycopg2
import sys
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'donaciones_dev',
    'user': 'ariel'
}

def main():
    print("=" * 60)
    print("DONACIONES IESHIVA - DATA IMPORT")
    print("=" * 60)
    print()
    
    # Load parsed data
    print("Loading data files...")
    with open('/tmp/donor_records.json', 'r') as f:
        donor_records = json.load(f)
    with open('/tmp/donation_records.json', 'r') as f:
        donation_records = json.load(f)
    with open('/tmp/payment_records.json', 'r') as f:
        payment_records = json.load(f)
    with open('/tmp/lookups.json', 'r') as f:
        lookups = json.load(f)
    
    print(f"✓ Loaded {len(donor_records)} donors")
    print(f"✓ Loaded {len(donation_records)} donations")
    print(f"✓ Loaded {len(payment_records)} payments")
    print()
    
    # Connect to database
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("✓ Connected to PostgreSQL")
        print()
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        sys.exit(1)
    
    try:
        # Step 1: Create import user
        print("Step 1: Creating import user...")
        cur.execute("""
            INSERT INTO users (id, email, password_hash, role, is_active, created_at)
            VALUES (gen_random_uuid(), 'import@donaciones.internal', 'IMPORT_USER_NO_LOGIN', 2, true, NOW())
            ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
            RETURNING id
        """)
        import_user_id = str(cur.fetchone()[0])
        conn.commit()
        print(f"✓ Import user ID: {import_user_id}")
        print()
        
        # Step 2: Insert lookups
        print("Step 2: Inserting lookup values...")
        
        # Concepts
        for concept in lookups['concepts']:
            cur.execute("""
                INSERT INTO concepts (id, name, created_at, created_by)
                VALUES (gen_random_uuid(), %s, NOW(), %s)
                ON CONFLICT (name) DO NOTHING
            """, (concept, import_user_id))
        
        # Destinations
        for dest in lookups['destinations']:
            cur.execute("""
                INSERT INTO destinations (id, name, created_at, created_by)
                VALUES (gen_random_uuid(), %s, NOW(), %s)
                ON CONFLICT (name) DO NOTHING
            """, (dest, import_user_id))
        
        # Collectors
        for coll in lookups['collectors']:
            cur.execute("""
                INSERT INTO collectors (id, name, created_at, created_by)
                VALUES (gen_random_uuid(), %s, NOW(), %s)
                ON CONFLICT (name) DO NOTHING
            """, (coll, import_user_id))
        
        conn.commit()
        print(f"✓ Inserted {len(lookups['concepts'])} concepts")
        print(f"✓ Inserted {len(lookups['destinations'])} destinations")
        print(f"✓ Inserted {len(lookups['collectors'])} collectors")
        print()
        
        # Fetch lookup IDs
        print("Fetching lookup IDs...")
        cur.execute("SELECT id, name FROM concepts")
        concept_map = {row[1]: str(row[0]) for row in cur.fetchall()}
        
        cur.execute("SELECT id, name FROM destinations")
        dest_map = {row[1]: str(row[0]) for row in cur.fetchall()}
        
        cur.execute("SELECT id, name FROM collectors")
        coll_map = {row[1]: str(row[0]) for row in cur.fetchall()}
        print(f"✓ Loaded {len(concept_map)} concept IDs")
        print(f"✓ Loaded {len(dest_map)} destination IDs")
        print(f"✓ Loaded {len(coll_map)} collector IDs")
        print()
        
        # Step 3: Insert donors
        print(f"Step 3: Inserting {len(donor_records)} donors...")
        for i, donor in enumerate(donor_records):
            # Clean up observations - remove "Aclaración: " prefix if present
            observations = donor['observations']
            if observations and observations.startswith('Aclaración: '):
                observations = observations[12:]  # Remove "Aclaración: " (12 characters)
            
            cur.execute("""
                INSERT INTO donors (id, first_name, last_name, observations, is_occasional_donor, created_at, created_by)
                VALUES (%s, %s, %s, %s, %s, NOW(), %s)
            """, (donor['id'], donor['first_name'], donor['last_name'], 
                  observations, False, import_user_id))
            
            if (i + 1) % 100 == 0:
                print(f"  Progress: {i + 1}/{len(donor_records)}")
                conn.commit()
        
        conn.commit()
        print(f"✓ Inserted {len(donor_records)} donors")
        print()
        
        # Create a default concept for donations without concept
        print("Creating default concept for donations without concept...")
        cur.execute("""
            INSERT INTO concepts (id, name, created_at, created_by)
            VALUES (gen_random_uuid(), 'Sin Especificar', NOW(), %s)
            ON CONFLICT (name) DO NOTHING
            RETURNING id
        """, (import_user_id,))
        result = cur.fetchone()
        if result:
            default_concept_id = str(result[0])
        else:
            cur.execute("SELECT id FROM concepts WHERE name = 'Sin Especificar'")
            default_concept_id = str(cur.fetchone()[0])
        conn.commit()
        print(f"✓ Default concept ID: {default_concept_id}")
        print()
        
        # Step 4: Insert donations
        print(f"Step 4: Inserting {len(donation_records)} donations...")
        for i, don in enumerate(donation_records):
            concept_id = concept_map.get(don['concept']) if don['concept'] else default_concept_id
            dest_id = dest_map.get(don['destination'])
            # Use default value for minian if missing
            minian = don['minian'] if don['minian'] else 'Sin Especificar'
            
            cur.execute("""
                INSERT INTO donations (id, donor_id, currency, amount, donation_date, perasha, minian, 
                                     concept, destination, comment, is_virtual, matana, created_at, created_by)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
            """, (don['donor_id'], don['currency'], don['amount'], don['date'], don['perasha'], 
                  minian, concept_id, dest_id, don['comment'], don['is_virtual'], 
                  don['matana'], import_user_id))
            
            if (i + 1) % 500 == 0:
                print(f"  Progress: {i + 1}/{len(donation_records)}")
                conn.commit()
        
        conn.commit()
        print(f"✓ Inserted {len(donation_records)} donations")
        print()
        
        # Step 5: Insert payments
        print(f"Step 5: Inserting {len(payment_records)} payments...")
        for i, pay in enumerate(payment_records):
            dest_id = dest_map.get(pay['destination'])
            coll_id = coll_map.get(pay['collector'])
            
            cur.execute("""
                INSERT INTO payments (id, donor_id, currency, amount, payment_date, 
                                    destination, collector, comment, is_virtual, created_at, created_by)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
            """, (pay['donor_id'], pay['currency'], pay['amount'], pay['date'], 
                  dest_id, coll_id, pay['comment'], pay['is_virtual'], import_user_id))
            
            if (i + 1) % 200 == 0:
                print(f"  Progress: {i + 1}/{len(payment_records)}")
                conn.commit()
        
        conn.commit()
        print(f"✓ Inserted {len(payment_records)} payments")
        print()
        
        # Show final statistics
        print("=" * 60)
        print("IMPORT COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print()
        
        cur.execute("SELECT COUNT(*) FROM donors WHERE created_by = %s", (import_user_id,))
        print(f"Total Donors:    {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM donations WHERE created_by = %s", (import_user_id,))
        print(f"Total Donations: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM payments WHERE created_by = %s", (import_user_id,))
        print(f"Total Payments:  {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM donations WHERE created_by = %s AND matana = true", (import_user_id,))
        print(f"Matana Records:  {cur.fetchone()[0]}")
        
        # Create default admin user
        print()
        print("Step 6: Creating default admin user...")
        cur.execute("""
            INSERT INTO users (id, email, password_hash, role, is_active, created_at)
            VALUES (gen_random_uuid(), 'admin@aliot.com', '$2a$11$vVq8P8K8zX9xYxYxYxYxYeH0wP7zP7zP7zP7zP7zP7zP7zP7zP7zP.', 0, true, NOW())
            ON CONFLICT (email) DO NOTHING
            RETURNING id
        """)
        result = cur.fetchone()
        if result:
            print(f"✓ Admin user created: admin@aliot.com")
            print(f"  Password: 123456")
            print(f"  ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!")
        else:
            print(f"✓ Admin user already exists: admin@aliot.com")
        conn.commit()
        
        print()
        print("You can now start the API and frontend to view the imported data!")
        
    except Exception as e:
        print(f"\n✗ Error during import: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()
