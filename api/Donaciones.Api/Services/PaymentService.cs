using Donaciones.Api.Data;
using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Donaciones.Api.Services;

public class PaymentService(AppDbContext db) : IPaymentService
{
    public async Task<(IReadOnlyList<PaymentListItem> items, int total)> ListAsync(Guid? donorId, string? currency, string? collector, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct)
    {
        var qry = db.Payments.AsNoTracking().AsQueryable();
        if (donorId.HasValue) qry = qry.Where(x => x.DonorId == donorId);
        if (!string.IsNullOrWhiteSpace(currency)) qry = qry.Where(x => x.Currency.ToLower() == currency.ToLower());
        if (!string.IsNullOrWhiteSpace(collector))
        {
            var collectorLower = collector.ToLower();
            var collectorIds = db.Collectors.AsNoTracking()
                .Where(c => c.Name.ToLower().Contains(collectorLower))
                .Select(c => c.Id)
                .ToList();
            qry = qry.Where(x => x.CollectorId.HasValue && collectorIds.Contains(x.CollectorId.Value));
        }
        if (from.HasValue) qry = qry.Where(x => x.PaymentDate >= from);
        if (to.HasValue) qry = qry.Where(x => x.PaymentDate <= to);

        var total = await qry.CountAsync(ct);
        var items = await qry
            .OrderByDescending(x => x.PaymentDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(db.Donors.AsNoTracking(), p => p.DonorId, o => o.Id, (p, o) => new { Payment = p, Donor = o })
            .Join(db.Destinations.AsNoTracking(), x => x.Payment.DestinationId, d => d.Id, (x, dest) => new { x.Payment, x.Donor, Destination = dest })
            .GroupJoin(db.Collectors.AsNoTracking(), x => x.Payment.CollectorId, c => c.Id, (x, colls) => new { x.Payment, x.Donor, x.Destination, Collectors = colls })
            .SelectMany(x => x.Collectors.DefaultIfEmpty(), (x, coll) => new PaymentListItem
            {
                Id = x.Payment.Id,
                DonorId = x.Payment.DonorId,
                DonorName = (x.Donor.LastName == null || x.Donor.LastName.Trim() == "") 
                    ? (x.Donor.FirstName ?? "")
                    : (((x.Donor.FirstName ?? "") + " " + x.Donor.LastName)),
                DonorObservations = x.Donor.Observations,
                Currency = x.Payment.Currency,
                Amount = x.Payment.Amount,
                PaymentDate = x.Payment.PaymentDate,
                Destination = x.Destination.Name,
                Collector = coll != null ? coll.Name : null,
                Comment = x.Payment.Comment,
                IsVirtual = x.Payment.IsVirtual
            })
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task<Payment?> GetAsync(Guid id, CancellationToken ct)
    {
        return await db.Payments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
    }

    public async Task<Payment?> CreateAsync(PaymentCreate dto, Guid userId, CancellationToken ct)
    {
        if (dto.DonorId == Guid.Empty || string.IsNullOrWhiteSpace(dto.Currency) || !dto.DestinationId.HasValue || dto.Amount is null)
            return null;
        // Enforce integer-only amounts
        if (dto.Amount is null || decimal.Truncate(dto.Amount.Value) != dto.Amount.Value || dto.Amount.Value <= 0)
            return null;
        var entity = new Payment
        {
            Id = Guid.NewGuid(),
            DonorId = dto.DonorId,
            Currency = dto.Currency!,
            Amount = dto.Amount ?? 0,
            PaymentDate = dto.PaymentDate,
            DestinationId = dto.DestinationId.Value,
            CollectorId = dto.CollectorId,
            Comment = dto.Comment,
            IsVirtual = dto.IsVirtual,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = userId
        };
        db.Payments.Add(entity);
        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<Payment?> UpdateAsync(Guid id, PaymentCreate dto, Guid userId, CancellationToken ct)
    {
        var entity = await db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity == null) return null;
        if (dto.Amount is null) return null;
        // Enforce integer-only amounts
        if (decimal.Truncate(dto.Amount.Value) != dto.Amount.Value || dto.Amount.Value <= 0) return null;
        entity.DonorId = dto.DonorId;
        entity.Currency = dto.Currency!;
        entity.Amount = dto.Amount ?? entity.Amount;
        entity.PaymentDate = dto.PaymentDate;
        entity.DestinationId = dto.DestinationId ?? entity.DestinationId;
        entity.CollectorId = dto.CollectorId;
        entity.Comment = dto.Comment;
        entity.IsVirtual = dto.IsVirtual;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        entity.UpdatedBy = userId;
        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var entity = await db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity == null) return false;
        
        // Get donor name for logging
        var donor = await db.Donors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == entity.DonorId, ct);
        var donorName = donor != null 
            ? (string.IsNullOrWhiteSpace(donor.LastName) ? donor.FirstName : $"{donor.FirstName} {donor.LastName}")
            : entity.DonorId.ToString();
        
        // Log deletion
        var deletionLog = new DeletionLog
        {
            Id = Guid.NewGuid(),
            EntityType = "Payment",
            EntityId = entity.Id,
            EntityDetails = $"Donor: {donorName}, Amount: {entity.Amount} {entity.Currency}, Date: {entity.PaymentDate}",
            DeletedBy = userId,
            DeletedAt = DateTimeOffset.UtcNow
        };
        db.DeletionLogs.Add(deletionLog);
        
        db.Payments.Remove(entity);
        await db.SaveChangesAsync(ct);
        return true;
    }
}