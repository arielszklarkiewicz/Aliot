namespace Donaciones.Api.Models;

public record Payment
{
    public Guid Id { get; set; }
    public Guid DonorId { get; set; }
    public string Currency { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public Guid DestinationId { get; set; }
    public Guid? CollectorId { get; set; }
    public string? Comment { get; set; }
    public bool IsVirtual { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
}