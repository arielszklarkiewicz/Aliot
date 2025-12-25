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

    public async Task<(string Token, User User)?> AuthenticateAsync(string username, string password, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return null;

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username, ct);

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

    public async Task<User?> GetUserByUsernameAsync(string username, CancellationToken ct = default)
    {
        return await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username, ct);
    }

    public async Task<User> CreateUserAsync(string username, string password, UserRole role, string? fullName = null, string? email = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username is required", nameof(username));

        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password is required", nameof(password));

        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Username == username, ct);
        if (existingUser != null)
            throw new InvalidOperationException("Username already exists");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            PasswordHash = HashPassword(password),
            Role = role,
            FullName = fullName,
            Email = email,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("User created: {Username} with role {Role}", username, role);
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

        _logger.LogInformation("Password changed for user: {Username}", user.Username);
        return true;
    }

    public async Task<User?> UpdateUserAsync(Guid userId, string? fullName, string? email, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return null;

        user.FullName = fullName;
        user.Email = email;
        user.UpdatedAt = DateTimeOffset.UtcNow;
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

        _logger.LogInformation("User {Username} active status set to: {IsActive}", user.Username, isActive);
        return true;
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
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("fullName", user.FullName ?? user.Username),
            new Claim("email", user.Email ?? string.Empty)
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
