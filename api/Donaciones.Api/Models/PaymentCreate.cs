namespace Donaciones.Api.Models;

public record PaymentCreate
{
    public Guid DonorId { get; set; }
    public string? Currency { get; set; }
    public decimal? Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public string? Destination { get; set; }
    public string? Collector { get; set; }
    public string? Comment { get; set; }
    public bool IsVirtual { get; set; }
}