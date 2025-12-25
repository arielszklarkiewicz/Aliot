using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;

public class DonorService : IDonorService
{
    private readonly AppDbContext _db;
    public DonorService(AppDbContext db) => _db = db;

    public async Task<(IReadOnlyList<Donor> items, int total)> ListAsync(string? q, bool? isOccasionalDonor, int page, int pageSize, CancellationToken ct)
    {
        var qry = _db.Donors.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var ql = q.ToLower();
            qry = qry.Where(d =>
                ((d.FirstName + " " + (d.LastName ?? "")).ToLower().Contains(ql))
                || (d.Observations != null && d.Observations.ToLower().Contains(ql))
            );
        }
        if (isOccasionalDonor.HasValue)
        {
            qry = qry.Where(d => d.IsOccasionalDonor == isOccasionalDonor.Value);
        }
        var total = await qry.CountAsync(ct);
        var items = await qry
            .OrderBy(d => d.FirstName)
            .ThenBy(d => d.LastName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public Task<Donor?> GetAsync(Guid id, CancellationToken ct) => _db.Donors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id, ct);

    public async Task<Donor> CreateAsync(Donor donor, Guid userId, CancellationToken ct)
    {
        donor.Id = Guid.NewGuid();
        donor.CreatedAt = DateTimeOffset.UtcNow;
        donor.CreatedBy = userId;
        _db.Donors.Add(donor);
        await _db.SaveChangesAsync(ct);
        return donor;
    }

