namespace Donaciones.Api.Models;

public record DonorBalance
{
    public Guid DonorId { get; set; }
    public string? Currency { get; set; }
    public decimal DonationsTotal { get; set; }
    public decimal PaymentsTotal { get; set; }
    public decimal Total => DonationsTotal - PaymentsTotal;
}