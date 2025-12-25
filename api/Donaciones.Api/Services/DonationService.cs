using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Donaciones.Api.Services;

public class DonationService : IDonationService
{
    private readonly AppDbContext _db;
    public DonationService(AppDbContext db) => _db = db;

    public async Task<(IReadOnlyList<DonationListItem> items, int total)> ListAsync(Guid? donorId, string? currency,
        string? minian, string? concept, string? destination, bool includeOccasionalDonors, DateOnly? from, DateOnly? to,
        int page, int pageSize, CancellationToken ct)
    {
        var qry = _db.Donations.AsNoTracking().AsQueryable();
        if (donorId.HasValue) qry = qry.Where(x => x.DonorId == donorId);
        if (!string.IsNullOrWhiteSpace(currency)) qry = qry.Where(x => x.Currency.ToLower() == currency.ToLower());
        if (!string.IsNullOrWhiteSpace(minian)) qry = qry.Where(x => x.Minian.ToLower() == minian.ToLower());
        if (!string.IsNullOrWhiteSpace(concept)) qry = qry.Where(x => x.Concept.ToLower() == concept.ToLower());
        if (!string.IsNullOrWhiteSpace(destination))
            qry = qry.Where(x => x.Destination.ToLower() == destination.ToLower());
        if (from.HasValue) qry = qry.Where(x => x.DonationDate >= from);
        if (to.HasValue) qry = qry.Where(x => x.DonationDate <= to);
        // Apply filter only when IncludeOccasionalDonors is false (exclude occasional donors)
        if (!includeOccasionalDonors)
        {
            qry = from d in qry
                  join o in _db.Donors.AsNoTracking() on d.DonorId equals o.Id
                  where o.IsOccasionalDonor == false
                  select d;
        }

        var total = await qry.CountAsync(ct);
        var items = await qry
            .OrderByDescending(x => x.DonationDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_db.Donors.AsNoTracking(), d => d.DonorId, o => o.Id, (d, o) => new DonationListItem
            {
                Id = d.Id,
                DonorId = d.DonorId,
                DonorName = (o.LastName == null || o.LastName.Trim() == "")
                    ? (o.FirstName ?? "")
                    : ((o.FirstName ?? "") + " " + o.LastName),
                DonorObservations = o.Observations,
                Currency = d.Currency,
                Amount = d.Amount,
                DonationDate = d.DonationDate,
                Perasha = d.Perasha,
                Minian = d.Minian,
                Concept = d.Concept,
                Destination = d.Destination,
                DestinationOther = d.DestinationOther,
                Comment = d.Comment,
                Matana = d.Matana
            })
            .ToListAsync(ct);
        return (items, total);
    }

    public Task<Donation?> GetAsync(Guid id, CancellationToken ct)
        => _db.Donations.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id, ct);

    public async Task<Donation?> CreateAsync(DonationCreate dto, Guid userId, CancellationToken ct)
    {
        if (dto.DonorId == Guid.Empty || string.IsNullOrWhiteSpace(dto.Currency) ||
            string.IsNullOrWhiteSpace(dto.Minian) || string.IsNullOrWhiteSpace(dto.Concept) ||
            string.IsNullOrWhiteSpace(dto.Destination) || string.IsNullOrWhiteSpace(dto.Perasha))
            return null;
        // For Matana, amount should be 0, otherwise enforce positive integer amounts
        if (dto.Matana)
        {
            dto.Amount = 0;
        }
        else
        {
            if (dto.Amount <= 0 || decimal.Truncate(dto.Amount) != dto.Amount)
                return null;
        }
        if (dto.Destination == "Other" && string.IsNullOrWhiteSpace(dto.DestinationOther))
            return null;
        var entity = new Donation
        {
            Id = Guid.NewGuid(),
            DonorId = dto.DonorId,
            Currency = dto.Currency!,
            Amount = dto.Amount,
            DonationDate = dto.DonationDate,
            Perasha = dto.Perasha,
            Minian = dto.Minian!,
            Concept = dto.Concept!,
            Destination = dto.Destination!,
            DestinationOther = dto.DestinationOther,
            Comment = dto.Comment,
            IsVirtual = dto.IsVirtual,
            Matana = dto.Matana,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = userId
        };
        _db.Donations.Add(entity);
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<Donation?> UpdateAsync(Guid id, DonationCreate dto, Guid userId, CancellationToken ct)
    {
        var entity = await _db.Donations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity == null) return null;
        // Require non-empty Perashá
        if (string.IsNullOrWhiteSpace(dto.Perasha)) return null;
        // For Matana, amount should be 0, otherwise enforce positive integer amounts
        if (dto.Matana)
        {
            dto.Amount = 0;
        }
        else
        {
            if (dto.Amount <= 0 || decimal.Truncate(dto.Amount) != dto.Amount) return null;
        }
        entity.DonorId = dto.DonorId;
        entity.Currency = dto.Currency!;
        entity.Amount = dto.Amount;
        entity.DonationDate = dto.DonationDate;
        entity.Perasha = dto.Perasha;
        entity.Minian = dto.Minian!;
        entity.Concept = dto.Concept!;
        entity.Destination = dto.Destination!;
        entity.DestinationOther = dto.DestinationOther;
        entity.Comment = dto.Comment;
        entity.IsVirtual = dto.IsVirtual;
        entity.Matana = dto.Matana;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var entity = await _db.Donations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity == null) return false;
        
        // Log deletion
        var deletionLog = new DeletionLog
        {
            Id = Guid.NewGuid(),
            EntityType = "Donation",
            EntityId = entity.Id,
            EntityDetails = $"Donor: {entity.DonorId}, Amount: {entity.Amount} {entity.Currency}, Date: {entity.DonationDate}",
            DeletedBy = userId,
            DeletedAt = DateTimeOffset.UtcNow
        };
        _db.DeletionLogs.Add(deletionLog);
        
        _db.Donations.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}