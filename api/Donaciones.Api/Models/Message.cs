using System.ComponentModel.DataAnnotations;

namespace Donaciones.Api.Models;

public class Message
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid FromUserId { get; set; }
    
    [Required]
    public Guid ToUserId { get; set; }
    
    [Required]
    public string MessageText { get; set; } = string.Empty;
    
    public DateTimeOffset Date { get; set; } = DateTimeOffset.UtcNow;
    
    public bool IsRead { get; set; } = false;
    
    public Guid? ReplyingTo { get; set; }
}
