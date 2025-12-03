public record DonationCreate
{
    public Guid DonorId { get; set; }
    public string? Currency { get; set; }
    public decimal Amount { get; set; }
    public DateOnly DonationDate { get; set; }
    public string? Perasha { get; set; }
    public string? Minian { get; set; }
    public string? Concept { get; set; }
    public string? Destination { get; set; }
    public string? DestinationOther { get; set; }
    public string? Comment { get; set; }
    public bool IsVirtual { get; set; }
}
