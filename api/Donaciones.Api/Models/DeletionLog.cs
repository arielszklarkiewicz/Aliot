using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public class DeletionLog
{
    public Guid Id { get; set; }
    
    [Required]
    public string EntityType { get; set; } = string.Empty;
    
    [Required]
    public Guid EntityId { get; set; }
    
    public string? EntityDetails { get; set; }
    
    [Required]
    public Guid DeletedBy { get; set; }
    
    public DateTimeOffset DeletedAt { get; set; }
}
