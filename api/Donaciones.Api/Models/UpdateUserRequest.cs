using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public class UpdateUserRequest
{
    public string? FullName { get; set; }
    public string? Email { get; set; }
}
