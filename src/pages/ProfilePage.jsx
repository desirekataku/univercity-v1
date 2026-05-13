// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { groupService } from '../services/groupService';
import { messageService } from '../services/messageService';
import { resourceService } from '../services/resourceService';
import Navbar from '../components/Navbar';
import './ProfilePage.css';

const ProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', promotion: '' });
  const [activeTab, setActiveTab] = useState('resources'); // resources, groups, friends
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const targetUserId = userId || currentUser?.uid;
  const isOwnProfile = !userId || userId === currentUser?.uid;

  useEffect(() => {
    if (targetUserId) {
      loadProfile();
    }
  }, [targetUserId]);

  const loadProfile = async () => {
    setLoading(true);
    
    // Charger profil utilisateur
    const result = await userService.getUser(targetUserId);
    if (result.success) {
      setProfile(result.data);
      setEditForm({ 
        name: result.data.name || '', 
        bio: result.data.bio || '', 
        promotion: result.data.promotion || '' 
      });
      setFollowersCount(result.data.followers || 0);
      setFollowingCount(result.data.following || 0);
      setIsFollowing(result.data.isFollowing || false);
    }

    // Charger groupes de l'utilisateur
    const gResult = await groupService.getUserGroups(targetUserId);
    if (gResult.success) {
      setGroups(gResult.data);
    }

    // Charger amis/abonnements
    const fResult = await userService.getFriends(targetUserId);
    if (fResult.success) {
      setFriends(fResult.data);
    }
    
    // Charger ressources de l'utilisateur
    const rResult = await resourceService.getResources();
    if (rResult.success) {
      const userResources = rResult.data.filter(r => r.uploadedBy === targetUserId);
      setResources(userResources);
    }
    
    setLoading(false);
  };

  const handleFollow = async () => {
    const result = await userService.followUser(currentUser.uid, targetUserId);
    if (result.success) {
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    }
  };

  const handleUnfollow = async () => {
    const result = await userService.unfollowUser(currentUser.uid, targetUserId);
    if (result.success) {
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
    }
  };

  const handleMessage = async () => {
    const result = await messageService.getOrCreateConversation(currentUser.uid, targetUserId);
    if (result.success) {
      navigate('/messages');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const initials = editForm.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    await userService.updateUser(targetUserId, { 
      name: editForm.name, 
      initials, 
      bio: editForm.bio, 
      promotion: editForm.promotion 
    });
    setEditModal(false);
    loadProfile();
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <Navbar />
        <div className="error-container">
          <div className="error-icon">😕</div>
          <h2>Utilisateur non trouvé</h2>
          <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Navbar />
      
      <div className="profile-container">
        {/* Section profil principal */}
        <div className="profile-header-card">
          <div className="profile-cover">
            <div className="profile-avatar-large" style={{ background: profile.avatarBg || '#6c63ff' }}>
              {profile.initials || profile.name?.charAt(0) || 'U'}
            </div>
          </div>
          
          <div className="profile-info">
            <h1 className="profile-name">{profile.name}</h1>
            {profile.promotion && (
              <p className="profile-promotion">🎓 {profile.promotion}</p>
            )}
            <p className="profile-bio">{profile.bio || 'Aucune bio pour le moment'}</p>
            
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{resources.length}</span>
                <span className="stat-label">ressources</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{followersCount}</span>
                <span className="stat-label">abonnés</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{followingCount}</span>
                <span className="stat-label">abonnements</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{groups.length}</span>
                <span className="stat-label">groupes</span>
              </div>
            </div>
            
            <div className="profile-actions">
              {isOwnProfile ? (
                <>
                  <button className="btn-edit" onClick={() => setEditModal(true)}>
                    ✏️ Modifier le profil
                  </button>
                  <button className="btn-logout" onClick={() => setShowLogoutConfirm(true)}>
                    🚪 Déconnexion
                  </button>
                </>
              ) : (
                <>
                  {isFollowing ? (
                    <button className="btn-following" onClick={handleUnfollow}>
                      ✓ Suivi
                    </button>
                  ) : (
                    <button className="btn-follow" onClick={handleFollow}>
                      + Suivre
                    </button>
                  )}
                  <button className="btn-message" onClick={handleMessage}>
                    💬 Message
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="profile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            📚 Ressources ({resources.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            🏛️ Groupes ({groups.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            👥 Amis ({friends.length})
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="profile-content">
          {activeTab === 'resources' && (
            <>
              {resources.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>Aucune ressource</h3>
                  <p>Cet utilisateur n'a pas encore partagé de ressources</p>
                </div>
              ) : (
                <div className="resources-grid">
                  {resources.map(resource => (
                    <div key={resource.id} className="resource-card-mini">
                      <div className="resource-icon">
                        {resource.type === 'pdf' ? '📄' : resource.type === 'image' ? '🖼️' : '📎'}
                      </div>
                      <div className="resource-info">
                        <h4>{resource.title}</h4>
                        <div className="resource-stats">
                          <span>❤️ {resource.likes || 0}</span>
                          <span>📥 {resource.downloads || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'groups' && (
            <>
              {groups.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏛️</div>
                  <h3>Aucun groupe</h3>
                  <p>Cet utilisateur n'a pas encore rejoint de groupe</p>
                </div>
              ) : (
                <div className="groups-grid">
                  {groups.map(group => (
                    <Link key={group.id} to={`/group/${group.id}`} className="group-card-mini">
                      <div className="group-avatar" style={{ background: group.bg || '#6c63ff' }}>
                        {group.name?.charAt(0)}
                      </div>
                      <div className="group-info">
                        <h4>{group.name}</h4>
                        <span className="group-members">👥 {group.members} membres</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'friends' && (
            <>
              {friends.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3>Aucun ami</h3>
                  <p>Cet utilisateur n'a pas encore d'amis</p>
                </div>
              ) : (
                <div className="friends-grid">
                  {friends.map(friend => (
                    <Link key={friend.id} to={`/profile/${friend.uid}`} className="friend-card">
                      <div className="friend-avatar" style={{ background: friend.avatarBg || '#6c63ff' }}>
                        {friend.initials}
                      </div>
                      <div className="friend-info">
                        <h4>{friend.name}</h4>
                        <span className="friend-promotion">{friend.promotion || 'Étudiant'}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal modification profil */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Modifier le profil</h3>
              <button className="modal-close" onClick={() => setEditModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>Nom complet</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Promotion</label>
                <select
                  className="input"
                  value={editForm.promotion}
                  onChange={(e) => setEditForm({ ...editForm, promotion: e.target.value })}
                >
                  <option value="">Sélectionner une promotion</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                  <option value="M1">M1</option>
                  <option value="M2">M2</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  className="input"
                  rows="3"
                  placeholder="Parle un peu de toi..."
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                />
              </div>
              
              <div className="modal-buttons">
                <button type="button" className="btn-secondary" onClick={() => setEditModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation déconnexion */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚪 Déconnexion</h3>
              <button className="modal-close" onClick={() => setShowLogoutConfirm(false)}>✕</button>
            </div>
            <p>Es-tu sûr de vouloir te déconnecter ?</p>
            <div className="modal-buttons">
              <button className="btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
                Annuler
              </button>
              <button className="btn-danger" onClick={handleLogout}>
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
