-0# Excel Import Plan - Update Notes

## Key Change: Donor Name Mapping

**Updated on:** 2026-02-11

### Change Summary

The Excel columns for donor names now map to separate first/last name fields:

- **Apellido** (Excel) → `donor.lastName` (Database)
- **Nombre** (Excel) → `donor.firstName` (Database)

### Database Model

```csharp
public record Donor
{
    public string FirstName { get; set; }  // Nombre from Excel
    public string? LastName { get; set; }  // Apellido from Excel
    
    // Computed property for display
    public string FullName => string.IsNullOrWhiteSpace(LastName) 
        ? FirstName 
        : $"{FirstName} {LastName}";
}
```

### Impact on Fuzzy Matching

The fuzzy matching algorithm will:
1. Combine `Nombre + Apellido` from Excel into a temporary fullName
2. Compare against existing donors' computed `FullName` property
3. Suggest matches based on string similarity

**Example:**
```
Excel Row:
- Nombre: Juan
- Apellido: Perez

Compared against database:
- Donor.FirstName: Juan
- Donor.LastName: Pérez  
- Donor.FullName: "Juan Pérez" (computed)

Match Score: 95% (high confidence)
```

### Updated Mapping Table

| Excel Column | Database Field | Notes |
|-------------|---------------|-------|
| Nombre | firstName | Required |
| Apellido | lastName | Optional |
| Aclaración | observations | Additional info |

### Code Example

```javascript
function constructDonorFromExcel(row) {
  return {
    firstName: row.Nombre.trim(),
    lastName: row.Apellido?.trim() || null,
    observations: row.Aclaración || null,
    email: null, // Not in Excel
    phone: null, // Not in Excel
    isOccasionalDonor: false // Default
  };
}

function matchWithExisting(excelRow, existingDonors) {
  // Construct full name from Excel
  const excelFullName = `${excelRow.Nombre} ${excelRow.Apellido}`.trim();
  
  // Compare with existing donors using their FullName property
  const matches = existingDonors.map(donor => ({
    donor,
    score: calculateSimilarity(excelFullName, donor.fullName)
  }));
  
  return findBestMatch(matches);
}
```

### Benefits of This Approach

1. ✅ Maintains data structure integrity (first/last names separate)
2. ✅ Supports donors with only first names (lastName can be null)
3. ✅ Enables better sorting and filtering by last name
4. ✅ Follows standard database normalization practices
5. ✅ FullName property provides convenience for display

### Edge Cases to Handle

1. **Missing Apellido:** If only Nombre provided → Set firstName, leave lastName null
2. **Abbreviated Names:** "J." in Nombre → Fuzzy match may have lower confidence
3. **Multiple Word Names:** "Juan Carlos" in Nombre → Keep as-is in firstName
4. **Compound Last Names:** "García López" in Apellido → Keep as-is in lastName

### Updated Import Flow

```
Step 1: Parse Excel
  - Extract Nombre → firstName
  - Extract Apellido → lastName

Step 2: Fuzzy Match
  - Construct fullName = firstName + " " + lastName
  - Compare with donor.FullName (computed property)
  - Rank by similarity

Step 3: Create/Update
  - Save firstName and lastName separately
  - FullName is computed on-the-fly for display
```

This update has been applied to the main EXCEL_IMPORT_PLAN.md document.
