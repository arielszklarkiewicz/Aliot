import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import api from '../api/client';
import '../styles/Messages.css';

export default function Messages() {
  const { user, isAdmin, isDataEntry } = useCurrentUser();
  const [messages, setMessages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [error, setError] = useState('');

  const isAdminUser = isAdmin || isDataEntry;

  // Check if user can send messages
  if (user && user.canSendMessage === false) {
    return (
      <div className="messages-container">
        <div className="messages-header">
          <h1>💬 Mensajes</h1>
          <p className="messages-subtitle">Acceso denegado</p>
        </div>
        <div className="content-wrapper">
          <div className="error-message">
            No tiene permisos para acceder a los mensajes.
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (isAdminUser) {
      loadAvailableUsers();
    } else {
      // For donors, load admin users to message
      loadAdminUsers();
    }
  }, [isAdminUser]);

  useEffect(() => {
    if (selectedUserId) {
      loadConversation(selectedUserId);
    }
  }, [selectedUserId]);

  const loadAvailableUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/users', { params: { pageSize: 1000 } });
      const users = response.data.items.filter(u => u.id !== user.id && u.role === 'Donor' && u.canSendMessage !== false);
      setAvailableUsers(users);
      
      if (users.length > 0 && !selectedUserId) {
        setSelectedUserId(users[0].id);
      }
    } catch (err) {
      setError('Error al cargar usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/messages/admin-users');
      const admins = response.data.items || [];
      setAvailableUsers(admins);
      
      if (admins.length > 0 && !selectedUserId) {
        setSelectedUserId(admins[0].id);
      }
    } catch (err) {
      setError('Error al cargar administradores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (userId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/messages/conversation/${userId}`);
      setConversationMessages(response.data.items || []);
    } catch (err) {
      setError('Error al cargar conversación');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;

    try {
      setLoading(true);
      await api.post('/api/messages', {
        toUserId: selectedUserId,
        messageText: newMessage.trim(),
        replyingTo: replyingTo
      });
      
      setNewMessage('');
      setReplyingTo(null);
      await loadConversation(selectedUserId);
    } catch (err) {
      setError('Error al enviar mensaje');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsUnread = async (messageId) => {
    try {
      await api.put(`/api/messages/${messageId}/mark-unread`);
      await loadConversation(selectedUserId);
    } catch (err) {
      console.error('Error marking as unread', err);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message.id);
    document.getElementById('message-input')?.focus();
  };

  const getReplyingToMessage = () => {
    if (!replyingTo) return null;
    return conversationMessages.find(m => m.id === replyingTo);
  };

  const selectedUser = availableUsers.find(u => u.id === selectedUserId);

  return (
    <div className="messages-container">
      <div className="messages-header">
        <h1>💬 Mensajes</h1>
        <p className="messages-subtitle">
          {isAdminUser 
            ? 'Comunicación con donantes' 
            : 'Comuníquese con el administrador'}
        </p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="messages-layout">
        {/* User List */}
        <div className="users-sidebar">
          <h3>{isAdminUser ? 'Donantes' : 'Administradores'}</h3>
          <div className="users-list">
            {availableUsers.map(u => (
              <div
                key={u.id}
                className={`user-item ${selectedUserId === u.id ? 'selected' : ''}`}
                onClick={() => setSelectedUserId(u.id)}
              >
                <div className="user-avatar">
                  {(u.fullName || u.email).charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <div className="user-name">{u.fullName || u.email}</div>
                  <div className="user-email">{u.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation Area */}
        <div className="conversation-area">
          {selectedUser ? (
            <>
              <div className="conversation-header">
                <div className="user-avatar">
                  {(selectedUser.fullName || selectedUser.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="user-name">{selectedUser.fullName || selectedUser.email}</div>
                  <div className="user-email">{selectedUser.email}</div>
                </div>
              </div>

              <div className="messages-list">
                {conversationMessages.length === 0 ? (
                  <div className="no-messages">
                    <p>No hay mensajes aún. ¡Envía el primero!</p>
                  </div>
                ) : (
                  conversationMessages.map(msg => {
                    const isMyMessage = msg.fromUserId === user.id;
                    const replyTo = msg.replyingTo 
                      ? conversationMessages.find(m => m.id === msg.replyingTo) 
                      : null;

                    return (
                      <div key={msg.id} className={`message ${isMyMessage ? 'my-message' : 'their-message'}`}>
                        {replyTo && (
                          <div className="reply-reference">
                            <span className="reply-icon">↩️</span>
                            <span className="reply-text">{replyTo.messageText.substring(0, 50)}...</span>
                          </div>
                        )}
                        <div className="message-content">
                          <div className="message-text">{msg.messageText}</div>
                          <div className="message-meta">
                            <span className="message-time">
                              {new Date(msg.date).toLocaleString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {!isMyMessage && msg.isRead && (
                              <span className="read-status">✓✓</span>
                            )}
                          </div>
                        </div>
                        <div className="message-actions">
                          <button
                            className="btn-action"
                            onClick={() => handleReply(msg)}
                            title="Responder"
                          >
                            ↩️
                          </button>
                          {!isMyMessage && msg.isRead && (
                            <button
                              className="btn-action"
                              onClick={() => markAsUnread(msg.id)}
                              title="Marcar como no leído"
                            >
                              ✉️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="message-input-area" onSubmit={sendMessage}>
                {replyingTo && (
                  <div className="replying-to-banner">
                    <span>Respondiendo a: {getReplyingToMessage()?.messageText.substring(0, 50)}...</span>
                    <button type="button" onClick={() => setReplyingTo(null)}>✕</button>
                  </div>
                )}
                <div className="input-row">
                  <input
                    id="message-input"
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading || !newMessage.trim()}>
                    {loading ? '...' : '📤 Enviar'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="no-user-selected">
              <p>Selecciona un usuario para comenzar la conversación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
