public record Payment
{
    public Guid Id { get; set; }
    public Guid DonorId { get; set; }
    public string Currency { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public string Destination { get; set; } = string.Empty;
    public string? Collector { get; set; }
    public string? Comment { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
