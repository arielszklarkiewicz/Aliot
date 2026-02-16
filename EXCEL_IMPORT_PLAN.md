# Excel Import Feature - Planning Document

## Overview

Import donations and payments from Excel file with columns:
- Apellido, Nombre, Aclaración, Fecha, Perasha, Monto, Minian, Concepto, Destino, Preguntar, Donacion/Cobranza, Cobrador, Comentario

## ✅ Feasibility: YES, Completely Possible

This is a standard data import feature that can be implemented with existing technologies.

## Proposed Solution: 3-Stage Import Process

### Stage 1: Upload & Parse (Frontend)
**Goal:** Read Excel file and display preview

**Technology:**
- Library: `xlsx` or `SheetJS` (most popular Excel parser for JavaScript)
- Parse on client-side (no server upload needed)

**Process:**
1. User clicks "Import Excel" button
2. File picker opens (accept .xlsx, .xls files)
3. Parse Excel file in browser
4. Display parsed data in table format
5. Show total rows found

**Output:** Array of row objects with mapped columns

---

### Stage 2: Data Mapping & Validation (Frontend)
**Goal:** Map Excel columns to database fields and identify donors

**Sub-Stage 2A: Column Mapping**
- Auto-map recognized columns (Fecha → donationDate, Monto → amount, etc.)
- Allow manual mapping for unmapped columns
- Show warnings for missing required fields

**Sub-Stage 2B: Donor Matching & Merging** ⭐ CRITICAL
**Challenge:** "I need to merge some names that may represent the same person but may be typed differently"

**Solution Options:**

**Option 1: Interactive Fuzzy Matching (RECOMMENDED)**
```
Process:
1. For each row, combine "Apellido + Nombre" → full name
2. Search existing donors using fuzzy matching
3. If match found (>80% similarity):
   - Show suggestion: "Juan Perez" → "Juan Pérez (existing)"
   - User can: Accept / Reject / Create New
4. If no match:
   - Mark as "New Donor"
   - User can review before creating
5. Build mapping table: Row → Donor ID
```

**Libraries for Fuzzy Matching:**
- `fuzzyset.js` - Fast fuzzy string matching
- `string-similarity` - Dice coefficient algorithm
- `fuse.js` - Powerful search/matching

**UI Flow:**
```
Excel Row                    Suggestion              Action
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Juan Perez                 → Juan Pérez (90%)     [✓ Match] [Create New]
Maria Gonzalez             → María González (85%) [✓ Match] [Create New]  
Pedro Rodriguez            → No match found       [Create New Donor]
J. Perez                   → Juan Perez (75%)     [✓ Match] [Create New]
                                                   ⚠️ Low confidence
```

**Option 2: Bulk Review with Grouping**
- Group similar names together
- Show all variations side-by-side
- User selects which ones to merge
- Assign one master donor to multiple Excel rows

**Sub-Stage 2C: Data Validation**
- Required fields check
- Date format validation (parse various formats)
- Amount validation (handle decimals, thousands separators)
- Donation/Cobranza validation (must be one or the other)
- Currency detection (if Pesos/Dolares in data)

**Output:** 
- Validated data array
- Donor mapping table (Excel row → Donor ID)
- List of donors to create
- Validation errors/warnings

---

### Stage 3: Review & Import (Frontend + Backend)
**Goal:** Final review and bulk save to database

**Process:**
1. Show import summary:
   ```
   Ready to import:
   - 45 Donations
   - 12 Payments
   - 8 New donors to create
   - 15 Existing donors matched
   ```

2. User confirms import

3. Backend API calls:
   - POST /api/bulk/donors (create new donors)
   - POST /api/bulk/donations (create donations)
   - POST /api/bulk/payments (create payments)

4. Show progress bar

5. Display results:
   ```
   ✓ Created 8 new donors
   ✓ Imported 45 donations
   ✓ Imported 12 payments
   ✗ 2 rows failed (show errors)
   ```

---

## Data Mapping Table

