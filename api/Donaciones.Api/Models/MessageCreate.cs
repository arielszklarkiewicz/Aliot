using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public record MessageCreate
{
    [Required]
    public Guid ToUserId { get; set; }
    
    [Required]
    public string MessageText { get; set; } = string.Empty;
    
    public Guid? ReplyingTo { get; set; }
}
