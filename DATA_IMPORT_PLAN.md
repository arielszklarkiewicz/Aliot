# Excel Data Import Plan - SQL Generation

**Date:** 2026-02-19  
**Source File:** `/Users/ariel/Downloads/Bueno6.xlsx`  
**Status:** Ready for SQL generation (pending final decisions)

---

## 📊 Data Summary

### Source Data
- **Total Rows:** 5,516
- **Valid Transactions:** 5,477 (after skipping 6 empty name rows)
- **Unique Donors:** 658 (counting Apellido + Nombre + Aclaracion as separate donors)

### Transaction Breakdown
- **Donations:** 4,247
- **Payments (Cobranzas):** 1,230
- **Currency Distribution:**
  - Pesos: 5,351
  - Dolares: 159
- **Virtual Records:** 16

---

## 🎯 Import Strategy Decisions Made

### 1. Donor Creation Strategy
✅ **CONFIRMED:** Create **separate donor records** for each unique combination of:
- Apellido + Nombre + Aclaracion

**Example:**
- "Laufer, Biniamin" (empty aclaracion) = Donor #1
- "Laufer, Biniamin - Suegro" = Donor #2 (different person)

**Total Donors to Create:** 658

---

## 🗂️ Excel File Structure

### Column Mapping (Bueno6.xlsx)
| Column | Name | Maps To | Notes |
|--------|------|---------|-------|
| 1 | Apellido | Donor.LastName | Pascal case normalized |
| 2 | Nombre | Donor.FirstName | Pascal case normalized |
| 3 | Aclaración | Donor.Observations | Pascal case, stored as "Aclaración: <value>" |
| 4 | Dolares | Currency flag | "DOLARES" = dollars, empty = pesos |
| 5 | Fecha | DonationDate / PaymentDate | DateTime object |
| 6 | Perasha | Donation.Perasha | Pascal case, donations only |
| 7 | Monto | Amount | Number or "MI" (Matana) |
| 8 | Minian | Donation.Minian | String: Sefaradi, Ashkenazi, Netz |
| 9 | Concepto | Donation.Concept | Lookup table (Concept) |
| 10 | Destino | Destination | Lookup table (Destination) |
| 11 | Preguntar | (ignored) | Not imported |
| 12 | Donacion/Cobranza | Transaction Type | "Donación" or "Cobranza" |
| 13 | Cobrador | Payment.Collector | Lookup table (Collector), payments only |
| 14 | Comentario | Comment | Text field |

---

## 🔧 Data Normalization Rules

### Names (Pascal Case)
```
Input: "juan perez" → Output: "Juan Perez"
Input: "MARIA LOPEZ" → Output: "Maria Lopez"
Input: "pedro" → Output: "Pedro"
```

### Currency Detection
```
Column 4 = "DOLARES" → currency = "dolares"
Column 4 = empty/other → currency = "pesos"
```

### Virtual Records Detection
```
IsVirtual = true if:
  - Column 14 (Comentario) contains "registro virtual" (case insensitive)
  - OR Column 6 (Perasha) contains "VIRTUAL" (case insensitive)
```

### Transaction Type
```
Column 12 = "Donación" → Create Donation
Column 12 = "Cobranza" → Create Payment
Column 12 = empty/NULL → ???
```

---

## ⚠️ Special Data Cases

### Case 1: MI Values (Matana) - 110 rows
**What:** Monto column (col 7) contains "MI" instead of a number  
**Meaning:** MI = Matana in the system  
**Rows Affected:** 110 donation records from Oct-Dec 2025

**❓ DECISION NEEDED:**
1. What should the `Amount` value be?
   - **Option A:** Amount = 0 (zero), Matana = true
   - **Option B:** Amount = specific value (what value?)
   
2. Confirm: Set `Matana = true` for these records?

**Example rows:**
```
Row 5244: Cohen, Alberto - MI - Donación - 2025-10-03
Row 5245: Sued, Abraham - MI - Donación - 2025-10-03
```

---

### Case 2: Excel Formula Values - 2 rows
**What:** Monto column contains "=-450000" (Excel formula)  
**Meaning:** Negative payment amount (-450000)  
**Action:** Parse as 450000 and take absolute value

**Example rows:**
```
Row 5514: Baler, Ioni - "=-450000" - Cobranza - 2025-12-31
Row 5516: Baler, Ioni - "=-450000" - Cobranza - 2025-12-31
```

✅ **Handling:** Convert to 450000 (positive number)

---

### Case 3: Missing Transaction Type - 33 rows
**What:** Column 12 (Donacion/Cobranza) is empty  
**Pattern:** All have Destino = "Ieshiva", dates in Nov-Dec 2025  
**Sample Data:**
```
Row 5448: Kiwowicz, Netu - 60000 pesos - (no tipo)
Row 5449: Mohadeb, Shimi - 101000 pesos - (no tipo)
Row 5454: Yabra, Pinjas - 252000 pesos - (no tipo)
```

