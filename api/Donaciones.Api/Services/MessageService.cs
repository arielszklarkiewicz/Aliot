using Donaciones.Api.Data;
using Donaciones.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Donaciones.Api.Services;

public class MessageService : IMessageService
{
    private readonly AppDbContext _db;
    private readonly ILogger<MessageService> _logger;

    public MessageService(AppDbContext db, ILogger<MessageService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<MessageDto?> SendMessageAsync(Guid fromUserId, MessageCreate message, CancellationToken ct = default)
    {
        var entity = new Message
        {
            Id = Guid.NewGuid(),
            FromUserId = fromUserId,
            ToUserId = message.ToUserId,
            MessageText = message.MessageText,
            Date = DateTimeOffset.UtcNow,
            IsRead = false,
            ReplyingTo = message.ReplyingTo
        };

        _db.Messages.Add(entity);
        await _db.SaveChangesAsync(ct);

        return await GetMessageDtoAsync(entity.Id, ct);
    }

    public async Task<IEnumerable<MessageDto>> GetConversationAsync(Guid currentUserId, Guid otherUserId, CancellationToken ct = default)
    {
        var messages = await _db.Messages
            .Where(m => (m.FromUserId == currentUserId && m.ToUserId == otherUserId) ||
                        (m.FromUserId == otherUserId && m.ToUserId == currentUserId))
            .OrderBy(m => m.Date)
            .ToListAsync(ct);

        // Auto-mark messages sent to currentUser as read
        var unreadMessages = messages.Where(m => m.ToUserId == currentUserId && !m.IsRead).ToList();
        foreach (var msg in unreadMessages)
        {
            msg.IsRead = true;
        }
        
        if (unreadMessages.Any())
        {
            await _db.SaveChangesAsync(ct);
        }

        return await ToMessageDtosAsync(messages, ct);
    }

    public async Task<bool> MarkAsReadAsync(Guid messageId, Guid currentUserId, CancellationToken ct = default)
    {
        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId, ct);
        if (message == null || message.ToUserId != currentUserId)
            return false;

        message.IsRead = true;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> MarkAsUnreadAsync(Guid messageId, Guid currentUserId, CancellationToken ct = default)
    {
        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId, ct);
        if (message == null || message.ToUserId != currentUserId)
            return false;

        message.IsRead = false;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default)
    {
        return await _db.Messages
            .Where(m => m.ToUserId == userId && !m.IsRead)
            .CountAsync(ct);
    }

    public async Task<IEnumerable<MessageDto>> GetAllMessagesAsync(CancellationToken ct = default)
    {
        var messages = await _db.Messages
            .OrderByDescending(m => m.Date)
            .ToListAsync(ct);

        return await ToMessageDtosAsync(messages, ct);
    }

    private async Task<MessageDto?> GetMessageDtoAsync(Guid messageId, CancellationToken ct = default)
    {
        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId, ct);
        if (message == null)
            return null;

        var messages = await ToMessageDtosAsync(new[] { message }, ct);
        return messages.FirstOrDefault();
    }

    private async Task<IEnumerable<MessageDto>> ToMessageDtosAsync(IEnumerable<Message> messages, CancellationToken ct = default)
    {
        var userIds = messages.SelectMany(m => new[] { m.FromUserId, m.ToUserId }).Distinct().ToList();
        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName ?? u.Email, ct);

        return messages.Select(m => new MessageDto
        {
            Id = m.Id,
            FromUserId = m.FromUserId,
            FromUserName = users.GetValueOrDefault(m.FromUserId, "Unknown"),
            ToUserId = m.ToUserId,
            ToUserName = users.GetValueOrDefault(m.ToUserId, "Unknown"),
            MessageText = m.MessageText,
            Date = m.Date,
            IsRead = m.IsRead,
            ReplyingTo = m.ReplyingTo
        }).ToList();
    }
}
