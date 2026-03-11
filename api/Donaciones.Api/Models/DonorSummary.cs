namespace Donaciones.Api.Models;

public record DonorSummary
{
    public Donor? Donor { get; set; }
    public IReadOnlyList<DonationListItem> Donations { get; set; } = Array.Empty<DonationListItem>();
    public IReadOnlyList<PaymentListItem> Payments { get; set; } = Array.Empty<PaymentListItem>();
    public IReadOnlyList<DonorCurrencyBalance> Balances { get; set; } = Array.Empty<DonorCurrencyBalance>();
}