    public async Task<Donor?> UpdateAsync(Guid id, Donor donor, Guid userId, CancellationToken ct)
    {
        var existing = await _db.Donors.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (existing == null) return null;
        existing.FirstName = donor.FirstName;
        existing.LastName = donor.LastName;
        existing.Email = donor.Email;
        existing.Phone = donor.Phone;
        existing.Address = donor.Address;
        existing.Observations = donor.Observations;
        existing.IsOccasionalDonor = donor.IsOccasionalDonor;
        existing.UpdatedAt = DateTimeOffset.UtcNow;
        existing.UpdatedBy = userId;
        await _db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var donor = await _db.Donors.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (donor == null) return false;
        
        // Log deletion
        var deletionLog = new DeletionLog
        {
            Id = Guid.NewGuid(),
            EntityType = "Donor",
            EntityId = donor.Id,
            EntityDetails = $"{donor.FirstName} {donor.LastName}",
            DeletedBy = userId,
            DeletedAt = DateTimeOffset.UtcNow
        };
        _db.DeletionLogs.Add(deletionLog);
        
        _db.Donors.Remove(donor);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<DonorBalance> GetBalanceAsync(Guid donorId, string? currency, CancellationToken ct)
    {
        // ensure donor exists (optional)
        var donorExists = await _db.Donors.AsNoTracking().AnyAsync(d => d.Id == donorId, ct);
        if (!donorExists) return new DonorBalance { DonorId = donorId, Currency = currency, DonationsTotal = 0, PaymentsTotal = 0 };

        var donationsQry = _db.Donations.AsNoTracking().Where(d => d.DonorId == donorId);
        var paymentsQry = _db.Payments.AsNoTracking().Where(p => p.DonorId == donorId);
        if (!string.IsNullOrWhiteSpace(currency))
        {
            var cl = currency.ToLower();
            donationsQry = donationsQry.Where(d => d.Currency.ToLower() == cl);
            paymentsQry = paymentsQry.Where(p => p.Currency.ToLower() == cl);
        }

        var allDonations = await donationsQry.ToListAsync(ct);
        var allPayments = await paymentsQry.ToListAsync(ct);

        // Find last virtual payment date for each currency/destination combination
        var lastVirtualPayments = allPayments
            .Where(p => p.IsVirtual)
            .GroupBy(p => new { Currency = p.Currency.ToLower(), p.Destination })
            .Select(g => new { g.Key.Currency, g.Key.Destination, LastDate = g.Max(p => p.PaymentDate) })
            .ToDictionary(x => (x.Currency, x.Destination), x => x.LastDate);

        // Calculate donations considering virtual payment cutoff
        var donationsTotal = allDonations
            .Where(d => {
                var key = (d.Currency.ToLower(), d.Destination);
                var cutoffDate = lastVirtualPayments.ContainsKey(key) ? lastVirtualPayments[key] : (DateOnly?)null;
                return !cutoffDate.HasValue || d.DonationDate > cutoffDate.Value;
            })
            .Sum(d => d.Matana ? 0 : d.Amount);

        // Calculate payments considering virtual payment cutoff
        var paymentsTotal = allPayments
            .Where(p => {
                var key = (p.Currency.ToLower(), p.Destination);
                var cutoffDate = lastVirtualPayments.ContainsKey(key) ? lastVirtualPayments[key] : (DateOnly?)null;
                return !cutoffDate.HasValue || p.PaymentDate > cutoffDate.Value;
            })
            .Sum(p => p.Amount);

        return new DonorBalance
        {
            DonorId = donorId,
            Currency = currency,
            DonationsTotal = donationsTotal,
            PaymentsTotal = paymentsTotal
        };
    }

    public async Task<IReadOnlyList<DonorCurrencyBalance>> GetBalancesByCurrencyAsync(Guid donorId, CancellationToken ct)
    {
        var donorExists = await _db.Donors.AsNoTracking().AnyAsync(d => d.Id == donorId, ct);
        if (!donorExists) return Array.Empty<DonorCurrencyBalance>();

        var allDonations = await _db.Donations.AsNoTracking()
            .Where(d => d.DonorId == donorId)
            .ToListAsync(ct);

        var allPayments = await _db.Payments.AsNoTracking()
            .Where(p => p.DonorId == donorId)
            .ToListAsync(ct);

        // Find last virtual payment date for each currency/destination combination
        var lastVirtualPayments = allPayments
            .Where(p => p.IsVirtual)
            .GroupBy(p => new { Currency = p.Currency.ToLower(), p.Destination })
            .Select(g => new { g.Key.Currency, g.Key.Destination, LastDate = g.Max(p => p.PaymentDate) })
            .ToDictionary(x => (x.Currency, x.Destination), x => x.LastDate);

        // Calculate donations considering virtual payment cutoff
        var donations = allDonations
            .GroupBy(d => d.Currency.ToLower())
            .Select(g => {
                var total = 0m;
                foreach (var d in g)
                {
                    var key = (g.Key, d.Destination);
                    var cutoffDate = lastVirtualPayments.ContainsKey(key) ? lastVirtualPayments[key] : (DateOnly?)null;
                    if (!cutoffDate.HasValue || d.DonationDate > cutoffDate.Value)
                    {
                        total += d.Matana ? 0 : d.Amount;
                    }
                }
                return new { Currency = g.Key, Total = total };
            })
            .ToList();

        // Calculate payments considering virtual payment cutoff
        var payments = allPayments
            .GroupBy(p => p.Currency.ToLower())
            .Select(g => {
                var total = 0m;
                foreach (var p in g)
                {
                    var key = (g.Key, p.Destination);
                    var cutoffDate = lastVirtualPayments.ContainsKey(key) ? lastVirtualPayments[key] : (DateOnly?)null;
                    if (!cutoffDate.HasValue || p.PaymentDate > cutoffDate.Value)
                    {
                        total += p.Amount;
                    }
                }
                return new { Currency = g.Key, Total = total };
            })
            .ToList();

        var currencies = donations.Select(d => d.Currency).Union(payments.Select(p => p.Currency)).Distinct();
        var list = currencies
            .Select(c => new DonorCurrencyBalance
            {
                Currency = c,
                DonationsTotal = donations.FirstOrDefault(d => d.Currency == c)?.Total ?? 0m,
                PaymentsTotal = payments.FirstOrDefault(p => p.Currency == c)?.Total ?? 0m
            })
            .OrderBy(x => x.Currency)
            .ToList();

        return list;
    }

    public async Task<DonorSummary?> GetSummaryAsync(Guid donorId, CancellationToken ct)
    {
        var donor = await _db.Donors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == donorId, ct);
        if (donor == null) return null;

        var donations = await _db.Donations.AsNoTracking()
            .Where(d => d.DonorId == donorId)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync(ct);

        var payments = await _db.Payments.AsNoTracking()
            .Where(p => p.DonorId == donorId)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync(ct);

        var balances = await GetBalancesByCurrencyAsync(donorId, ct);

        return new DonorSummary
        {
            Donor = donor,
            Donations = donations,
            Payments = payments,
            Balances = balances
        };
    }
}
