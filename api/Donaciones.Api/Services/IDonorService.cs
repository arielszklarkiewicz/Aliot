using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;

public interface IDonorService
{
    Task<(IReadOnlyList<Donor> items, int total)> ListAsync(string? q, bool? isOccasionalDonor, int page, int pageSize, CancellationToken ct);
    Task<Donor?> GetAsync(Guid id, CancellationToken ct);
    Task<Donor> CreateAsync(Donor donor, Guid userId, CancellationToken ct);
    Task<Donor?> UpdateAsync(Guid id, Donor donor, Guid userId, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct);
    Task<DonorBalance> GetBalanceAsync(Guid donorId, string? currency, CancellationToken ct);
    Task<IReadOnlyList<DonorCurrencyBalance>> GetBalancesByCurrencyAsync(Guid donorId, CancellationToken ct);
    Task<DonorSummary?> GetSummaryAsync(Guid donorId, CancellationToken ct);
}
