namespace Donaciones.Api.Models;

public record PaymentCreate
{
    public Guid DonorId { get; set; }
    public string? Currency { get; set; }
    public decimal? Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public Guid? DestinationId { get; set; }
    public Guid? CollectorId { get; set; }
    public string? Comment { get; set; }
    public bool IsVirtual { get; set; }
}