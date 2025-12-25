using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public class LoginCredentials
{
    [Required]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
}
