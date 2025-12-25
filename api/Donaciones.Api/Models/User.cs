using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public class User
{
    public Guid Id { get; set; }
    
    [Required]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    
    public string? FullName { get; set; }
    
    public string? Email { get; set; }
    
    [Required]
    public UserRole Role { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public DateTimeOffset CreatedAt { get; set; }
    
    public DateTimeOffset? UpdatedAt { get; set; }
}
