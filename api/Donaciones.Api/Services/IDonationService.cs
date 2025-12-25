using Microsoft.EntityFrameworkCore;

public interface IDonationService
{
    Task<(IReadOnlyList<DonationListItem> items, int total)> ListAsync(Guid? donorId, string? currency, string? minian, string? concept, string? destination, bool includeOccasionalDonors, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct);
    Task<Donation?> GetAsync(Guid id, CancellationToken ct);
    Task<Donation?> CreateAsync(DonationCreate dto, Guid userId, CancellationToken ct);
    Task<Donation?> UpdateAsync(Guid id, DonationCreate dto, Guid userId, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct);
}
