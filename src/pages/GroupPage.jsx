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
      
      if (user && user.uid) {
        const mResult = await groupService.checkMembership(id, user.uid);
        if (mResult && mResult.success && mResult.data) {
          setIsMember(mResult.data.isMember || false);
        } else {
          setIsMember(false);
        }
      }
    }

    const pResult = await postService.getGroupPosts(id);
    if (pResult.success) setPosts(pResult.data);
    setLoading(false);
  };

  const joinGroup = async () => {
    const result = await groupService.joinGroup(id, user.uid);
    if (result.success) {
      setIsMember(true);
      loadGroup();
    }
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

        <div className="group-messages">
          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <div className="empty-title">Aucun message</div>
              <div className="empty-sub">Soyez le premier à écrire !</div>
            </div>
          ) : (
            posts.map(post => (
              <div
                key={post.id}
                className={`msg-row ${post.authorId === user.uid ? 'mine' : 'theirs'}`}
              >
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
