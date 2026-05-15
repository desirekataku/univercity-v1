// src/pages/MessagesPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../services/messageService';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
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
  const [showConversations, setShowConversations] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Détecter la taille de l'écran
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowConversations(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    // Nettoyer la subscription précédente
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (activeConv) {
      loadMessages(activeConv.id);
      
      // Marquer tous les messages comme lus
      const markAsRead = async () => {
        try {
          if (messageService.markConversationAsRead) {
            await messageService.markConversationAsRead(activeConv.id, user.uid);
          }
          if (window.updateUnreadCount) {
            window.updateUnreadCount();
          }
        } catch (error) {
          console.error('Erreur markAsRead:', error);
        }
      };
      markAsRead();
      
      // S'abonner aux nouveaux messages
      unsubscribeRef.current = messageService.subscribeToMessages(activeConv.id, (msgs) => {
        setMessages(msgs);
        scrollToBottom();
      });
    }
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [activeConv, user]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const result = await messageService.getUserConversations(user.uid);
      if (result.success) {
        setConversations(result.data);
        const usersMap = {};
        for (const conv of result.data) {
          if (!conv.isGroup) {
            const otherId = conv.participants.find(id => id !== user.uid);
            if (otherId && !usersMap[otherId]) {
              const uResult = await userService.getUser(otherId);
              if (uResult.success) usersMap[otherId] = uResult.data;
            }
          }
        }
        setUsers(usersMap);
      }
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const result = await messageService.getMessages(convId);
      if (result.success) setMessages(result.data);
      scrollToBottom();
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      // Valeurs par défaut pour éviter les undefined
      const senderName = user?.name || 'Utilisateur';
      const senderInitials = user?.initials || (senderName.charAt(0) || 'U');
      const senderAvatarBg = user?.avatarBg || '#1B4FD8';
      
      await messageService.sendMessage(activeConv.id, {
        senderId: user.uid,
        senderName: senderName,
        senderInitials: senderInitials,
        senderAvatarBg: senderAvatarBg,
        content: text.trim(),
        type: 'text'
      });
      setText('');
      scrollToBottom();
    } catch (error) {
      console.error('Erreur envoi message:', error);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  const startConversation = async (otherUserId) => {
    try {
      const result = await messageService.getOrCreateConversation(user.uid, otherUserId);
      if (result.success) {
        setActiveConv(result.data);
        setShowNewConv(false);
        if (isMobile) {
          setShowConversations(false);
        }
        loadConversations();
      }
    } catch (error) {
      console.error('Erreur démarrage conversation:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchUser.trim()) return;
    try {
      const result = await userService.searchUsers(searchUser);
      if (result.success) {
        setSearchResults(result.data.filter(u => u.uid !== user.uid));
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getOtherUser = (conv) => {
    const otherId = conv.participants?.find(id => id !== user.uid);
    const otherUser = users[otherId];
    return {
      name: otherUser?.name || 'Utilisateur',
      initials: otherUser?.initials || 'U',
      avatarBg: otherUser?.avatarBg || '#1B4FD8',
      promotion: otherUser?.promotion || 'Étudiant'
    };
  };

  const handleSelectConversation = (conv) => {
    setActiveConv(conv);
    if (isMobile) {
      setShowConversations(false);
    }
  };

  const handleBackToList = () => {
    setShowConversations(true);
    setActiveConv(null);
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
      <div className={`messages-container ${!showConversations && isMobile ? 'has-active-conv' : ''}`}>
        
        {/* Sidebar des conversations */}
        {(showConversations || !isMobile) && (
          <div className="conversations-sidebar">
            <div className="sidebar-header">
              <h2>Messages</h2>
              <button className="new-chat-btn" onClick={() => setShowNewConv(true)}>+</button>
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
                  return (
                    <div
                      key={conv.id}
                      className={`conversation-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="conv-avatar" style={{ background: otherUser.avatarBg }}>
                        {otherUser.initials}
                      </div>
                      <div className="conv-info">
                        <div className="conv-name">{otherUser.name}</div>
                        <div className="conv-preview">{conv.lastMessage || 'Nouvelle conversation'}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
        
        {/* Zone de chat */}
        <div className="chat-area">
          {activeConv ? (
            <>
              {isMobile && (
                <div className="back-to-conversations" onClick={handleBackToList}>
                  <span>←</span> Retour aux conversations
                </div>
              )}
              <div className="chat-header">
                <div className="chat-user-info">
                  <div className="chat-avatar" style={{ background: getOtherUser(activeConv).avatarBg }}>
                    {getOtherUser(activeConv).initials}
                  </div>
                  <div>
                    <h3>{getOtherUser(activeConv).name}</h3>
                    <span className="user-status">En ligne</span>
                  </div>
                </div>
              </div>
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="empty-messages">
                    <div className="empty-icon">💬</div>
                    <p>Aucun message</p>
                    <p className="empty-sub">Soyez le premier à envoyer un message</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message-row ${msg.senderId === user.uid ? 'mine' : 'theirs'}`}
                    >
                      {msg.senderId !== user.uid && (
                        <div
                          className="message-avatar"
                          style={{ background: msg.senderAvatarBg || '#1B4FD8' }}
                        >
                          {msg.senderInitials || 'U'}
                        </div>
                      )}
                      <div className={`message-bubble ${msg.senderId === user.uid ? 'mine' : 'theirs'}`}>
                        <div className="message-text">{msg.content}</div>
                        <div className="message-time">
                          {msg.createdAt?.toDate
                            ? msg.createdAt.toDate().toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-area">
                <textarea
                  className="message-input"
                  placeholder="Écrire un message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows="1"
                />
                <button className="send-btn" onClick={sendMessage} disabled={!text.trim()}>
                  ➤
                </button>
              </div>
            </>
          ) : (
            <div className="no-conversation">
              <div className="no-conversation-icon">💬</div>
              <h3>Sélectionnez une conversation</h3>
              <p>Choisissez un ami pour commencer à discuter</p>
              <button className="btn-new-chat" onClick={() => setShowNewConv(true)}>
                + Nouvelle conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal nouvelle conversation */}
      {showNewConv && (
        <div className="modal-overlay" onClick={() => setShowNewConv(false)}>
          <div className="modal new-conv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <span>Nouvelle conversation</span>
              <button className="modal-close" onClick={() => setShowNewConv(false)}>
                ✕
              </button>
            </div>
            <div className="search-users">
              <div className="search-bar">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Rechercher un étudiant..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                />
                <button className="search-btn" onClick={searchUsers}>
                  Chercher
                </button>
              </div>
              <div className="search-results">
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="user-result"
                    onClick={() => startConversation(u.uid)}
                  >
                    <div
                      className="user-avatar"
                      style={{ background: u.avatarBg || '#1B4FD8' }}
                    >
                      {u.initials}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{u.name}</div>
                      <div className="user-promotion">{u.promotion || 'Étudiant'}</div>
                    </div>
                    <button className="start-chat-btn">💬</button>
                  </div>
                ))}
                {searchResults.length === 0 && searchUser && (
                  <div className="no-results">Aucun utilisateur trouvé</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