**❓ DECISION NEEDED:**  
Should these default to "Donación"? They appear to be legitimate donations.

---

### Case 4: Empty Donor Names - 6 rows (SKIPPED)
**What:** Both Apellido AND Nombre are empty  
**Action:** Already skipped during analysis  
✅ **No action needed**

---

## 📋 Lookup Values Analysis

### Minian Values (stored as string, not lookup)
- Sefaradi (2,286 records)
- Ashkenazi (1,590 records)
- Netz (449 records)

### Concept (Concepto) - 20 unique values
**To create/verify in Concept lookup table:**
```
3ro, 4to, 5to, 6to, 7mo, Agve, Aliá, Cohen, Glile, Ieshiva, 
Levi, Maftir, Mashlim, Minja 3ro, Minja Cohen, Minja Levi, 
Mosif, Petija, Sefaradi, Seudat 3
```

### Destination (Destino) - 22 unique values
**To create/verify in Destination lookup table:**
```
Campaña, Escuela, Gan, Ieshiva, Ieshiva Guedola, Ieshiva Ketana, 
Keila, Kolel, Kolel Erev, Kolel Jizuk, Kolel Tzeirim, Mejirot, 
Minian Ashkenazi, Ohel Braja, Ohel Moshe, Otro, Peulot, 
Peulot Mujeres, Peulot Varones, Seminario, Seuda Shlishit, Sillas Sued
```

### Collector (Cobrador) - 18 unique values
**To create/verify in Collector lookup table:**
```
?, ??, Alberto Cohen, Ari Grunblatt, Ariel Szklarkiewicz, Elazar, 
Ezra, Ioni Salama, Iosi, Iosi De Dani, Iosi Mauas, Kupa, Kupá, 
Marcelo, More Iosi, Rab Dines, Sued, Transferencia
```

**❓ DECISIONS NEEDED:**
1. Merge "Kupa" and "Kupá" into single "Kupa"?
2. Replace "?" and "??" with "Sin Especificar"?

---

## 🔨 SQL Generation Implementation Plan

### Step 1: Check Database for Existing Lookups
```sql
-- Query existing Concepts
SELECT Id, Name FROM Concepts;

-- Query existing Destinations  
SELECT Id, Name FROM Destinations;

-- Query existing Collectors
SELECT Id, Name FROM Collectors;

-- Get first admin user for CreatedBy
SELECT Id FROM Users WHERE Role = 'Admin' ORDER BY CreatedAt LIMIT 1;
```

### Step 2: Generate Lookup INSERT Statements
Only create lookups that don't already exist in database.

```sql
-- Example:
INSERT INTO Concepts (Id, Name, CreatedAt, CreatedBy) VALUES
  ('uuid-1', '3ro', NOW(), '<admin-id>'),
  ('uuid-2', '4to', NOW(), '<admin-id>'),
  ...
```

### Step 3: Generate Donor INSERT Statements (658 donors)
```sql
INSERT INTO Donors (
    Id, 
    FirstName, 
    LastName, 
    Observations,
    IsOccasionalDonor,
    CreatedAt,
    CreatedBy
) VALUES
  ('<uuid-1>', 'Juan Carlos', 'Grunblatt', NULL, false, NOW(), '<admin-id>'),
  ('<uuid-2>', 'Shlomo', 'Gutman', NULL, false, NOW(), '<admin-id>'),
  ('<uuid-3>', 'Biniamin', 'Laufer', NULL, false, NOW(), '<admin-id>'),
  ('<uuid-4>', 'Biniamin', 'Laufer', 'Aclaración: Suegro', false, NOW(), '<admin-id>'),
  ...
```

### Step 4: Generate Donation INSERT Statements (4,247 donations)
```sql
INSERT INTO Donations (
    Id,
    DonorId,
    Currency,
    Amount,
    DonationDate,
    Perasha,
    Minian,
    Concept,          -- FK to Concept lookup
    Destination,      -- FK to Destination lookup
    DestinationOther,
    Comment,
    IsVirtual,
    Matana,
    CreatedAt,
    CreatedBy
) VALUES
  ('<uuid>', '<donor-uuid>', 'pesos', 360468.00, '2021-09-07', 'Rosh Hashana 5782', 
   'Sefaradi', '<concept-id>', '<destination-id>', NULL, NULL, false, false, 
   NOW(), '<admin-id>'),
  ...
```

**Special handling:**
- If Monto = "MI": Set Matana = true, Amount = ??? (decision needed)
- Map Concepto → Concept lookup ID
- Map Destino → Destination lookup ID
- Minian = string value (not lookup)

