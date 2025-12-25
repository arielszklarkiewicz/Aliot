
---

## Update: Added IsVirtual Column (2025-12-03)

### Changes
- Added **IsVirtual** boolean column to `donations` table
- Added **IsVirtual** boolean column to `payments` table
- Default value: `false`
- Created database migration: `AddIsVirtualColumn`

### Purpose
The `IsVirtual` field allows tracking donations and payments that are:
- Pledges or commitments (not yet fulfilled)
- Virtual/bookkeeping entries
- Differentiated from actual cash transactions

### Schema Changes

**Donations table:**
- Added: `is_virtual` (boolean, NOT NULL, DEFAULT false)

**Payments table:**
- Added: `is_virtual` (boolean, NOT NULL, DEFAULT false)

### Migration Details
- Migration file: `20251203044610_AddIsVirtualColumn.cs`
- Safe to apply: Uses `defaultValue: false` for existing rows
- Backward compatible: Existing data unaffected

### Files Modified
1. `api/Donaciones.Api/Models/Donation.cs` - Added IsVirtual property
2. `api/Donaciones.Api/Models/Payment.cs` - Added IsVirtual property
3. `api/Donaciones.Api/Data/AppDbContext.cs` - Configured column with default value
4. `api/Donaciones.Api/Migrations/` - New migration created

### Testing
✅ Migration created successfully
✅ Build succeeds with no errors
✅ Column has default value of false
✅ Backward compatible (existing data safe)

### Deployment
On next deployment, the migration will automatically:
1. Add `is_virtual` column to `donations` table
2. Add `is_virtual` column to `payments` table
3. Set default value to `false` for all existing records
4. Apply to new records automatically

---

## Update: Virtual Transaction Zero-Balance Feature (2025-12-03)

### Overview
Added ability to create virtual donations or payments to bring donor balance to zero from the Donor Summary page.

### Features

**Smart Zero-Balance Button:**
- Only visible when **no date filters** are active (full history view)
- Only shown when **Saldo ≠ 0**
- Button text adapts based on balance:
  - Positive saldo (donor owes): **"+ Pago virtual a 0"**
  - Negative saldo (we owe donor): **"+ Donación virtual a 0"**

**Automatic Transaction Creation:**
- **Positive saldo** → Creates virtual **payment** for the exact amount
- **Negative saldo** → Creates virtual **donation** for the absolute amount
- Transaction marked with `IsVirtual = true`
- Comment: "Donacion virtual para representar que esta en 0" (or "Pago virtual...")
- Date: Today's date
- Auto-refreshes summary after creation

### Technical Implementation

**Frontend (`DonorSummary.jsx`):**
- Added `hasDateFilters` state tracking
- New `createVirtualTransaction()` function
- Button appears in balance cards when conditions met
- Color-coded saldo display (green/red/black)
- Loading state during creation

**Backend DTOs Updated:**
- `DonationCreate` - Added `IsVirtual` property
- `PaymentCreate` - Added `IsVirtual` property

**Services Updated:**
- `DonationService.CreateAsync()` - Maps `IsVirtual` field
- `DonationService.UpdateAsync()` - Maps `IsVirtual` field
- `PaymentService.CreateAsync()` - Maps `IsVirtual` field
- `PaymentService.UpdateAsync()` - Maps `IsVirtual` field

### Use Case Example

**Scenario:**
- Donor has saldo of +52.000 Pesos (owes money)
- No date filters active (viewing full history)
- User clicks **"+ Pago virtual a 0"** button

**Result:**
- Virtual payment created:
  - Amount: 52.000 Pesos
  - IsVirtual: true
  - Comment: "Pago virtual para representar que esta en 0"
  - Date: Today
- Balance immediately updates to 0
- Transaction visible in payments list

### Files Modified

**Frontend:**
1. `frontend/src/pages/DonorSummary.jsx`
   - Added virtual transaction creation logic
   - Added conditional button rendering
   - Added color-coded saldo display

**Backend:**
2. `api/Donaciones.Api/Models/DonationCreate.cs` - Added IsVirtual
3. `api/Donaciones.Api/Models/PaymentCreate.cs` - Added IsVirtual
4. `api/Donaciones.Api/Services/DonationService.cs` - Map IsVirtual in create/update
5. `api/Donaciones.Api/Services/PaymentService.cs` - Map IsVirtual in create/update

### Testing
✅ Frontend builds successfully
✅ Backend builds successfully
✅ Button only appears without date filters
✅ Button only appears when saldo ≠ 0
✅ Creates payment for positive saldo
✅ Creates donation for negative saldo
✅ Marks transactions as virtual
✅ Auto-refreshes after creation

### UI Behavior

**Button States:**
- Normal: Gray background, clickable
- Loading: "Creando..." text, disabled
- Error: Error message displayed above balances

**Visual Indicators:**
- Positive saldo: Green text
- Negative saldo: Red text
- Zero saldo: Black text (no button)
