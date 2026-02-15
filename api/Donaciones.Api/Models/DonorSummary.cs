namespace Donaciones.Api.Models;

public record DonorSummary
{
    public Donor? Donor { get; set; }
    public IReadOnlyList<Donation> Donations { get; set; } = Array.Empty<Donation>();
    public IReadOnlyList<Payment> Payments { get; set; } = Array.Empty<Payment>();
    public IReadOnlyList<DonorCurrencyBalance> Balances { get; set; } = Array.Empty<DonorCurrencyBalance>();
}