| Excel Column      | App Field                  | Notes                                    |
|-------------------|----------------------------|------------------------------------------|
| Apellido          | donor.first_name           | Combine, fuzzy match existing           |
| Nombre            | donor.last_name            | Combine, fuzzy match existing           |
| Aclaración        | donor.observations         | Add to donor if new                     |
| Fecha             | donationDate / paymentDate | Parse various formats    |
| Perasha           | perasha                    | Direct mapping                          |
| Monto             | amount                     | Parse number, handle separators         |
| Minian            | minian                     | Map to existing values or add           |
| Concepto          | concept                    | Map to existing values or add           |
| Destino           | destination                | Map to existing values or add           |
| Preguntar         | comment                    | Add as note/comment                     |
| Donacion/Cobranza | TYPE                       | "Donacion" → donation, "Cobranza" → payment |
| Cobrador          | collector                  | For payments only                       |
| Comentario        | comment                    | Append to comment field                 |

---

## UI/UX Design

### Page: /admin/import-excel

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  📊 Importar desde Excel                        │
│  ───────────────────────────────────────────    │
│                                                  │
│  [📁 Seleccionar archivo Excel]                 │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Paso 1: Subir archivo              [1/3] │  │
│  │ Paso 2: Verificar datos y donantes [2/3] │  │
│  │ Paso 3: Confirmar e importar       [3/3] │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [Current step content here]                    │
│                                                  │
│  [◄ Atrás]  [Siguiente ►]  [Cancelar]          │
└─────────────────────────────────────────────────┘
```

### Step 1: Upload
- File picker
- Drag & drop zone
- Show file info (name, size, rows)
- Parse and show preview (first 10 rows)

### Step 2: Matching
- Table with Excel data
- "Donante" column with match suggestions
- Dropdown to select/create donor
- Similarity percentage shown
- Filter: Show only "Needs Review"
- Bulk actions: "Accept all high confidence matches"

### Step 3: Confirm
- Summary statistics
- Final review table
- Import button
- Progress bar during import

---

## Technical Implementation

### Frontend Components

**1. ImportExcel.jsx** (main page)
```javascript
- File upload
- Step wizard (3 steps)
- State management (file, parsed data, mappings)
```

**2. DonorMatchingTable.jsx**
```javascript
- Display rows with suggested matches
- Fuzzy search integration
- Accept/reject/create actions
- Bulk operations
```

**3. ImportPreview.jsx**
```javascript
- Show parsed Excel data
- Column mapping interface
- Validation errors display
```

**4. ImportSummary.jsx**
```javascript
- Statistics
- Confirm/cancel buttons
- Progress tracking
```

### Backend API Endpoints

**Option A: Bulk Import (Recommended)**
```
POST /api/bulk/import
Body: {
  donors: [{ 
    firstName: "Juan",
    lastName: "Perez",
    email: "",
    phone: "",
    observations: "..." 
  }],
  donations: [{ donorId, amount, date, ... }],
  payments: [{ donorId, amount, date, ... }]
}
Response: {
  donorsCreated: 8,
  donationsCreated: 45,
  paymentsCreated: 12,
  errors: []
}
```

**Option B: Separate Endpoints**
```
POST /api/bulk/donors - Create multiple donors
POST /api/bulk/donations - Create multiple donations  
POST /api/bulk/payments - Create multiple payments
```

### Libraries to Install

**Frontend:**
```bash
npm install xlsx             # Excel file parsing
npm install string-similarity # Fuzzy matching
npm install papaparse        # CSV parsing (if needed)
```

**Backend (if needed):**
```bash
# C# doesn't need libraries - Entity Framework can bulk insert
```

---

## Donor Matching Strategies

### Strategy 1: Fuzzy String Matching
```javascript
import stringSimilarity from 'string-similarity';

function findBestMatch(excelFirstName, excelLastName, existingDonors) {
  // Construct full name from Excel data
  const excelFullName = `${excelFirstName} ${excelLastName}`.toLowerCase().trim();
  
  const ratings = existingDonors.map(donor => ({
    donor,
    score: stringSimilarity.compareTwoStrings(
      excelFullName, 
      donor.fullName.toLowerCase().trim() // fullName is computed: firstName + lastName
    )
  }));
  
  const best = ratings.sort((a, b) => b.score - a.score)[0];
  
  if (best.score > 0.8) {
    return { match: best.donor, confidence: 'high', score: best.score };
  } else if (best.score > 0.6) {
    return { match: best.donor, confidence: 'medium', score: best.score };
  }
  return { match: null, confidence: 'low', score: 0 };
}
```

### Strategy 2: Name Normalization
```javascript
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z\s]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, ' '); // Normalize spaces
}

