import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/groupService';
import { postService } from '../services/postService';
import Navbar from '../components/Navbar';
import './GroupPage.css';

const GroupPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadGroup();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts]);

  const loadGroup = async () => {
    const gResult = await groupService.getGroup(id);
    if (gResult.success) {
      setGroup(gResult.data);
      const mResult = await groupService.checkMembership(id, user.uid);
      if (mResult.success) {
        setIsMember(mResult.data.isMember);
        setIsAdmin(mResult.data.isAdmin);
      }
    }

    const pResult = await postService.getGroupPosts(id);
    if (pResult.success) setPosts(pResult.data);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    await postService.createPost({
      groupId: id,
      authorId: user.uid,
      authorName: user.name,
      authorInitials: user.initials,
      authorAvatarBg: user.avatarBg || '#1B4FD8',
      content: message.trim(),
      type: 'chat'
    });

    setMessage('');
    loadGroup();
  };

  const joinGroup = async () => {
    const result = await groupService.requestJoin(id, user.uid);
    if (result.success) {
      if (result.requestSent) alert('✅ Demande envoyée !');
      if (result.alreadyRequested) alert('⏳ Demande déjà en attente');
      loadGroup();
    }
  };

  const approveMember = async (memberId) => {
    await groupService.approveRequest(id, memberId);
    loadGroup();
  };

  const rejectMember = async (memberId) => {
    await groupService.rejectRequest(id, memberId);
    loadGroup();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="group-page">
      <Navbar />
      <div className="group-layout">
        <div className="group-header">
          <Link to="/feed" className="back-btn">←</Link>
          <div className="avatar" style={{ background: group?.bg || '#1B4FD8' }}>
            {group?.name?.charAt(0)}
          </div>
          <div className="group-header-info">
            <h2>{group?.name}</h2>
            <span>{group?.members} membres</span>
          </div>
          {!isMember && (
            <button className="btn btn-primary" onClick={joinGroup}>
              Rejoindre
            </button>
          )}
        </div>

        {isAdmin && group?.pendingRequests?.length > 0 && (
          <div style={{ padding: '1rem', background: 'var(--orange-light)', margin: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <strong>⏳ Demandes en attente ({group.pendingRequests.length})</strong>
            {group.pendingRequests.map(memberId => (
              <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem' }}>{memberId}</span>
                <button className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: 'var(--green)', color: '#fff', borderRadius: '100px' }} onClick={() => approveMember(memberId)}>✓ Accepter</button>
                <button className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: 'var(--red)', color: '#fff', borderRadius: '100px' }} onClick={() => rejectMember(memberId)}>✗ Refuser</button>
              </div>
            ))}
          </div>
        )}

        <div className="group-messages">
          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <div className="empty-title">Aucun message</div>
              <div className="empty-sub">Soyez le premier à écrire !</div>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className={`msg-row ${post.authorId === user.uid ? 'mine' : 'theirs'}`}>
                {post.authorId !== user.uid && (
                  <div className="avatar avatar-sm" style={{ background: post.authorAvatarBg }}>
                    {post.authorInitials}
                  </div>
                )}
                <div className={`msg-bubble ${post.authorId === user.uid ? 'mine' : 'theirs'}`}>
                  {post.authorId !== user.uid && (
                    <div className="msg-author">{post.authorName}</div>
                  )}
                  <div className="msg-text">{post.content}</div>
                  <div className="msg-time">{post.time}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {isMember && (
          <div className="group-input">
            <input
              className="input"
              placeholder="Écrire un message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button className="btn btn-primary" onClick={sendMessage}>
              Envoyer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupPage;
