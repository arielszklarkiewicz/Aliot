using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public class CreateUserRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
    
    [Required]
    public UserRole Role { get; set; }
    
    public string? FullName { get; set; }
    
    public string? Email { get; set; }
}
