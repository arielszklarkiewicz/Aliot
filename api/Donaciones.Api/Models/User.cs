using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public class User
{
    public Guid Id { get; set; }
    
    [Required]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    
    public string? FullName { get; set; }
    
    [Required]
    public UserRole Role { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public bool CanSendMessage { get; set; } = true;
    
    public DateTimeOffset CreatedAt { get; set; }
    
    public Guid? CreatedBy { get; set; }
    
    public DateTimeOffset? UpdatedAt { get; set; }
    
    public Guid? UpdatedBy { get; set; }
}
