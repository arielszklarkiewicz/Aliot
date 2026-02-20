#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Donaciones Data Import${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Database connection
DB_NAME="donaciones_dev"
DB_USER="ariel"

# Get import user ID or create it
echo -e "${GREEN}Step 1: Creating import user...${NC}"
IMPORT_USER_ID=$(psql -U $DB_USER $DB_NAME -t -c "
  INSERT INTO users (id, email, password_hash, role, is_active, created_at)
  VALUES (gen_random_uuid(), 'import@donaciones.internal', 'IMPORT_USER_NO_LOGIN', 1, true, NOW())
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id;
" | tr -d ' ')

echo "Import user ID: $IMPORT_USER_ID"
echo ""

echo -e "${GREEN}Step 2: Running Python import script...${NC}"

python3 << EOFPYTHON
import json
import psycopg2
from datetime import datetime
import sys

# Load data
with open('/tmp/donor_records.json', 'r') as f:
    donor_records = json.load(f)
with open('/tmp/donation_records.json', 'r') as f:
    donation_records = json.load(f)
with open('/tmp/payment_records.json', 'r') as f:
    payment_records = json.load(f)
with open('/tmp/lookups.json', 'r') as f:
    lookups = json.load(f)

# Connect to database
conn = psycopg2.connect(
    host="localhost",
    database="$DB_NAME",
    user="$DB_USER"
)
cur = conn.cursor()

import_user_id = "$IMPORT_USER_ID"

try:
    print("Inserting lookups...")
    
    # Insert concepts
    for concept in lookups['concepts']:
        cur.execute("""
            INSERT INTO concepts (id, name, created_at, created_by)
            VALUES (gen_random_uuid(), %s, NOW(), %s)
            ON CONFLICT (name) DO NOTHING
        """, (concept, import_user_id))
    
    # Insert destinations  
    for dest in lookups['destinations']:
        cur.execute("""
            INSERT INTO destinations (id, name, created_at, created_by)
            VALUES (gen_random_uuid(), %s, NOW(), %s)
            ON CONFLICT (name) DO NOTHING
        """, (dest, import_user_id))
    
    # Insert collectors
    for coll in lookups['collectors']:
        cur.execute("""
            INSERT INTO collectors (id, name, created_at, created_by)
            VALUES (gen_random_uuid(), %s, NOW(), %s)
            ON CONFLICT (name) DO NOTHING
        """, (coll, import_user_id))
    
    conn.commit()
    print(f"✓ Inserted lookups")
    
    # Fetch lookup IDs
    cur.execute("SELECT id, name FROM concepts")
    concept_map = {row[1]: row[0] for row in cur.fetchall()}
    
    cur.execute("SELECT id, name FROM destinations")
    dest_map = {row[1]: row[0] for row in cur.fetchall()}
    
    cur.execute("SELECT id, name FROM collectors")
    coll_map = {row[1]: row[0] for row in cur.fetchall()}
    
    print(f"Inserting {len(donor_records)} donors...")
    for i, donor in enumerate(donor_records):
        cur.execute("""
            INSERT INTO donors (id, first_name, last_name, observations, is_occasional_donor, created_at, created_by)
            VALUES (%s, %s, %s, %s, %s, NOW(), %s)
        """, (donor['id'], donor['first_name'], donor['last_name'], donor['observations'], False, import_user_id))
        
        if (i + 1) % 100 == 0:
            print(f"  {i + 1}/{len(donor_records)}")
    
    conn.commit()
    print(f"✓ Inserted {len(donor_records)} donors")
    
    print(f"Inserting {len(donation_records)} donations...")
    for i, don in enumerate(donation_records):
        concept_id = concept_map.get(don['concept'])
        dest_id = dest_map.get(don['destination'])
        
        cur.execute("""
            INSERT INTO donations (id, donor_id, currency, amount, donation_date, perasha, minian, 
                                 concept, destination, comment, is_virtual, matana, created_at, created_by)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
        """, (don['donor_id'], don['currency'], don['amount'], don['date'], don['perasha'], 
              don['minian'], concept_id, dest_id, don['comment'], don['is_virtual'], 
              don['matana'], import_user_id))
        
        if (i + 1) % 500 == 0:
            print(f"  {i + 1}/{len(donation_records)}")
            conn.commit()
    
    conn.commit()
    print(f"✓ Inserted {len(donation_records)} donations")
    
    print(f"Inserting {len(payment_records)} payments...")
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
            print(f"  {i + 1}/{len(payment_records)}")
            conn.commit()
    
    conn.commit()
    print(f"✓ Inserted {len(payment_records)} payments")
    
    print("\n" + "="*50)
    print("Import completed successfully!")
    print("="*50)
    
    # Show stats
    cur.execute("SELECT COUNT(*) FROM donors WHERE created_by = %s", (import_user_id,))
    print(f"Donors: {cur.fetchone()[0]}")
    
    cur.execute("SELECT COUNT(*) FROM donations WHERE created_by = %s", (import_user_id,))
    print(f"Donations: {cur.fetchone()[0]}")
    
    cur.execute("SELECT COUNT(*) FROM payments WHERE created_by = %s", (import_user_id,))
    print(f"Payments: {cur.fetchone()[0]}")
    
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
    sys.exit(1)
finally:
    cur.close()
    conn.close()

EOFPYTHON

