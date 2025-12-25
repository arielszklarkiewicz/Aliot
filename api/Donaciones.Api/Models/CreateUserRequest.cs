using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public class CreateUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
    
    [Required]
    public UserRole Role { get; set; }
    
    public string? FullName { get; set; }
}
