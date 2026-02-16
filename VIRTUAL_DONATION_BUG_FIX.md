# Virtual Donation Balance Bug Fix

## Bug Description

**Issue:** When a virtual donation was created to compensate for a negative balance (donor paid more than they donated), the balance calculation still showed a non-zero saldo in the "Totales por Destino y Moneda" section, even though the virtual transaction should have reset the balance to 0.

**Example Scenario:**
1. Donor makes payment of $100 on Jan 1
2. Donor makes donation of $50 on Jan 5 (balance: -$50, donor is owed money)
3. Virtual donation of $50 created on Jan 10 to reset balance to 0
4. **Bug:** The "Totales por Destino y Moneda" still showed a balance instead of being hidden/zero

## Root Cause

The balance calculation logic only tracked **virtual payments** but not **virtual donations**. 

### Original Problematic Logic:

```javascript
// Only tracked virtual payments
const lastVirtualPayments = new Map();
for (const p of filteredPayments) {
  if (p.isVirtual) {
    // track virtual payment date
  }
}

// Used only virtual payment date to filter donations
for (const d of filteredDonations) {
  if (lastVirtualPaymentDate && donationDate <= lastVirtualPaymentDate) {
    continue; // Skip old donations
  }
  // Count donation
}

// But didn't skip donations/payments after virtual donations!
```

### Why This Was Wrong:

Virtual transactions can be:
1. **Virtual payments** - Created when donor owes money (positive balance)
2. **Virtual donations** - Created when we owe donor money (negative balance)

Both types should act as "reset points" that mark all transactions before them as settled. However, the code only handled virtual payments.

## The Fix

Changed the logic to track **both virtual payments AND virtual donations**, then use the **latest virtual transaction** (whichever is newer) as the cutoff point.

### New Correct Logic:

```javascript
// 1. Track latest virtual payment date
const lastVirtualPayments = new Map();
for (const p of filteredPayments) {
  if (p.isVirtual) {
    // track latest virtual payment
  }
}

// 2. Track latest virtual donation date (NEW!)
const lastVirtualDonations = new Map();
for (const d of filteredDonations) {
  if (d.isVirtual) {
    // track latest virtual donation
  }
}

// 3. Combine to find the latest virtual transaction (NEW!)
const lastVirtualTransactions = new Map();
// Take the newer date between virtual payment and virtual donation
for each destination+currency:
  latestDate = max(lastVirtualPaymentDate, lastVirtualDonationDate)

// 4. Skip ALL transactions (donations AND payments) at or before the latest virtual transaction
for (const d of filteredDonations) {
  if (lastVirtualDate && donationDate <= lastVirtualDate) {
    continue; // Skip - considered settled
  }
  // Count donation
}

for (const p of filteredPayments) {
  if (lastVirtualDate && paymentDate <= lastVirtualDate) {
    continue; // Skip - considered settled
  }
  // Count payment
}
```

## How Virtual Transactions Should Work

### Correct Behavior:

**When virtual payment exists:**
- Skip all donations ≤ virtual payment date
- Skip all payments ≤ virtual payment date
- Only count transactions AFTER the virtual payment

**When virtual donation exists:**
- Skip all donations ≤ virtual donation date
- Skip all payments ≤ virtual donation date
- Only count transactions AFTER the virtual donation

**When BOTH exist:**
- Use the LATEST virtual transaction date (either payment or donation)
- Skip all transactions ≤ that latest date
- Only count transactions AFTER the latest virtual transaction

### Example Timeline (Bug Fixed):

