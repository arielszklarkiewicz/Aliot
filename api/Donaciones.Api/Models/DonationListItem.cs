public record DonationListItem
{
    public Guid Id { get; set; }
    public Guid DonorId { get; set; }
    public string DonorName { get; set; } = string.Empty;
    public string? DonorObservations { get; set; }
    public string Currency { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly DonationDate { get; set; }
    public string? Perasha { get; set; }
    public string Minian { get; set; } = string.Empty;
    public string Concept { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public string? DestinationOther { get; set; }
    public string? Comment { get; set; }
}