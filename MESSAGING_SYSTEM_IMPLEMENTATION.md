# Messaging System Implementation

## Overview
A complete offline messaging/ticket-style system has been implemented between Donors and System Admins, allowing asynchronous communication within the donation management platform.

## Database Changes

### New Table: `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  replying_to UUID NULL,
  
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (replying_to) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_to_user_id ON messages(to_user_id);
CREATE INDEX idx_messages_from_user_id ON messages(from_user_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_date ON messages(date);
```

**Migration File:** `20260216030535_AddMessagesTable.cs`

## Backend Implementation

### Models
1. **Message.cs** - Entity model
   - Id (Guid)
   - FromUserId (Guid)
   - ToUserId (Guid)
   - MessageText (string)
   - Date (DateTimeOffset)
   - IsRead (bool)
   - ReplyingTo (Guid?)

2. **MessageCreate.cs** - DTO for creating messages
   - ToUserId (Guid)
   - MessageText (string)
   - ReplyingTo (Guid?)

3. **MessageDto.cs** - DTO for reading messages with user details
   - Includes from/to user names for display

### Permissions
Added three new permissions in `Permission.cs`:
- **ViewMessages** - View own messages
- **SendMessages** - Send messages
- **ViewAllMessages** - Admin-only: view all messages across users

### Role Permissions
- **Admin & DataEntry**: All message permissions (ViewMessages, SendMessages, ViewAllMessages)
- **Donor**: ViewMessages and SendMessages (can only message admins)
- **ReadOnly**: No message permissions

### Service Layer
**MessageService.cs** implements `IMessageService` with:
- `SendMessageAsync()` - Send a new message
- `GetConversationAsync()` - Get conversation between two users (auto-marks unread as read)
- `MarkAsReadAsync()` - Manually mark message as read
- `MarkAsUnreadAsync()` - Manually mark message as unread
- `GetUnreadCountAsync()` - Get count of unread messages for a user
- `GetAllMessagesAsync()` - Admin-only: get all messages

### API Endpoints
```
POST   /api/messages                           - Send message
GET    /api/messages/conversation/{userId}     - Get conversation with user
PUT    /api/messages/{id}/mark-read            - Mark message as read
PUT    /api/messages/{id}/mark-unread          - Mark message as unread
GET    /api/messages/unread-count              - Get unread message count
GET    /api/admin/messages                     - Admin: get all messages
```

### Authorization Rules
- Donors can only message Admin/DataEntry users
- Auto-verification of role when loading conversations
- Messages auto-marked as read when conversation is opened
- Only message recipient can mark it as read/unread

## Frontend Implementation

### New Page: Messages.jsx
Location: `/frontend/src/pages/Messages.jsx`

Features:
- **Two-column layout**: User list (sidebar) + Conversation area
- **Role-based user filtering**:
  - Admins/DataEntry see list of Donors
  - Donors see list of Admins/DataEntry
- **Real-time conversation view**
- **Reply functionality** with visual thread indicators
- **Mark as unread** button for read messages
- **Message metadata**: timestamp, read status
- **Visual distinction** between sent/received messages

### Navigation Updates
**Navigation.jsx** enhanced with:
- Unread message count badge (🔴)
- Auto-refresh every 30 seconds
- Refresh on route change
- Messages link in "Consultas y Reportes" section
- Accessible to Admin, DataEntry, and Donor roles

### Styling
**Messages.css** provides:
- Modern, clean conversation UI
- Color-coded messages (blue for sent, gray for received)
- Smooth animations and transitions
- Mobile-responsive layout
- Reply reference indicators
- User avatars with gradient backgrounds

### DonorSummary Integration
Added quick "💬 Mensajes" button in donor welcome banner for easy access to messaging from their summary page.

## User Experience

### For Donors
1. Navigate to "Mensajes" from main menu or donor summary
2. See list of available admins
3. Click admin to start/view conversation
4. Send messages with optional replies to specific messages
5. Mark messages as unread if needed
6. Unread count badge shows on navigation

### For Admins/Data Entry
1. Navigate to "Mensajes" from main menu
2. See list of all donors
3. Select donor to view conversation
4. Reply to donor messages
5. Mark messages as unread for follow-up
6. Unread count badge shows on navigation

## Auto-Read Behavior
When a user opens a conversation:
- All unread messages where the user is the recipient are automatically marked as read
- This happens server-side in `GetConversationAsync()`
- Ensures accurate unread counts
- User can manually mark as unread if needed

## Security Features
- **Authentication required** for all endpoints
- **Role-based access control**:
  - Donors restricted to messaging admins only
  - Admins can message any donor
  - Users can only mark their own received messages as read/unread
- **Cascade deletion**: Messages deleted when user is deleted
- **SQL injection protection**: EF Core parameterized queries

## Performance Considerations
- **Indexed columns**: to_user_id, from_user_id, is_read, date
- **Efficient queries**: Only load conversations between two users
- **Client-side caching**: Unread count refreshed every 30s
- **Pagination ready**: Structure supports pagination if needed

## Future Enhancements (Not Implemented)
Potential improvements for future iterations:
- Real-time updates via SignalR
- Push notifications
- Message search functionality
- File attachments
- Message deletion
- Conversation archiving
- Admin message templates

## Testing Recommendations
1. **Test donor messaging restrictions**
   - Verify donors can only see/message admins
   - Verify proper error handling for unauthorized access

2. **Test auto-read functionality**
   - Open conversation and verify unread messages become read
   - Verify unread count updates

3. **Test reply threads**
   - Send replies to specific messages
   - Verify reply indicators display correctly

4. **Test mark as unread**
   - Mark read messages as unread
   - Verify unread count updates

5. **Test permissions**
   - Verify ReadOnly users cannot access messages
   - Verify role-based menu visibility

## Migration Steps
1. Run the database migration: `dotnet ef database update`
2. Backend changes are automatically applied on startup
3. Frontend rebuild already includes new components
4. No data migration needed (new feature)

## Files Changed/Created

### Backend
- ✅ Created: `Models/Message.cs`
- ✅ Created: `Models/MessageCreate.cs`
- ✅ Created: `Models/MessageDto.cs`
- ✅ Created: `Services/IMessageService.cs`
- ✅ Created: `Services/MessageService.cs`
- ✅ Created: `Migrations/20260216030535_AddMessagesTable.cs`
- ✅ Modified: `Data/AppDbContext.cs`
- ✅ Modified: `Authorization/Permission.cs`
- ✅ Modified: `Authorization/RolePermissions.cs`
- ✅ Modified: `Program.cs`

### Frontend
- ✅ Created: `pages/Messages.jsx`
- ✅ Created: `styles/Messages.css`
- ✅ Modified: `components/Navigation.jsx`
- ✅ Modified: `styles/Navigation.css`
- ✅ Modified: `App.jsx`
- ✅ Modified: `pages/DonorSummary.jsx`

## Summary
The messaging system is fully implemented and ready for use. All functional requirements have been met:
- ✅ Donors can send messages to admins
- ✅ View full conversation history
- ✅ Reply to specific messages
- ✅ Mark messages as unread manually
- ✅ Auto-mark as read when opened
- ✅ Unread count indicator in navigation
- ✅ Conversation-style UI
- ✅ Admin can view and reply to all donor messages
- ✅ Proper authorization and access control

Both backend and frontend build successfully without errors.
