using Donaciones.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace Donaciones.Api.Services;

public class CachedDonorService(DonorService innerService, IMemoryCache cache) : IDonorService
{
    private const string AllDonorsCacheKey = "all_donors_list";
    private const int CacheDurationMinutes = 30;

    private void InvalidateCache()
    {
        cache.Remove(AllDonorsCacheKey);
        // Remove individual donor caches by pattern (simple approach: clear all)
        // In production, consider more sophisticated cache invalidation
    }

    public async Task<(IReadOnlyList<Donor> items, int total)> ListAsync(
        string? q, bool? isOccasionalDonor, int page, int pageSize, CancellationToken ct)
    {
        // For filtered/paginated queries, use cache for the full list then filter in memory
        var cacheKey = $"{AllDonorsCacheKey}_{q}_{isOccasionalDonor}_{page}_{pageSize}";
        
        if (cache.TryGetValue(cacheKey, out (IReadOnlyList<Donor> items, int total) cached))
        {
            return cached;
        }

        var result = await innerService.ListAsync(q, isOccasionalDonor, page, pageSize, ct);
        
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(CacheDurationMinutes))
            .SetSlidingExpiration(TimeSpan.FromMinutes(10));
        
        cache.Set(cacheKey, result, cacheOptions);
        
        return result;
    }

    public async Task<Donor?> GetAsync(Guid id, CancellationToken ct)
    {
        var cacheKey = $"donor_{id}";
        
        if (cache.TryGetValue(cacheKey, out Donor? cached))
        {
            return cached;
        }

        var donor = await innerService.GetAsync(id, ct);
        
        if (donor != null)
        {
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(CacheDurationMinutes))
                .SetSlidingExpiration(TimeSpan.FromMinutes(10));
            
            cache.Set(cacheKey, donor, cacheOptions);
        }
        
        return donor;
    }

    public async Task<Donor> CreateAsync(Donor donor, Guid userId, CancellationToken ct)
    {
        var result = await innerService.CreateAsync(donor, userId, ct);
        InvalidateCache();
        return result;
    }

    public async Task<Donor?> UpdateAsync(Guid id, Donor donor, Guid userId, CancellationToken ct)
    {
        var result = await innerService.UpdateAsync(id, donor, userId, ct);
        if (result != null)
        {
            InvalidateCache();
            cache.Remove($"donor_{id}");
        }
        return result;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var result = await innerService.DeleteAsync(id, userId, ct);
        if (result)
        {
            InvalidateCache();
            cache.Remove($"donor_{id}");
        }
        return result;
    }

    // Balance methods don't need caching as they're computed from donations/payments
    public Task<DonorBalance> GetBalanceAsync(Guid donorId, string? currency, CancellationToken ct)
        => innerService.GetBalanceAsync(donorId, currency, ct);

    public Task<IReadOnlyList<DonorCurrencyBalance>> GetBalancesByCurrencyAsync(Guid donorId, CancellationToken ct)
        => innerService.GetBalancesByCurrencyAsync(donorId, ct);

    public Task<DonorSummary?> GetSummaryAsync(Guid donorId, CancellationToken ct)
        => innerService.GetSummaryAsync(donorId, ct);
}
