using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Donaciones.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AppDbContext db, IConfiguration config, ILogger<AuthService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task<(string Token, User User)?> AuthenticateAsync(string email, string password, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return null;

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), ct);

        if (user == null || !user.IsActive)
            return null;

        if (!VerifyPassword(password, user.PasswordHash))
            return null;

        var token = GenerateJwtToken(user);
        return (token, user);
    }

    public async Task<User?> GetUserByIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    public async Task<User> CreateUserAsync(string email, string password, UserRole role, string? fullName = null, Guid? createdBy = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required", nameof(email));

        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password is required", nameof(password));

        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), ct);
        if (existingUser != null)
            throw new InvalidOperationException("Email already exists");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email.ToLower(),
            PasswordHash = HashPassword(password),
            Role = role,
            FullName = fullName,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = createdBy
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User created: {Email} with role {Role}", email, role);
        return user;
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return false;

        if (!VerifyPassword(currentPassword, user.PasswordHash))
            return false;

        user.PasswordHash = HashPassword(newPassword);
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Password changed for user: {Email}", user.Email);
        return true;
    }

    public async Task<bool> AdminChangePasswordAsync(Guid userId, string newPassword, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return false;

        user.PasswordHash = HashPassword(newPassword);
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Password changed by admin for user: {Email}", user.Email);
        return true;
    }

    public async Task<User?> UpdateUserAsync(Guid userId, string? fullName, string? email, Guid? updatedBy = null, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return null;

        user.FullName = fullName;
        if (!string.IsNullOrWhiteSpace(email))
            user.Email = email.ToLower();
        user.UpdatedAt = DateTimeOffset.UtcNow;
        user.UpdatedBy = updatedBy;
        await _db.SaveChangesAsync(ct);

        return user;
    }

    public async Task<bool> SetUserActiveStatusAsync(Guid userId, bool isActive, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return false;

        user.IsActive = isActive;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User {Email} active status set to: {IsActive}", user.Email, isActive);
        return true;
    }

    public async Task<bool> DeleteUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return false;

        _db.Users.Remove(user);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User deleted: {Email}", user.Email);
        return true;
    }

    public async Task<(List<User> Users, int Total)> ListUsersAsync(int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var query = _db.Users.AsNoTracking();

        var total = await query.CountAsync(ct);

        var users = await query
            .OrderBy(u => u.Email)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (users, total);
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSecret = _config["Jwt:Secret"] ?? _config["Jwt__Secret"];
        if (string.IsNullOrWhiteSpace(jwtSecret))
        {
            throw new InvalidOperationException("JWT secret is not configured");
        }

        var jwtIssuer = _config["Jwt:Issuer"] ?? _config["Jwt__Issuer"] ?? "Donaciones.Api";
        var jwtAudience = _config["Jwt:Audience"] ?? _config["Jwt__Audience"] ?? "Donaciones.Client";
        var jwtExpiryMinutes = int.TryParse(_config["Jwt:ExpiryMinutes"] ?? _config["Jwt__ExpiryMinutes"], out var mins) ? mins : 480; // 8 hours default

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("fullName", user.FullName ?? user.Email)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(jwtExpiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string HashPassword(string password)
    {
        // Using PBKDF2 with random salt
        const int saltSize = 16;
        const int hashSize = 32;
        const int iterations = 100000;

        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[saltSize];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(hashSize);

        // Combine salt and hash
        var hashBytes = new byte[saltSize + hashSize];
        Array.Copy(salt, 0, hashBytes, 0, saltSize);
        Array.Copy(hash, 0, hashBytes, saltSize, hashSize);

        return Convert.ToBase64String(hashBytes);
    }

    private static bool VerifyPassword(string password, string passwordHash)
    {
        try
        {
            const int saltSize = 16;
            const int hashSize = 32;
            const int iterations = 100000;

            var hashBytes = Convert.FromBase64String(passwordHash);

            if (hashBytes.Length != saltSize + hashSize)
                return false;

            var salt = new byte[saltSize];
            Array.Copy(hashBytes, 0, salt, 0, saltSize);

            using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
            var hash = pbkdf2.GetBytes(hashSize);

            for (int i = 0; i < hashSize; i++)
            {
                if (hashBytes[i + saltSize] != hash[i])
                    return false;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }
}