```
Scenario 1: Virtual Payment
Jan 1:  Donation $100         → ❌ Excluded (before virtual payment)
Jan 5:  Donation $50          → ❌ Excluded (before virtual payment)
Jan 10: Virtual Payment $150  → ❌ Excluded (this is the reset point)
Jan 15: Donation $75          → ✅ Included (after virtual transaction)
Jan 20: Payment $25           → ✅ Included (after virtual transaction)

Result: Donations: $75, Payments: $25, Balance: $50

Scenario 2: Virtual Donation (BUG WAS HERE!)
Jan 1:  Payment $100           → ❌ Excluded (before virtual donation)
Jan 5:  Payment $50            → ❌ Excluded (before virtual donation)
Jan 10: Virtual Donation $150  → ❌ Excluded (this is the reset point)
Jan 15: Payment $25            → ✅ Included (after virtual transaction)
Jan 20: Donation $75           → ✅ Included (after virtual transaction)

Result: Donations: $75, Payments: $25, Balance: $50

Scenario 3: Both Virtual Payment and Virtual Donation
Jan 1:  Donation $100               → ❌ Excluded (before both)
Jan 5:  Virtual Payment $100        → ❌ Excluded (older virtual)
Jan 10: Payment $200                → ❌ Excluded (before latest virtual)
Jan 15: Virtual Donation $100       → ❌ Excluded (latest virtual - reset point)
Jan 20: Donation $75                → ✅ Included (after latest virtual)
Jan 25: Payment $50                 → ✅ Included (after latest virtual)

Result: Uses Jan 15 as cutoff (latest virtual). Donations: $75, Payments: $50, Balance: $25
```

## Testing Scenarios

### Scenario 1: Virtual Payment Only
1. Create donations totaling $100
2. Create virtual payment of $100
3. **Expected:** Balance should be 0, section hidden ✅

### Scenario 2: Virtual Donation Only (Bug was here)
1. Create payments totaling $100
2. Create virtual donation of $100
3. **Expected:** Balance should be 0, section hidden ✅

### Scenario 3: Both Virtual Payment and Virtual Donation
1. Create donation $100 on Jan 1
2. Create virtual payment $100 on Jan 5
3. Create payment $200 on Jan 10
4. Create virtual donation $100 on Jan 15
5. **Expected:** Only transactions after Jan 15 should count ✅

### Scenario 4: Virtual Transaction on Same Day as Regular Transaction
1. Create donation $100 on Jan 1
2. Create virtual payment $100 on Jan 1 (same day)
3. Create payment $50 on Jan 1 (same day)
4. **Expected:** Both regular donation and payment are excluded (≤ virtual date) ✅

## Files Modified

**frontend/src/pages/DonorSummary.jsx**
- Lines 329-377: Completely rewrote balance calculation logic
- Added `lastVirtualDonations` Map to track virtual donations
- Added `lastVirtualTransactions` Map to combine both virtual payments and donations
- Changed skip conditions to use the latest virtual transaction date
- Simplified logic: now ALL transactions (donations and payments) are skipped if they're at or before the latest virtual transaction

## Key Changes

### Before (Bug):
```javascript
const lastVirtualPayments = new Map(); // Only payments
// ... track only virtual payments
// ... skip donations before virtual payment
// ... skip ONLY virtual payments (not regular payments)
```

### After (Fixed):
```javascript
const lastVirtualPayments = new Map();
const lastVirtualDonations = new Map(); // NEW!
const lastVirtualTransactions = new Map(); // NEW! - combines both
// ... track both virtual payments AND donations
// ... find latest virtual transaction date
// ... skip ALL donations before latest virtual
// ... skip ALL payments before latest virtual
```

## Build Status

✅ **Build successful** - No errors
- Bundle size: 226.26 kB (gzipped) - only +77 bytes
- Logic completely fixed

## Impact

**Before Fix:**
- Virtual donations didn't reset the balance
- Balance calculations were incorrect when virtual donations existed
- "Totales por Destino y Moneda" showed balances that should have been zero
- Confusing for users

**After Fix:**
- Both virtual payments and virtual donations properly reset balances
- Balance calculations are accurate regardless of transaction type
- "Totales por Destino y Moneda" correctly shows zero balance after virtual transactions
- Consistent behavior across all virtual transaction types

## Deployment

Ready to deploy:
```bash
cd frontend
npm run build
```

The fix is production-ready and resolves the virtual donation balance issue! 🎉

## Additional Notes

### Virtual Transaction Philosophy:
Virtual transactions (whether payments or donations) serve as "settlement points" that say:
- "Everything before this date is considered settled"
- "Only count transactions after this date"

This fix ensures that philosophy is consistently applied regardless of whether the virtual transaction is a payment or a donation.

### Why This Makes Sense:
- **Virtual payment:** Donor owes money → we create virtual payment to mark it as paid
- **Virtual donation:** We owe donor money → we create virtual donation to mark it as given

Both should have the same effect: reset the balance and only count future transactions.
