// src/pages/MessagesPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../services/messageService';
import { userService } from '../services/userService';
import Navbar from '../components/Navbar';
import './MessagesPage.css';

const MessagesPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [users, setUsers] = useState({});
  const [showNewConv, setShowNewConv] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      const unsubscribe = messageService.subscribeToMessages(activeConv.id, (msgs) => {
        setMessages(msgs);
        scrollToBottom();
      });
      return () => unsubscribe();
    }
  }, [activeConv]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    const result = await messageService.getUserConversations(user.uid);
    if (result.success) {
      setConversations(result.data);
      
      // Charger les infos des utilisateurs
      const usersMap = {};
      for (const conv of result.data) {
        if (!conv.isGroup) {
          const otherId = conv.participants?.find(id => id !== user.uid);
          if (otherId && !usersMap[otherId]) {
            const uResult = await userService.getUser(otherId);
            if (uResult.success) {
              usersMap[otherId] = uResult.data;
            }
          }
        }
      }
      setUsers(usersMap);
    }
    setLoading(false);
  };

  const loadMessages = async (convId) => {
    const result = await messageService.getMessages(convId);
    if (result.success) {
      setMessages(result.data);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    setSending(true);
    
    await messageService.sendMessage(activeConv.id, {
      senderId: user.uid,
      content: text.trim(),
      type: 'text'
    });
    
    setText('');
    setSending(false);
    scrollToBottom();
    
    // Recharger les conversations pour mettre à jour le dernier message
    loadConversations();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startConversation = async (otherUserId) => {
    setSearching(true);
    const result = await messageService.getOrCreateConversation(user.uid, otherUserId);
    if (result.success) {
      setActiveConv(result.data);
      setShowNewConv(false);
      setSearchUser('');
      setSearchResults([]);
      loadConversations();
    }
    setSearching(false);
  };

  const searchUsers = async () => {
    if (!searchUser.trim()) return;
    setSearching(true);
    const result = await userService.searchUsers(searchUser);
    if (result.success) {
      setSearchResults(result.data.filter(u => u.uid !== user.uid));
    }
    setSearching(false);
  };

  const getOtherUser = (conv) => {
    const otherId = conv.participants?.find(id => id !== user.uid);
    return users[otherId] || { name: 'Utilisateur', initials: 'U', avatarBg: '#6c63ff' };
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getLastMessagePreview = (conv) => {
    if (conv.lastMessage) {
      return conv.lastMessage.length > 30 
        ? conv.lastMessage.substring(0, 30) + '...' 
        : conv.lastMessage;
    }
    return 'Nouvelle conversation';
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <Navbar />
      
      <div className="messages-container">
        {/* Sidebar des conversations */}
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h2>💬 Messages</h2>
            <button className="new-chat-btn" onClick={() => setShowNewConv(true)}>
              ✏️
            </button>
          </div>
          
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="empty-conversations">
                <div className="empty-icon">💬</div>
                <p>Aucune conversation</p>
                <button className="btn-start-chat" onClick={() => setShowNewConv(true)}>
                  Commencer une discussion
                </button>
              </div>
            ) : (
              conversations.map(conv => {
                const otherUser = getOtherUser(conv);
                const isActive = activeConv?.id === conv.id;
                
                return (
                  <div
                    key={conv.id}
                    className={`conversation-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveConv(conv)}
                  >
                    <div className="conv-avatar" style={{ background: otherUser.avatarBg || '#6c63ff' }}>
                      {otherUser.initials || 'U'}
                    </div>
                    <div className="conv-info">
                      <div className="conv-name">{otherUser.name}</div>
                      <div className="conv-preview">{getLastMessagePreview(conv)}</div>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="unread-badge">{conv.unreadCount}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Zone de chat */}
        <div className="chat-area">
          {activeConv ? (
            <>
              {/* En-tête du chat */}
              <div className="chat-header">
                <div className="chat-user-info">
                  <div className="chat-avatar" style={{ background: getOtherUser(activeConv).avatarBg || '#6c63ff' }}>
                    {getOtherUser(activeConv).initials || 'U'}
                  </div>
                  <div>
                    <h3>{getOtherUser(activeConv).name}</h3>
                    <span className="user-status">En ligne</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="empty-messages">
                    <div className="empty-icon">💬</div>
                    <p>Aucun message</p>
                    <p className="empty-sub">Soyez le premier à envoyer un message !</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMine = msg.senderId === user.uid;
                    const showAvatar = !isMine && (index === 0 || messages[index - 1]?.senderId !== msg.senderId);
                    
                    return (
                      <div key={msg.id} className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
                        {!isMine && showAvatar && (
                          <div className="message-avatar" style={{ background: getOtherUser(activeConv).avatarBg || '#6c63ff' }}>
                            {getOtherUser(activeConv).initials || 'U'}
                          </div>
                        )}
                        <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                          <div className="message-text">{msg.content}</div>
                          <div className="message-time">{formatMessageTime(msg.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chat-input-area">
                <textarea
                  ref={inputRef}
                  className="message-input"
                  placeholder="Écrire un message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows="1"
                />
                <button 
                  className="send-btn" 
                  onClick={sendMessage}
                  disabled={sending || !text.trim()}
                >
                  {sending ? '...' : '➤'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-conversation">
              <div className="no-conversation-icon">💬</div>
              <h3>Sélectionnez une conversation</h3>
              <p>Choisissez un ami pour commencer à discuter</p>
              <button className="btn-new-chat" onClick={() => setShowNewConv(true)}>
                ✏️ Nouvelle conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal nouvelle conversation */}
      {showNewConv && (
        <div className="modal-overlay" onClick={() => setShowNewConv(false)}>
          <div className="modal new-conv-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Nouvelle conversation</h3>
              <button className="modal-close" onClick={() => setShowNewConv(false)}>✕</button>
            </div>
            
            <div className="search-users">
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Rechercher un étudiant..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                />
                <button className="search-btn" onClick={searchUsers} disabled={searching}>
                  {searching ? '...' : 'Chercher'}
                </button>
              </div>
              
              <div className="search-results">
                {searchResults.length === 0 && searchUser && !searching && (
                  <div className="no-results">
                    <p>Aucun utilisateur trouvé</p>
                  </div>
                )}
                {searchResults.map(u => (
                  <div
                    key={u.id}
                    className="user-result"
                    onClick={() => startConversation(u.uid)}
                  >
                    <div className="user-avatar" style={{ background: u.avatarBg || '#6c63ff' }}>
                      {u.initials}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{u.name}</div>
                      <div className="user-promotion">{u.promotion || 'Étudiant'}</div>
                    </div>
                    <button className="start-chat-btn">💬</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
