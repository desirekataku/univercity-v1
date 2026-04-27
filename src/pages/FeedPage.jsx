import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/groupService';
import { postService } from '../services/postService';
import Navbar from '../components/Navbar';
import './FeedPage.css';

const FeedPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState({});
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});

  useEffect(() => {
    if (user) loadFeed();
  }, [user]);

  const loadFeed = async () => {
    const gResult = await groupService.getUserGroups(user.uid);
    if (gResult.success) {
      setGroups(gResult.data);
      const groupIds = gResult.data.map(g => g.id);
      const pResult = await postService.getFeedPosts(user.uid, groupIds);
      if (pResult.success) setPosts(pResult.data);
    }
    setLoading(false);
  };

  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'Groupe';
  };

  const getGroupBg = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group?.bg || '#1B4FD8';
  };

  const toggleLike = async (postId) => {
    const result = await postService.toggleLike(postId, user.uid);
    if (result.success) {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { 
          ...p, 
          likes: result.liked ? p.likes + 1 : p.likes - 1, 
          likedBy: result.liked ? [...(p.likedBy || []), user.uid] : (p.likedBy || []).filter(id => id !== user.uid) 
        } : p
      ));
    }
  };

  const loadComments = async (postId) => {
    const result = await postService.getComments(postId);
    if (result.success) {
      setComments(prev => ({ ...prev, [postId]: result.data }));
    }
  };

  const toggleComments = (postId) => {
    setShowComments(prev => {
      const newState = { ...prev, [postId]: !prev[postId] };
      if (newState[postId]) loadComments(postId);
      return newState;
    });
  };

  const submitComment = async (postId) => {
    const text = commentText[postId];
    if (!text?.trim()) return;

    await postService.addComment(postId, {
      userId: user.uid,
      userName: user.name,
      userInitials: user.initials,
      content: text
    });

    setCommentText(prev => ({ ...prev, [postId]: '' }));
    loadComments(postId);
    loadFeed();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="feed-page">
      <Navbar />
      <div className="app-layout">
        <aside className="sidebar-left">
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Mes groupes</h3>
            {groups.map(g => (
              <Link key={g.id} to={`/group/${g.id}`} className="group-mini">
                <div className="avatar" style={{ background: g.bg || '#1B4FD8' }}>{g.name?.charAt(0)}</div>
                <div>
                  <div className="group-mini-name">{g.name}</div>
                  <div className="group-mini-meta">{g.members} membres</div>
                </div>
              </Link>
            ))}
            <Link to="/create-group" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              + Créer un groupe
            </Link>
          </div>
        </aside>

        <main>
          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-title">Aucune publication</div>
              <div className="empty-sub">Rejoignez un groupe pour voir des publications</div>
              <Link to="/explore" className="btn btn-primary">Explorer les groupes</Link>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                {/* En-tête du post */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div className="avatar" style={{ background: post.authorAvatarBg || '#1B4FD8' }}>
                    {post.authorInitials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong>{post.authorName}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>{post.time}</span>
                      <span style={{
                        background: getGroupBg(post.groupId),
                        color: '#fff',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '100px',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}>
                        📢 {getGroupName(post.groupId)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contenu du post */}
                <p style={{ marginBottom: '0.75rem' }}>{post.content}</p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <button onClick={() => toggleLike(post.id)} style={{ background: 'none', cursor: 'pointer', fontSize: '0.85rem', border: 'none' }}>
                    {(post.likedBy || []).includes(user.uid) ? '❤️' : '🤍'} {post.likes}
                  </button>
                  <button onClick={() => toggleComments(post.id)} style={{ background: 'none', cursor: 'pointer', fontSize: '0.85rem', border: 'none', color: 'var(--text-muted)' }}>
                    💬 {post.comments}
                  </button>
                </div>

                {/* Commentaires */}
                {showComments[post.id] && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    {(comments[post.id] || []).map(comment => (
                      <div key={comment.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', background: 'var(--blue-pale)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="avatar avatar-sm" style={{ background: comment.userAvatarBg || '#1B4FD8', fontSize: '0.6rem' }}>
                          {comment.userInitials}
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '0.8rem' }}>{comment.userName}</strong>
                          <p style={{ fontSize: '0.85rem', margin: '0.15rem 0' }}>{comment.content}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{comment.time}</span>
                        </div>
                      </div>
                    ))}

                    {/* Input commentaire */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        className="input"
                        placeholder="Écrire un commentaire..."
                        value={commentText[post.id] || ''}
                        onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                        style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      />
                      <button className="btn btn-primary" onClick={() => submitComment(post.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        Envoyer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
};

export default FeedPage;
