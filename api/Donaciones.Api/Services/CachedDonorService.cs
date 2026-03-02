using Donaciones.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace Donaciones.Api.Services;

public class CachedDonorService : IDonorService
{
    private readonly DonorService _innerService;
    private readonly IMemoryCache _cache;
    private const string ALL_DONORS_CACHE_KEY = "all_donors_full_list";
    private const int CACHE_DURATION_MINUTES = 30;

    public CachedDonorService(DonorService innerService, IMemoryCache cache)
    {
        _innerService = innerService;
        _cache = cache;
    }

    private void InvalidateCache()
    {
        _cache.Remove(ALL_DONORS_CACHE_KEY);
    }

    public async Task<(IReadOnlyList<Donor> items, int total)> ListAsync(
        string? q, bool? isOccasionalDonor, int page, int pageSize, CancellationToken ct)
    {
        // Get all donors from cache or DB
        if (!_cache.TryGetValue(ALL_DONORS_CACHE_KEY, out List<Donor>? allDonors) || allDonors == null)
        {
            // Cache miss - load ALL donors from database
            var (allItems, _) = await _innerService.ListAsync(null, null, 1, 10000, ct);
            allDonors = allItems.ToList();
            
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_DURATION_MINUTES))
                .SetSlidingExpiration(TimeSpan.FromMinutes(10));
            
            _cache.Set(ALL_DONORS_CACHE_KEY, allDonors, cacheOptions);
        }

        // Filter in memory
        var filtered = allDonors.AsEnumerable();
        
        if (!string.IsNullOrWhiteSpace(q))
        {
            var terms = q.ToLower().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var term in terms)
            {
                filtered = filtered.Where(d =>
                    d.FirstName.ToLower().Contains(term) ||
                    (d.LastName != null && d.LastName.ToLower().Contains(term)) ||
                    (d.Observations != null && d.Observations.ToLower().Contains(term))
                );
            }
        }
        
        if (isOccasionalDonor.HasValue)
        {
            filtered = filtered.Where(d => d.IsOccasionalDonor == isOccasionalDonor.Value);
        }

        var orderedList = filtered
            .OrderBy(d => d.FirstName)
            .ThenBy(d => d.LastName)
            .ToList();

        var total = orderedList.Count;
        var pagedItems = orderedList
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return (pagedItems, total);
    }

    public async Task<Donor?> GetAsync(Guid id, CancellationToken ct)
    {
        // Try to get from cache first
        if (_cache.TryGetValue(ALL_DONORS_CACHE_KEY, out List<Donor>? allDonors) && allDonors != null)
        {
            var donor = allDonors.FirstOrDefault(d => d.Id == id);
            if (donor != null) return donor;
        }

        // Not in cache, get from DB
        return await _innerService.GetAsync(id, ct);
    }

    public async Task<Donor> CreateAsync(Donor donor, Guid userId, CancellationToken ct)
    {
        var result = await _innerService.CreateAsync(donor, userId, ct);
        InvalidateCache();
        return result;
    }

    public async Task<Donor?> UpdateAsync(Guid id, Donor donor, Guid userId, CancellationToken ct)
    {
        var result = await _innerService.UpdateAsync(id, donor, userId, ct);
        if (result != null)
        {
            InvalidateCache();
        }
        return result;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var result = await _innerService.DeleteAsync(id, userId, ct);
        if (result)
        {
            InvalidateCache();
        }
        return result;
    }

    public Task<DonorBalance> GetBalanceAsync(Guid donorId, string? currency, CancellationToken ct)
        => _innerService.GetBalanceAsync(donorId, currency, ct);

    public Task<IReadOnlyList<DonorCurrencyBalance>> GetBalancesByCurrencyAsync(Guid donorId, CancellationToken ct)
        => _innerService.GetBalancesByCurrencyAsync(donorId, ct);

    public Task<DonorSummary?> GetSummaryAsync(Guid donorId, CancellationToken ct)
        => _innerService.GetSummaryAsync(donorId, ct);

    public Task<(int donationsCount, int paymentsCount)> GetDonorDataCountAsync(Guid donorId, CancellationToken ct)
        => _innerService.GetDonorDataCountAsync(donorId, ct);

    public async Task<bool> MergeDonorAsync(Guid fromDonorId, Guid toDonorId, Guid userId, CancellationToken ct)
    {
        var result = await _innerService.MergeDonorAsync(fromDonorId, toDonorId, userId, ct);
        if (result)
        {
            InvalidateCache();
        }
        return result;
    }

    public async Task<(bool success, string? username, string? password, string? error)> CreateUserForDonorAsync(Guid donorId, Guid createdBy, CancellationToken ct)
    {
        var result = await _innerService.CreateUserForDonorAsync(donorId, createdBy, ct);
        if (result.success)
        {
            InvalidateCache();
        }
        return result;
    }
}

