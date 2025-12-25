using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _db;
    public PaymentService(AppDbContext db) => _db = db;

    public async Task<(IReadOnlyList<PaymentListItem> items, int total)> ListAsync(Guid? donorId, string? currency, string? collector, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct)
    {
        var qry = _db.Payments.AsNoTracking().AsQueryable();
        if (donorId.HasValue) qry = qry.Where(x => x.DonorId == donorId);
        if (!string.IsNullOrWhiteSpace(currency)) qry = qry.Where(x => x.Currency.ToLower() == currency.ToLower());
        if (!string.IsNullOrWhiteSpace(collector)) qry = qry.Where(x => (x.Collector ?? "").ToLower().Contains(collector.ToLower()));
        if (from.HasValue) qry = qry.Where(x => x.PaymentDate >= from);
        if (to.HasValue) qry = qry.Where(x => x.PaymentDate <= to);

        var total = await qry.CountAsync(ct);
        var items = await qry
            .OrderByDescending(x => x.PaymentDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_db.Donors.AsNoTracking(), p => p.DonorId, o => o.Id, (p, o) => new PaymentListItem
            {
                Id = p.Id,
                DonorId = p.DonorId,
                DonorName = (o.LastName == null || o.LastName.Trim() == "") 
                                ? (o.FirstName ?? "")
                                : (((o.FirstName ?? "") + " " + o.LastName)),
                Currency = p.Currency,
                Amount = p.Amount,
                PaymentDate = p.PaymentDate,
                Destination = p.Destination,
                Collector = p.Collector,
                Comment = p.Comment
            })
            .ToListAsync(ct);
        return (items, total);
    }

    public Task<Payment?> GetAsync(Guid id, CancellationToken ct)
        => _db.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<Payment?> CreateAsync(PaymentCreate dto, Guid userId, CancellationToken ct)
    {
        if (dto.DonorId == Guid.Empty || string.IsNullOrWhiteSpace(dto.Currency) || string.IsNullOrWhiteSpace(dto.Destination) || dto.Amount is null)
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
            Destination = dto.Destination!,
            Collector = dto.Collector,
            Comment = dto.Comment,
            IsVirtual = dto.IsVirtual,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = userId
        };
        _db.Payments.Add(entity);
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<Payment?> UpdateAsync(Guid id, PaymentCreate dto, Guid userId, CancellationToken ct)
    {
        var entity = await _db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity == null) return null;
        if (dto.Amount is null) return null;
        // Enforce integer-only amounts
        if (decimal.Truncate(dto.Amount.Value) != dto.Amount.Value || dto.Amount.Value <= 0) return null;
        entity.DonorId = dto.DonorId;
        entity.Currency = dto.Currency!;
        entity.Amount = dto.Amount ?? entity.Amount;
        entity.PaymentDate = dto.PaymentDate;
        entity.Destination = dto.Destination!;
        entity.Collector = dto.Collector;
        entity.Comment = dto.Comment;
        entity.IsVirtual = dto.IsVirtual;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var entity = await _db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity == null) return false;
        
        // Get donor name for logging
        var donor = await _db.Donors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == entity.DonorId, ct);
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
        _db.DeletionLogs.Add(deletionLog);
        
        _db.Payments.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
