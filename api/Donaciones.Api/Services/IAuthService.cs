using Donaciones.Api.Models;

namespace Donaciones.Api.Services;

public interface IAuthService
{
    Task<(string Token, User User)?> AuthenticateAsync(string email, string password, CancellationToken ct = default);
    Task<User?> GetUserByIdAsync(Guid userId, CancellationToken ct = default);
    Task<User> CreateUserAsync(string email, string password, UserRole role, string? fullName = null, Guid? createdBy = null, CancellationToken ct = default);
    Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken ct = default);
    Task<bool> AdminChangePasswordAsync(Guid userId, string newPassword, CancellationToken ct = default);
    Task<User?> UpdateUserAsync(Guid userId, string? fullName, string? email, Guid? updatedBy = null, CancellationToken ct = default);
    Task<bool> SetUserActiveStatusAsync(Guid userId, bool isActive, CancellationToken ct = default);
    Task<bool> SetUserCanSendMessageAsync(Guid userId, bool canSendMessage, CancellationToken ct = default);
    Task<bool> DeleteUserAsync(Guid userId, CancellationToken ct = default);
    Task<(List<User> Users, int Total)> ListUsersAsync(int page = 1, int pageSize = 20, CancellationToken ct = default);
}
