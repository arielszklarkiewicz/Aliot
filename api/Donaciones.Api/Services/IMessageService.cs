using Donaciones.Api.Models;

namespace Donaciones.Api.Services;

public interface IMessageService
{
    Task<MessageDto?> SendMessageAsync(Guid fromUserId, MessageCreate message, CancellationToken ct = default);
    Task<IEnumerable<MessageDto>> GetConversationAsync(Guid currentUserId, Guid otherUserId, CancellationToken ct = default);
    Task<bool> MarkAsReadAsync(Guid messageId, Guid currentUserId, CancellationToken ct = default);
    Task<bool> MarkAsUnreadAsync(Guid messageId, Guid currentUserId, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default);
    Task<IEnumerable<MessageDto>> GetAllMessagesAsync(CancellationToken ct = default);
}
