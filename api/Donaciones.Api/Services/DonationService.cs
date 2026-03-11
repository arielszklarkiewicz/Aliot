using Donaciones.Api.Data;
using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Donaciones.Api.Services;

public class DonationService(AppDbContext db) : IDonationService
{
    public async Task<(IReadOnlyList<DonationListItem> items, int total)> ListAsync(Guid? donorId, string? donorName, string? currency,
        string? minian, string? concept, string? destination, string? perasha, bool includeOccasionalDonors, DateOnly? from, DateOnly? to,
        int page, int pageSize, CancellationToken ct)
    {
        var qry = db.Donations.AsNoTracking().AsQueryable();
        if (donorId.HasValue) qry = qry.Where(x => x.DonorId == donorId);
        
        // Filter by donor name
        if (!string.IsNullOrWhiteSpace(donorName))
        {
            var donorNameLower = donorName.ToLower();
            qry = from d in qry
                  join o in db.Donors.AsNoTracking() on d.DonorId equals o.Id
                  where (o.FirstName != null && o.FirstName.ToLower().Contains(donorNameLower)) ||
                        (o.LastName != null && o.LastName.ToLower().Contains(donorNameLower))
                  select d;
        }
        
        if (!string.IsNullOrWhiteSpace(currency)) qry = qry.Where(x => x.Currency.ToLower() == currency.ToLower());
        if (!string.IsNullOrWhiteSpace(minian)) qry = qry.Where(x => x.Minian.ToLower() == minian.ToLower());
        
        // Filter by concept name (need to join with Concepts table)
        if (!string.IsNullOrWhiteSpace(concept))
        {
            qry = from d in qry
                  join c in db.Concepts.AsNoTracking() on d.ConceptId equals c.Id
                  where c.Name.ToLower() == concept.ToLower()
                  select d;
        }
        
        if (!string.IsNullOrWhiteSpace(perasha))
            qry = qry.Where(x => x.Perasha != null && x.Perasha.ToLower().Contains(perasha.ToLower()));
        if (from.HasValue) qry = qry.Where(x => x.DonationDate >= from);
        if (to.HasValue) qry = qry.Where(x => x.DonationDate <= to);
        
        // Filter by destination name (need to join with Destinations table)
        if (!string.IsNullOrWhiteSpace(destination))
        {
            qry = from d in qry
                  join dest in db.Destinations.AsNoTracking() on d.DestinationId equals dest.Id
                  where dest.Name.ToLower() == destination.ToLower()
                  select d;
        }
        
        // Apply filter only when IncludeOccasionalDonors is false (exclude occasional donors)
        if (!includeOccasionalDonors)
        {
            qry = from d in qry
                  join o in db.Donors.AsNoTracking() on d.DonorId equals o.Id
                  where o.IsOccasionalDonor == false
                  select d;
        }

        var total = await qry.CountAsync(ct);
        var items = await qry
            .OrderByDescending(x => x.DonationDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(db.Donors.AsNoTracking(), d => d.DonorId, o => o.Id, (d, o) => new { Donation = d, Donor = o })
            .Join(db.Concepts.AsNoTracking(), x => x.Donation.ConceptId, c => c.Id, (x, concept) => new { x.Donation, x.Donor, Concept = concept })
            .Join(db.Destinations.AsNoTracking(), x => x.Donation.DestinationId, d => d.Id, (x, dest) => new DonationListItem
            {
                Id = x.Donation.Id,
                DonorId = x.Donation.DonorId,
                DonorName = (x.Donor.LastName == null || x.Donor.LastName.Trim() == "")
                    ? (x.Donor.FirstName ?? "")
                    : ((x.Donor.FirstName ?? "") + " " + x.Donor.LastName),
                DonorObservations = x.Donor.Observations,
                Currency = x.Donation.Currency,
                Amount = x.Donation.Amount,
                DonationDate = x.Donation.DonationDate,
                Perasha = x.Donation.Perasha,
                Minian = x.Donation.Minian,
                Concept = x.Concept.Name,
                Destination = dest.Name,
                DestinationOther = x.Donation.DestinationOther,
                Comment = x.Donation.Comment,
                Matana = x.Donation.Matana,
                IsVirtual = x.Donation.IsVirtual
            })
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task<Donation?> GetAsync(Guid id, CancellationToken ct)
    {
        return await db.Donations.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id, ct);
    }

    public async Task<Donation?> CreateAsync(DonationCreate dto, Guid userId, CancellationToken ct)
    {
        if (dto.DonorId == Guid.Empty || string.IsNullOrWhiteSpace(dto.Currency) ||
            string.IsNullOrWhiteSpace(dto.Minian) || !dto.ConceptId.HasValue ||
            !dto.DestinationId.HasValue || string.IsNullOrWhiteSpace(dto.Perasha))
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
        var entity = new Donation
        {
            Id = Guid.NewGuid(),
            DonorId = dto.DonorId,
            Currency = dto.Currency!,
            Amount = dto.Amount,
            DonationDate = dto.DonationDate,
            Perasha = dto.Perasha,
            Minian = dto.Minian!,
            ConceptId = dto.ConceptId.Value,
            DestinationId = dto.DestinationId.Value,
            DestinationOther = dto.DestinationOther,
            Comment = dto.Comment,
            IsVirtual = dto.IsVirtual,
            Matana = dto.Matana,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = userId
        };
        db.Donations.Add(entity);
        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<Donation?> UpdateAsync(Guid id, DonationCreate dto, Guid userId, CancellationToken ct)
    {
        var entity = await db.Donations.FirstOrDefaultAsync(x => x.Id == id, ct);
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
        entity.ConceptId = dto.ConceptId ?? entity.ConceptId;
        entity.DestinationId = dto.DestinationId ?? entity.DestinationId;
        entity.DestinationOther = dto.DestinationOther;
        entity.Comment = dto.Comment;
        entity.IsVirtual = dto.IsVirtual;
        entity.Matana = dto.Matana;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        entity.UpdatedBy = userId;
        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var entity = await db.Donations.FirstOrDefaultAsync(x => x.Id == id, ct);
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
            EntityType = "Donation",
            EntityId = entity.Id,
            EntityDetails = $"Donor: {donorName}, Amount: {entity.Amount} {entity.Currency}, Date: {entity.DonationDate}",
            DeletedBy = userId,
            DeletedAt = DateTimeOffset.UtcNow
        };
        db.DeletionLogs.Add(deletionLog);
        
        db.Donations.Remove(entity);
        await db.SaveChangesAsync(ct);
        return true;
    }
}