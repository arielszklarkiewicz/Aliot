#!/bin/bash

# Complete database reset and import script
# This will:
# 1. Drop and recreate the database
# 2. Run migrations
# 3. Parse Excel file
# 4. Import data

set -e  # Exit on error

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DB_NAME="donaciones_dev"
DB_USER="ariel"
EXCEL_FILE="/Users/ariel/Downloads/Bueno7.xlsx"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DONACIONES - COMPLETE DATABASE RESET${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Excel file exists
if [ ! -f "$EXCEL_FILE" ]; then
    echo -e "${RED}✗ Excel file not found: $EXCEL_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will DELETE all data in $DB_NAME${NC}"
echo -e "${YELLOW}Press Ctrl+C to cancel, or Enter to continue...${NC}"
read

echo ""
echo -e "${GREEN}Step 1: Closing connections and dropping database...${NC}"
psql -U $DB_USER postgres << EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF
echo -e "${GREEN}✓ Database recreated${NC}"
echo ""

echo -e "${GREEN}Step 2: Running migrations...${NC}"
cd api/Donaciones.Api
# Generate SQL schema from migrations
dotnet ef migrations script --output /tmp/schema.sql > /dev/null 2>&1
cd ../..
# Apply schema to donaciones_dev
psql -U $DB_USER -d $DB_NAME -f /tmp/schema.sql > /dev/null 2>&1
echo -e "${GREEN}✓ Migrations applied${NC}"
echo ""

echo -e "${GREEN}Step 3: Parsing Excel file...${NC}"
python3 parse_excel.py
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Excel parsing failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}Step 4: Importing data into database...${NC}"
python3 import_data.py
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Data import failed${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DATABASE RESET COMPLETE!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Database successfully populated!${NC}"
echo ""
echo -e "${YELLOW}Default admin user:${NC}"
echo -e "  The API will auto-create the admin user on first startup:"
echo -e "  Email: ${BLUE}admin@aliot.com${NC}"
echo -e "  Password: ${BLUE}123456${NC}"
echo ""
echo -e "${GREEN}Start the application:${NC}"
echo -e "  cd api/Donaciones.Api && dotnet run"
echo -e "  cd frontend && npm start"
