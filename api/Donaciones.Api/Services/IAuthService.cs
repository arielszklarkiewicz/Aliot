using Donaciones.Api.Models;

namespace Donaciones.Api.Services;

public interface IAuthService
{
    Task<(string Token, User User)?> AuthenticateAsync(string username, string password, CancellationToken ct = default);
    Task<User?> GetUserByIdAsync(Guid userId, CancellationToken ct = default);
    Task<User?> GetUserByUsernameAsync(string username, CancellationToken ct = default);
    Task<User> CreateUserAsync(string username, string password, UserRole role, string? fullName = null, string? email = null, CancellationToken ct = default);
    Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken ct = default);
    Task<User?> UpdateUserAsync(Guid userId, string? fullName, string? email, CancellationToken ct = default);
    Task<bool> SetUserActiveStatusAsync(Guid userId, bool isActive, CancellationToken ct = default);
}
