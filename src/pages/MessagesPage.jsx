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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      const unsubscribe = messageService.subscribeToMessages(activeConv.id, (msgs) => {
        setMessages(msgs);
        scrollToBottom();
      });
      return unsubscribe;
    }
  }, [activeConv]);

  const loadConversations = async () => {
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
  };

  const loadMessages = async (convId) => {
    const result = await messageService.getMessages(convId);
    if (result.success) setMessages(result.data);
    scrollToBottom();
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    await messageService.sendMessage(activeConv.id, {
      senderId: user.uid,
      content: text.trim(),
      type: 'text'
    });
    setText('');
  };

  const startConversation = async (otherUserId) => {
    const result = await messageService.getOrCreateConversation(user.uid, otherUserId);
    if (result.success) {
      setActiveConv(result.data);
      setShowNewConv(false);
      loadConversations();
    }
  };

  const searchUsers = async () => {
    if (!searchUser.trim()) return;
    const result = await userService.searchUsers(searchUser);
    if (result.success) {
      setSearchResults(result.data.filter(u => u.uid !== user.uid));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getOtherUser = (conv) => {
    const otherId = conv.participants?.find(id => id !== user.uid);
    return users[otherId] || { name: 'Utilisateur', initials: 'U' };
  };

  return (
    <div className="messages-page">
      <Navbar />
      <div className="msg-layout">
        {/* Sidebar conversations */}
        <div className="conv-sidebar">
          <div className="conv-sidebar-header">
            <h3>Messages</h3>
            <button className="btn btn-primary" onClick={() => setShowNewConv(true)}>+</button>
          </div>
          <div className="conv-list">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                onClick={() => setActiveConv(conv)}
              >
                <div className="avatar" style={{ background: getOtherUser(conv).avatarBg || '#1B4FD8' }}>
                  {getOtherUser(conv).initials}
                </div>
                <div className="conv-info">
                  <div className="conv-name">{getOtherUser(conv).name}</div>
                  <div className="conv-preview">{conv.lastMessage || 'Nouvelle conversation'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="chat-area">
          {activeConv ? (
            <>
              <div className="chat-header">
                <div className="avatar" style={{ background: getOtherUser(activeConv).avatarBg || '#1B4FD8' }}>
                  {getOtherUser(activeConv).initials}
                </div>
                <strong>{getOtherUser(activeConv).name}</strong>
              </div>
              <div className="chat-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`chat-msg ${msg.senderId === user.uid ? 'mine' : 'theirs'}`}>
                    <div className={`chat-bubble ${msg.senderId === user.uid ? 'mine' : 'theirs'}`}>
                      {msg.content}
                      <div className="chat-time">
                        {msg.createdAt?.toDate?.().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input">
                <input
                  className="input"
                  placeholder="Écrire un message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button className="btn btn-primary" onClick={sendMessage}>Envoyer</button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <div className="empty-title">Sélectionnez une conversation</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nouvelle conversation */}
      {showNewConv && (
        <div className="modal-overlay" onClick={() => setShowNewConv(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <span>Nouvelle conversation</span>
              <button className="modal-close" onClick={() => setShowNewConv(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                className="input"
                placeholder="Rechercher un étudiant..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              />
              <button className="btn btn-primary" onClick={searchUsers}>Chercher</button>
            </div>
            {searchResults.map(u => (
              <div
                key={u.id}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                onClick={() => startConversation(u.uid)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-pale)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="avatar" style={{ background: u.avatarBg || '#1B4FD8' }}>{u.initials}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{u.promotion || 'Étudiant'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;