### Step 5: Generate Payment INSERT Statements (1,230 payments)
```sql
INSERT INTO Payments (
    Id,
    DonorId,
    Currency,
    Amount,
    PaymentDate,
    Destination,      -- FK to Destination lookup
    Collector,        -- FK to Collector lookup
    Comment,
    IsVirtual,
    CreatedAt,
    CreatedBy
) VALUES
  ('<uuid>', '<donor-uuid>', 'pesos', 1000.00, '2022-03-10', 
   '<destination-id>', '<collector-id>', NULL, false, NOW(), '<admin-id>'),
  ...
```

**Special handling:**
- If Monto = "=-450000": Parse as 450000 (absolute value)
- Map Destino → Destination lookup ID
- Map Cobrador → Collector lookup ID

---

## 📄 Final SQL Script Structure

```sql
-- ============================================================================
-- DONACIONES IESHIVA - DATA IMPORT SCRIPT
-- Generated: 2026-02-19
-- Source: Bueno6.xlsx
-- Total: 658 donors, 4247 donations, 1230 payments
-- ============================================================================

BEGIN TRANSACTION;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 1: Create Missing Lookup Values
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Concepts (only those not already in DB)
INSERT INTO Concepts (Id, Name, CreatedAt, CreatedBy) VALUES ...;

-- Destinations (only those not already in DB)
INSERT INTO Destinations (Id, Name, CreatedAt, CreatedBy) VALUES ...;

-- Collectors (only those not already in DB)
INSERT INTO Collectors (Id, Name, CreatedAt, CreatedBy) VALUES ...;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 2: Create Donors (658 records)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO Donors (...) VALUES
  ('uuid-1', 'Juan Carlos', 'Grunblatt', NULL, ...),
  ('uuid-2', 'Shlomo', 'Gutman', NULL, ...),
  ... (656 more rows)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 3: Create Donations (4,247 records)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO Donations (...) VALUES
  ('uuid-x', 'donor-uuid-1', 'pesos', 360468, '2021-09-07', ...),
  ... (4,246 more rows)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECTION 4: Create Payments (1,230 records)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO Payments (...) VALUES
  ('uuid-y', 'donor-uuid-2', 'pesos', 1000, '2022-03-10', ...),
  ... (1,229 more rows)

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES (run after import to verify)
-- ============================================================================

-- Count imported donors
SELECT COUNT(*) FROM Donors WHERE CreatedAt >= '<import-timestamp>';

-- Count imported donations
SELECT COUNT(*) FROM Donations WHERE CreatedAt >= '<import-timestamp>';

-- Count imported payments  
SELECT COUNT(*) FROM Payments WHERE CreatedAt >= '<import-timestamp>';

-- Sum by currency
SELECT Currency, SUM(Amount) FROM Donations 
WHERE CreatedAt >= '<import-timestamp>' GROUP BY Currency;

-- ============================================================================
```

---

## 🚨 Outstanding Decisions Required

Before generating the SQL script, please answer:

### 1. MI (Matana) Records - 110 rows
**Question:** When Monto = "MI", what should the Amount be?
- [ ] **Option A:** Amount = 0
- [ ] **Option B:** Amount = specific value (specify: _______)

### 2. Empty Transaction Type - 33 rows
**Question:** Rows with empty Tipo field - default to "Donación"?
- [ ] Yes, default to Donación
- [ ] No, skip these rows
- [ ] Other: __________

### 3. CreatedBy User
**Question:** What user ID for CreatedBy field?
- [ ] Empty GUID (00000000-0000-0000-0000-000000000000)
- [ ] First admin user from database
- [ ] Create specific import user

### 4. Lookup Cleanup
**Question:** Should we clean up lookup values?
- [ ] Merge "Kupa" and "Kupá" → "Kupa"
- [ ] Replace "?" and "??" → "Sin Especificar"
- [ ] Leave as-is

---

## 📂 Files & Locations

- **Source Excel:** `/Users/ariel/Downloads/Bueno6.xlsx`
- **This Plan:** `/Users/ariel/DonacionesIeshiva/Donaciones/DATA_IMPORT_PLAN.md`
- **Output SQL:** Will be generated at: `/Users/ariel/DonacionesIeshiva/Donaciones/import_data.sql`

---

## 🚀 Next Steps

**To continue:**

1. ✅ Answer the 4 decision questions above
2. 🔍 I will check the database schema and existing lookups
3. 🔨 Generate the complete SQL import script
4. ✅ You review and test on dev/staging database
5. 🚀 Execute on production database

---

## 📊 Summary

**Data Ready:**
- ✅ 658 unique donors identified
- ✅ 5,477 transactions validated
- ✅ Pascal case normalization defined
- ✅ Currency detection logic defined
- ✅ Virtual records detection logic defined

**Waiting For:**
- ⏸️ 4 decision answers
- ⏸️ Database schema verification
- ⏸️ Existing lookup values check

**Status:** READY TO GENERATE SQL (pending decisions)

---

**Last Updated:** 2026-02-19 19:34
