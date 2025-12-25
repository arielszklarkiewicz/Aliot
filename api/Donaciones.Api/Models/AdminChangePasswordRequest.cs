using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public class AdminChangePasswordRequest
{
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;
}