// Then compare normalized names
```

### Strategy 3: Name Parts Matching
```javascript
function compareNameParts(name1, name2) {
  const parts1 = name1.toLowerCase().split(/\s+/);
  const parts2 = name2.toLowerCase().split(/\s+/);
  
  const intersection = parts1.filter(p => parts2.includes(p));
  const union = [...new Set([...parts1, ...parts2])];
  
  return intersection.length / union.length; // Jaccard similarity
}
```

### Strategy 4: Levenshtein Distance
```javascript
// Built into string-similarity library
// Handles typos: "Juan Perez" vs "Juan Peres" → high match
```

---

## Edge Cases to Handle

### 1. Multiple Excel Formats
- Date formats: "31/12/2025", "2025-12-31", "31-Dic-2025"
- Number formats: "1.234,56" (Spanish) vs "1,234.56" (English)
- Empty cells
- Merged cells

### 2. Data Quality Issues
- Missing required fields (Fecha, Monto)
- Invalid amounts (text in number column)
- Ambiguous dates
- Unknown values in Minian/Concepto/Destino

### 3. Donor Matching Challenges
- Same name, different people (Juan Pérez #1, Juan Pérez #2)
- Different spellings (María vs Maria)
- Nicknames vs full names
- Last name first vs first name first (Excel has them in separate columns)
- Middle names sometimes included
- Missing last names (only firstName provided)
- Abbreviated first names (J. instead of Juan)

### 4. Business Logic
- What if Donacion/Cobranza is empty?
- Should virtual transactions be allowed in import?
- How to handle duplicate rows?
- What to do with very old dates?

---

## Recommended Approach

### Phase 1: Basic Import (MVP)
1. Excel upload and parsing
2. Simple donor creation (no matching)
3. Bulk insert donations/payments
4. Manual donor merging later if needed

**Timeline: 1-2 days**

### Phase 2: Donor Matching (Enhanced)
1. Fuzzy matching with suggestions
2. Interactive review interface
3. Bulk acceptance of high-confidence matches
4. Create new donors for no-matches

**Timeline: 2-3 days**

### Phase 3: Advanced Features (Optional)
1. Save import templates
2. Import history/audit log
3. Rollback functionality
4. CSV support
5. Duplicate detection
6. Data cleaning suggestions

**Timeline: 2-3 days**

---

## Security & Validation

### Frontend Validation
- File size limit (e.g., 10MB max)
- File type validation (.xlsx, .xls only)
- Row count limit (e.g., 5000 rows max)
- Required field checks
- Data type validation

### Backend Validation
- Re-validate all data
- Transaction rollback on error
- Audit log of import operations
- Rate limiting on bulk endpoints
- Authentication/authorization (Admin only)

---

## User Feedback & Errors

### During Import
```
✓ Archivo cargado: datos_2025.xlsx (245 filas)
⚠ 12 filas requieren atención
✓ 45 donaciones listas para importar
✓ 12 pagos listos para importar
✗ 3 filas con errores de formato

[Ver detalles]
```

### Error Messages
```
Fila 15: Fecha inválida "32/13/2025"
Fila 28: Monto vacío
Fila 42: Donacion/Cobranza debe ser "Donacion" o "Cobranza"
```

### Success Message
```
✅ Importación completada exitosamente

Resultados:
- 8 donantes nuevos creados
- 45 donaciones importadas
- 12 pagos importados
- 3 filas omitidas (errores)

[Ver registro de actividad] [Cerrar]
```

---

## Conclusion

**Is it possible?** ✅ Absolutely YES

**Complexity:** Medium (donor matching adds complexity)

**Recommended Path:**
1. Start with Phase 1 (basic import) - Quick win
2. Add Phase 2 (matching) - High value
3. Phase 3 optional based on usage

**Key Success Factor:** Good UI/UX for the donor matching step - this is where users need the most help.

**Next Steps:**
1. Review this plan
2. Decide on MVP scope (Phase 1 or 1+2?)
3. Design UI mockups
4. Implement step by step
5. Test with real Excel file

