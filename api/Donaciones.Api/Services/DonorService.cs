using Donaciones.Api.Data;
using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Donaciones.Api.Services;

public class DonorService(AppDbContext db, IAuthService authService) : IDonorService
{
    public async Task<(IReadOnlyList<Donor> items, int total)> ListAsync(string? q, bool? isOccasionalDonor, int page, int pageSize, CancellationToken ct)
    {
        var qry = db.Donors.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var terms = q.ToLower().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var term in terms)
            {
                qry = qry.Where(d =>
                    d.FirstName.ToLower().Contains(term)
                    || (d.LastName != null && d.LastName.ToLower().Contains(term))
                    || (d.Observations != null && d.Observations.ToLower().Contains(term))
                );
            }
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

    public Task<Donor?> GetAsync(Guid id, CancellationToken ct) => db.Donors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id, ct);

    public async Task<Donor> CreateAsync(Donor donor, Guid userId, CancellationToken ct)
    {
        donor.Id = Guid.NewGuid();
        donor.CreatedAt = DateTimeOffset.UtcNow;
        donor.CreatedBy = userId;
        
        // Create a user account for donor portal access with retry mechanism
        var maxRetries = 10;
        var retryCount = 0;
        User? user = null;
        string? username = null;
        var password = GeneratePassword();
        
        while (user == null)
        {
            try
            {
                username = await GenerateUniqueUsernameAsync(donor.FirstName, donor.LastName, ct);
                
                // Diagnostic logging
                Console.WriteLine($"[ATTEMPTING USER CREATE] Username: {username} | Donor: {donor.FirstName} {donor.LastName} | Attempt: {retryCount + 1}");
                
                user = await authService.CreateUserAsync(
                    email: username,
                    password: password,
                    role: UserRole.Donor,
                    fullName: donor.FullName,
                    createdBy: userId,
                    ct: ct
                );
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("Email already exists"))
            {
                retryCount++;
                Console.WriteLine($"[USER CREATE FAILED] Username: {username} already exists (app check) | Retry: {retryCount}/{maxRetries}");
                if (retryCount >= maxRetries)
                {
                    // If still failing after retries, continue without user account
                    Console.WriteLine($"[USER CREATE ABORTED] Max retries reached for donor: {donor.FirstName} {donor.LastName}");
                    break;
                }
                // Wait a bit before retrying to allow concurrent transactions to complete
                await Task.Delay(50 * retryCount, ct);
            }
            catch (DbUpdateException ex) 
                when (ex.InnerException?.Message?.Contains("duplicate key") == true || 
                      ex.InnerException?.Message?.Contains("IX_users_email") == true)
            {
                retryCount++;
                Console.WriteLine($"[USER CREATE FAILED] Username: {username} already exists (DB constraint) | Retry: {retryCount}/{maxRetries}");
                if (retryCount >= maxRetries)
                {
                    // If still failing after retries, continue without user account
                    Console.WriteLine($"[USER CREATE ABORTED] Max retries reached for donor: {donor.FirstName} {donor.LastName}");
                    break;
                }
                // Wait a bit before retrying to allow concurrent transactions to complete
                await Task.Delay(50 * retryCount, ct);
            }
            catch (Exception ex)
            {
                // Other exceptions, break and continue without user
                Console.WriteLine($"[USER CREATE ERROR] Unexpected error for username: {username} | Error: {ex.Message}");
                break;
            }
        }
        
        if (user != null)
        {
            donor.UserId = user.Id;
            // Log credentials for admin to retrieve
            Console.WriteLine($"[DONOR CREATED] Username: {username} | Password: {password} | Donor: {donor.FullName}");
        }
        
        db.Donors.Add(donor);
        await db.SaveChangesAsync(ct);
        return donor;
    }
    
    private string GenerateUsername(string firstName, string? lastName)
    {
        var baseUsername = lastName != null 
            ? $"{firstName}.{lastName}".ToLower()
            : firstName.ToLower();
        
        // Remove spaces and special characters
        baseUsername = new string(baseUsername.Where(c => char.IsLetterOrDigit(c) || c == '.').ToArray());
        
        return baseUsername;
    }
    
    private async Task<string> GenerateUniqueUsernameAsync(string firstName, string? lastName, CancellationToken ct)
    {
        var baseUsername = GenerateUsername(firstName, lastName);
        var username = baseUsername;
        var counter = 1;
        
        Console.WriteLine($"[USERNAME GENERATION] Base username: {baseUsername} | Name: {firstName} {lastName}");
        
        // Check if username exists and append number if needed
        // Limit iterations to prevent infinite loop
        while (await db.Users.AnyAsync(u => u.Email == username, ct) && counter <= 1000)
        {
            Console.WriteLine($"[USERNAME CONFLICT] {username} already exists, trying {baseUsername}.{counter}");
            username = $"{baseUsername}.{counter}";
            counter++;
        }
        
        // If we exhausted counter attempts, add a random suffix to ensure uniqueness
        if (counter > 1000)
        {
            var random = new Random();
            username = $"{baseUsername}.{random.Next(10000, 99999)}";
            Console.WriteLine($"[USERNAME FALLBACK] Using random suffix: {username}");
        }
        
        Console.WriteLine($"[USERNAME SELECTED] Final username: {username}");
        return username;
    }
    
    private string GeneratePassword()
    {
        // Always return default password for new donors
        return "123456";
    }

    public async Task<Donor?> UpdateAsync(Guid id, Donor donor, Guid userId, CancellationToken ct)
    {
        var existing = await db.Donors.FirstOrDefaultAsync(d => d.Id == id, ct);
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
        await db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var donor = await db.Donors.FirstOrDefaultAsync(d => d.Id == id, ct);
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
        db.DeletionLogs.Add(deletionLog);
        
        db.Donors.Remove(donor);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<DonorBalance> GetBalanceAsync(Guid donorId, string? currency, CancellationToken ct)
    {
        // ensure donor exists (optional)
        var donorExists = await db.Donors.AsNoTracking().AnyAsync(d => d.Id == donorId, ct);
        if (!donorExists) return new DonorBalance { DonorId = donorId, Currency = currency, DonationsTotal = 0, PaymentsTotal = 0 };

        var donationsQry = db.Donations.AsNoTracking().Where(d => d.DonorId == donorId);
        var paymentsQry = db.Payments.AsNoTracking().Where(p => p.DonorId == donorId);
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
        var donorExists = await db.Donors.AsNoTracking().AnyAsync(d => d.Id == donorId, ct);
        if (!donorExists) return Array.Empty<DonorCurrencyBalance>();

        var allDonations = await db.Donations.AsNoTracking()
            .Where(d => d.DonorId == donorId)
            .ToListAsync(ct);

        var allPayments = await db.Payments.AsNoTracking()
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
        var donor = await db.Donors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == donorId, ct);
        if (donor == null) return null;

        // Get donations with concept and destination names
        var donations = await (from d in db.Donations
                              join c in db.Concepts on d.Concept equals c.Id.ToString().ToLower() into concepts
                              from concept in concepts.DefaultIfEmpty()
                              join dest in db.Destinations on d.Destination equals dest.Id.ToString().ToLower() into dests
                              from destination in dests.DefaultIfEmpty()
                              where d.DonorId == donorId
                              orderby d.DonationDate descending
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
                              .ToListAsync(ct);

        // Get payments with destination and collector names
        var payments = await (from p in db.Payments
                             join dest in db.Destinations on p.Destination equals dest.Id.ToString().ToLower() into dests
                             from destination in dests.DefaultIfEmpty()
                             join coll in db.Collectors on (p.Collector ?? "") equals coll.Id.ToString().ToLower() into colls
                             from collector in colls.DefaultIfEmpty()
                             where p.DonorId == donorId
                             orderby p.PaymentDate descending
                             select new Payment
                             {
                                 Id = p.Id,
                                 DonorId = p.DonorId,
                                 Currency = p.Currency,
                                 Amount = p.Amount,
                                 PaymentDate = p.PaymentDate,
                                 Destination = destination != null ? destination.Name : p.Destination,
                                 Collector = collector != null ? collector.Name : p.Collector,
                                 Comment = p.Comment,
                                 IsVirtual = p.IsVirtual,
                                 CreatedAt = p.CreatedAt,
                                 CreatedBy = p.CreatedBy,
                                 UpdatedAt = p.UpdatedAt,
                                 UpdatedBy = p.UpdatedBy
                             })
                             .AsNoTracking()
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

    public async Task<(int donationsCount, int paymentsCount)> GetDonorDataCountAsync(Guid donorId, CancellationToken ct)
    {
        var donationsCount = await db.Donations.AsNoTracking().CountAsync(d => d.DonorId == donorId, ct);
        var paymentsCount = await db.Payments.AsNoTracking().CountAsync(p => p.DonorId == donorId, ct);
        return (donationsCount, paymentsCount);
    }

    public async Task<bool> MergeDonorAsync(Guid fromDonorId, Guid toDonorId, Guid userId, CancellationToken ct)
    {
        var fromDonor = await db.Donors.FirstOrDefaultAsync(d => d.Id == fromDonorId, ct);
        var toDonor = await db.Donors.FirstOrDefaultAsync(d => d.Id == toDonorId, ct);
        
        if (fromDonor == null || toDonor == null) return false;

        // Move all donations from fromDonor to toDonor
        var donations = await db.Donations.Where(d => d.DonorId == fromDonorId).ToListAsync(ct);
        foreach (var donation in donations)
        {
            donation.DonorId = toDonorId;
            donation.UpdatedAt = DateTimeOffset.UtcNow;
            donation.UpdatedBy = userId;
        }

        // Move all payments from fromDonor to toDonor
        var payments = await db.Payments.Where(p => p.DonorId == fromDonorId).ToListAsync(ct);
        foreach (var payment in payments)
        {
            payment.DonorId = toDonorId;
            payment.UpdatedAt = DateTimeOffset.UtcNow;
            payment.UpdatedBy = userId;
        }

        // Delete the user associated with fromDonor if it exists
        if (fromDonor.UserId.HasValue)
        {
            await authService.DeleteUserAsync(fromDonor.UserId.Value, ct);
        }

        // Log the merge before deletion
        var deletionLog = new DeletionLog
        {
            Id = Guid.NewGuid(),
            EntityType = "Donor",
            EntityId = fromDonor.Id,
            EntityDetails = $"{fromDonor.FirstName} {fromDonor.LastName} merged into {toDonor.FirstName} {toDonor.LastName} (ID: {toDonorId})",
            DeletedBy = userId,
            DeletedAt = DateTimeOffset.UtcNow
        };
        db.DeletionLogs.Add(deletionLog);

        // Delete the fromDonor
        db.Donors.Remove(fromDonor);
        
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<(bool success, string? username, string? password, string? error)> CreateUserForDonorAsync(Guid donorId, Guid createdBy, CancellationToken ct)
    {
        var donor = await db.Donors.FirstOrDefaultAsync(d => d.Id == donorId, ct);
        if (donor == null)
        {
            return (false, null, null, "Donante no encontrado");
        }

        if (donor.UserId.HasValue)
        {
            return (false, null, null, "El donante ya tiene un usuario asociado");
        }

        var username = await GenerateUniqueUsernameAsync(donor.FirstName, donor.LastName, ct);
        var password = GeneratePassword();

        try
        {
            var user = await authService.CreateUserAsync(
                email: username,
                password: password,
                role: UserRole.Donor,
                fullName: donor.FullName,
                createdBy: createdBy,
                ct: ct
            );

            donor.UserId = user.Id;
            donor.UpdatedAt = DateTimeOffset.UtcNow;
            donor.UpdatedBy = createdBy;
            await db.SaveChangesAsync(ct);

            Console.WriteLine($"[USER CREATED FOR DONOR] DonorId: {donorId} | Username: {username} | Password: {password}");
            return (true, username, password, null);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[USER CREATE FAILED FOR DONOR] DonorId: {donorId} | Error: {ex.Message}");
            return (false, null, null, "Error al crear el usuario");
        }
    }
}
