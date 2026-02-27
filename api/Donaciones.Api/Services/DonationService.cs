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
        if (!string.IsNullOrWhiteSpace(concept)) qry = qry.Where(x => x.Concept.ToLower() == concept.ToLower());
        if (!string.IsNullOrWhiteSpace(perasha))
            qry = qry.Where(x => x.Perasha != null && x.Perasha.ToLower().Contains(perasha.ToLower()));
        if (from.HasValue) qry = qry.Where(x => x.DonationDate >= from);
        if (to.HasValue) qry = qry.Where(x => x.DonationDate <= to);
        
        // Filter by destination name (need to join with Destinations table)
        if (!string.IsNullOrWhiteSpace(destination))
        {
            qry = from d in qry
                  join dest in db.Destinations.AsNoTracking() on d.Destination equals dest.Id.ToString().ToLower()
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
            .GroupJoin(db.Concepts.AsNoTracking(), x => x.Donation.Concept, c => c.Id.ToString().ToLower(), (x, concepts) => new { x.Donation, x.Donor, Concepts = concepts })
            .SelectMany(x => x.Concepts.DefaultIfEmpty(), (x, concept) => new { x.Donation, x.Donor, Concept = concept })
            .GroupJoin(db.Destinations.AsNoTracking(), x => x.Donation.Destination, d => d.Id.ToString().ToLower(), (x, dests) => new { x.Donation, x.Donor, x.Concept, Destinations = dests })
            .SelectMany(x => x.Destinations.DefaultIfEmpty(), (x, dest) => new DonationListItem
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
                Concept = x.Concept != null ? x.Concept.Name : x.Donation.Concept,
                Destination = dest != null ? dest.Name : x.Donation.Destination,
                DestinationOther = x.Donation.DestinationOther,
                Comment = x.Donation.Comment,
                Matana = x.Donation.Matana
            })
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task<Donation?> GetAsync(Guid id, CancellationToken ct)
    {
        var result = await (from d in db.Donations
                           join c in db.Concepts on d.Concept equals c.Id.ToString().ToLower() into concepts
                           from concept in concepts.DefaultIfEmpty()
                           join dest in db.Destinations on d.Destination equals dest.Id.ToString().ToLower() into dests
                           from destination in dests.DefaultIfEmpty()
                           where d.Id == id
                           select new Donation
                           {
                               Id = d.Id,
                               DonorId = d.DonorId,
                               Currency = d.Currency,
                               Amount = d.Amount,
                               DonationDate = d.DonationDate,
                               Perasha = d.Perasha,
                               Minian = d.Minian,
                               Concept = concept != null ? concept.Name : d.Concept,
                               Destination = destination != null ? destination.Name : d.Destination,
                               DestinationOther = d.DestinationOther,
                               Comment = d.Comment,
                               IsVirtual = d.IsVirtual,
                               Matana = d.Matana,
                               CreatedAt = d.CreatedAt,
                               CreatedBy = d.CreatedBy,
                               UpdatedAt = d.UpdatedAt,
                               UpdatedBy = d.UpdatedBy
                           })
                           .AsNoTracking()
                           .FirstOrDefaultAsync(ct);
        return result;
    }

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
        entity.Concept = dto.Concept!;
        entity.Destination = dto.Destination!;
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