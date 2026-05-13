// src/pages/FeedPage.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', groupId: '' });
  const [commentText, setCommentText] = useState({});
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [showCommentInput, setShowCommentInput] = useState({});
  const [posting, setPosting] = useState(false);
  const [filterGroup, setFilterGroup] = useState('all');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) loadFeed();
  }, [user]);

  useEffect(() => {
    filterPosts();
  }, [posts, filterGroup]);

  const loadFeed = async () => {
    setLoading(true);
    
    // Charger les groupes de l'utilisateur
    const gResult = await groupService.getUserGroups(user.uid);
    if (gResult.success) {
      setGroups(gResult.data);
      const groupIds = gResult.data.map(g => g.id);
      
      // Charger les publications
      const pResult = await postService.getFeedPosts(user.uid, groupIds);
      if (pResult.success) {
        setPosts(pResult.data);
      }
    }
    
    setLoading(false);
  };

  const filterPosts = () => {
    if (filterGroup === 'all') {
      return;
    }
    // Le filtrage se fait dans l'affichage
  };

  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'Groupe';
  };

  const getGroupBg = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group?.bg || '#6c63ff';
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) {
      alert('Le message ne peut pas être vide');
      return;
    }
    if (!newPost.groupId) {
      alert('Veuillez sélectionner un groupe');
      return;
    }
    
    setPosting(true);
    
    const result = await postService.createPost({
      groupId: newPost.groupId,
      authorId: user.uid,
      authorName: user.name,
      authorInitials: user.initials,
      authorAvatarBg: user.avatarBg || '#6c63ff',
      content: newPost.content.trim(),
      type: 'chat'
    });
    
    if (result.success) {
      setNewPost({ content: '', groupId: '' });
      setShowCreatePost(false);
      loadFeed();
    } else {
      alert('Erreur lors de la création du post');
    }
    
    setPosting(false);
  };

  const toggleLike = async (postId) => {
    const result = await postService.toggleLike(postId, user.uid);
    if (result.success) {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { 
          ...p, 
          likes: result.liked ? (p.likes || 0) + 1 : (p.likes || 0) - 1, 
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
      if (newState[postId]) {
        loadComments(postId);
      }
      return newState;
    });
  };

  const toggleCommentInput = (postId) => {
    setShowCommentInput(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const submitComment = async (postId) => {
    const text = commentText[postId];
    if (!text?.trim()) return;

    await postService.addComment(postId, {
      userId: user.uid,
      userName: user.name,
      userInitials: user.initials,
      userAvatarBg: user.avatarBg || '#6c63ff',
      content: text
    });

    setCommentText(prev => ({ ...prev, [postId]: '' }));
    setShowCommentInput(prev => ({ ...prev, [postId]: false }));
    loadComments(postId);
    loadFeed();
  };

  const handleKeyPress = (e, postId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment(postId);
    }
  };

  const getFilteredPosts = () => {
    if (filterGroup === 'all') {
      return posts;
    }
    return posts.filter(post => post.groupId === filterGroup);
  };

  const filteredPosts = getFilteredPosts();

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <Navbar />
      
      <div className="feed-container">
        {/* Sidebar gauche - Mes groupes */}
        <aside className="feed-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-header">
              <h3>📁 Mes groupes</h3>
              <Link to="/explore" className="explore-link">+ Explorer</Link>
            </div>
            
            <div className="groups-list">
              <button 
                className={`group-item ${filterGroup === 'all' ? 'active' : ''}`}
                onClick={() => setFilterGroup('all')}
              >
                <span className="group-icon">🌐</span>
                <span className="group-name">Tous les groupes</span>
                <span className="group-count">{posts.length}</span>
              </button>
              
              {groups.map(g => (
                <button
                  key={g.id}
                  className={`group-item ${filterGroup === g.id ? 'active' : ''}`}
                  onClick={() => setFilterGroup(g.id)}
                >
                  <div className="group-avatar" style={{ background: g.bg || '#6c63ff' }}>
                    {g.name?.charAt(0)}
                  </div>
                  <span className="group-name">{g.name}</span>
                  <span className="group-count">
                    {posts.filter(p => p.groupId === g.id).length}
                  </span>
                </button>
              ))}
            </div>
            
            <Link to="/create-group" className="create-group-btn">
              + Créer un groupe
            </Link>
          </div>
        </aside>

        {/* Feed principal */}
        <main className="feed-main">
          {/* Bouton création publication */}
          <div className="create-post-card">
            <div className="create-post-input">
              <div className="user-avatar" style={{ background: user?.avatarBg || '#6c63ff' }}>
                {user?.initials || 'U'}
              </div>
              <button 
                className="create-post-btn"
                onClick={() => setShowCreatePost(true)}
              >
                Quoi de neuf, {user?.name?.split(' ')[0]} ?
              </button>
            </div>
          </div>

          {/* Modal création publication */}
          {showCreatePost && (
            <div className="modal-overlay" onClick={() => setShowCreatePost(false)}>
              <div className="modal modal-post" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>✏️ Créer une publication</h3>
                  <button className="modal-close" onClick={() => setShowCreatePost(false)}>✕</button>
                </div>
                
                <form onSubmit={handleCreatePost}>
                  <div className="form-group">
                    <label>Groupe *</label>
                    <select
                      className="input"
                      value={newPost.groupId}
                      onChange={(e) => setNewPost({ ...newPost, groupId: e.target.value })}
                      required
                    >
                      <option value="">Sélectionner un groupe</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Message</label>
                    <textarea
                      className="input"
                      rows="4"
                      placeholder="Partagez quelque chose avec votre groupe..."
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    />
                  </div>
                  
                  <div className="modal-buttons">
                    <button type="button" className="btn-secondary" onClick={() => setShowCreatePost(false)}>
                      Annuler
                    </button>
                    <button type="submit" className="btn-primary" disabled={posting}>
                      {posting ? 'Publication...' : '📤 Publier'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Liste des publications */}
          {filteredPosts.length === 0 ? (
            <div className="empty-feed">
              <div className="empty-icon">📝</div>
              <h3>Aucune publication</h3>
              <p>Rejoignez des groupes pour voir des publications</p>
              <Link to="/explore" className="btn btn-primary">
                Explorer les groupes
              </Link>
            </div>
          ) : (
            <div className="posts-list">
              {filteredPosts.map(post => (
                <div key={post.id} className="post-card">
                  {/* En-tête */}
                  <div className="post-header">
                    <div className="post-author">
                      <div className="author-avatar" style={{ background: post.authorAvatarBg || '#6c63ff' }}>
                        {post.authorInitials}
                      </div>
                      <div className="author-info">
                        <strong>{post.authorName}</strong>
                        <div className="post-meta">
                          <span className="post-time">{post.time}</span>
                          <span className="post-group" style={{ background: getGroupBg(post.groupId) }}>
                            📢 {getGroupName(post.groupId)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="post-content">
                    <p>{post.content}</p>
                  </div>

                  {/* Actions */}
                  <div className="post-actions">
                    <button 
                      className={`action-btn like ${(post.likedBy || []).includes(user.uid) ? 'active' : ''}`}
                      onClick={() => toggleLike(post.id)}
                    >
                      {(post.likedBy || []).includes(user.uid) ? '❤️' : '🤍'} 
                      <span>{post.likes || 0}</span>
                    </button>
                    <button 
                      className="action-btn comment"
                      onClick={() => toggleComments(post.id)}
                    >
                      💬 <span>{post.comments || 0}</span>
                    </button>
                  </div>

                  {/* Section commentaires */}
                  {showComments[post.id] && (
                    <div className="comments-section">
                      {/* Liste des commentaires */}
                      <div className="comments-list">
                        {(comments[post.id] || []).map(comment => (
                          <div key={comment.id} className="comment-item">
                            <div className="comment-avatar" style={{ background: comment.userAvatarBg || '#6c63ff' }}>
                              {comment.userInitials}
                            </div>
                            <div className="comment-bubble">
                              <strong>{comment.userName}</strong>
                              <p>{comment.content}</p>
                              <span className="comment-time">{comment.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Input commentaire */}
                      {showCommentInput[post.id] ? (
                        <div className="comment-input-wrapper">
                          <div className="comment-avatar" style={{ background: user?.avatarBg || '#6c63ff' }}>
                            {user?.initials || 'U'}
                          </div>
                          <div className="comment-input-container">
                            <textarea
                              className="comment-input"
                              placeholder="Écrire un commentaire..."
                              value={commentText[post.id] || ''}
                              onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyPress={(e) => handleKeyPress(e, post.id)}
                              rows="1"
                            />
                            <button 
                              className="comment-send"
                              onClick={() => submitComment(post.id)}
                            >
                              Envoyer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          className="add-comment-btn"
                          onClick={() => toggleCommentInput(post.id)}
                        >
                          💬 Ajouter un commentaire
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Sidebar droite - Suggestions */}
        <aside className="feed-sidebar-right">
          <div className="sidebar-card">
            <h3>👥 Suggestions</h3>
            <div className="suggestions-list">
              <div className="suggestion-item">
                <div className="suggestion-avatar" style={{ background: '#10b981' }}>
                  📚
                </div>
                <div className="suggestion-info">
                  <strong>Groupe d'étude L2</strong>
                  <span>234 membres</span>
                </div>
                <button className="suggest-join">Rejoindre</button>
              </div>
              <div className="suggestion-item">
                <div className="suggestion-avatar" style={{ background: '#f59e0b' }}>
                  ⚽
                </div>
                <div className="suggestion-info">
                  <strong>Sport Campus</strong>
                  <span>89 membres</span>
                </div>
                <button className="suggest-join">Rejoindre</button>
              </div>
            </div>
            <Link to="/explore" className="more-link">Voir plus →</Link>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FeedPage;
