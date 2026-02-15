namespace Donaciones.Api.Models;

public record DonorCurrencyBalance
{
    public string Currency { get; set; } = string.Empty;
    public decimal DonationsTotal { get; set; }
    public decimal PaymentsTotal { get; set; }
    public decimal Total => DonationsTotal - PaymentsTotal;
}