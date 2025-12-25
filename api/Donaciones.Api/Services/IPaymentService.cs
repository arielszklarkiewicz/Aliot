using Microsoft.EntityFrameworkCore;

public interface IPaymentService
{
    Task<(IReadOnlyList<PaymentListItem> items, int total)> ListAsync(Guid? donorId, string? currency, string? collector, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct);
    Task<Payment?> GetAsync(Guid id, CancellationToken ct);
    Task<Payment?> CreateAsync(PaymentCreate dto, Guid userId, CancellationToken ct);
    Task<Payment?> UpdateAsync(Guid id, PaymentCreate dto, Guid userId, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct);
}
