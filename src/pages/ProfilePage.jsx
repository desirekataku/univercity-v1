import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { groupService } from '../services/groupService';
import { messageService } from '../services/messageService';
import Navbar from '../components/Navbar';
import './ProfilePage.css';

const ProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', promotion: '' });
  const [isFollowing, setIsFollowing] = useState(false);

  const targetUserId = userId || currentUser?.uid;
  const isOwnProfile = !userId || userId === currentUser?.uid;

  useEffect(() => {
    if (targetUserId) loadProfile();
  }, [targetUserId]);

  const loadProfile = async () => {
    const result = await userService.getUser(targetUserId);
    if (result.success) {
      setProfile(result.data);
      setEditForm({ name: result.data.name || '', bio: result.data.bio || '', promotion: result.data.promotion || '' });
    }

    const gResult = await groupService.getUserGroups(targetUserId);
    if (gResult.success) setGroups(gResult.data);

    const fResult = await userService.getFriends(targetUserId);
    if (fResult.success) setFriends(fResult.data);

    setLoading(false);
  };

  const handleFollow = async () => {
    await userService.followUser(currentUser.uid, targetUserId);
    setIsFollowing(true);
  };

  const handleUnfollow = async () => {
    await userService.unfollowUser(currentUser.uid, targetUserId);
    setIsFollowing(false);
  };

  const handleMessage = async () => {
    const result = await messageService.getOrCreateConversation(currentUser.uid, targetUserId);
    if (result.success) {
      navigate(`/messages`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const initials = editForm.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    await userService.updateUser(targetUserId, { name: editForm.name, initials, bio: editForm.bio, promotion: editForm.promotion });
    setEditModal(false);
    loadProfile();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="profile-page">
      <Navbar />
      <div className="app-layout">
        <aside className="sidebar-left">
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Mes groupes</h3>
            {groups.map(g => (
              <Link key={g.id} to={`/group/${g.id}`} style={{ display: 'block', padding: '0.4rem 0', fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none', color: 'var(--blue)' }}>
                {g.name}
              </Link>
            ))}
          </div>
        </aside>

        <main>
          <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div className="avatar avatar-lg" style={{ background: profile?.avatarBg || '#1B4FD8', margin: '0 auto 1rem', width: '80px', height: '80px', fontSize: '1.5rem' }}>
              {profile?.initials}
            </div>
            <h2>{profile?.name}</h2>
            <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
              {profile?.promotion && `${profile.promotion}`}
            </p>
            <p style={{ marginBottom: '1rem' }}>{profile?.bio || 'Aucune bio'}</p>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              👥 {profile?.followers || 0} abonnés · {profile?.following || 0} abonnements
            </p>

            {isOwnProfile ? (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button className="btn btn-primary" onClick={() => setEditModal(true)}>✏️ Modifier</button>
                <button className="btn btn-outline" onClick={handleLogout}>🚪 Déconnexion</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                {isFollowing ? (
                  <button className="btn btn-outline" onClick={handleUnfollow}>✓ Suivi</button>
                ) : (
                  <button className="btn btn-primary" onClick={handleFollow}>👥 Suivre</button>
                )}
                <button className="btn btn-primary" onClick={handleMessage}>💬 Message</button>
              </div>
            )}
          </div>

          {/* Amis */}
          <h3 style={{ marginBottom: '1rem' }}>👥 Amis ({friends.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {friends.slice(0, 6).map(f => (
              <Link key={f.id} to={`/profile/${f.uid}`} className="card" style={{ padding: '0.75rem', textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
                <div className="avatar" style={{ background: f.avatarBg || '#1B4FD8', margin: '0 auto 0.5rem' }}>{f.initials}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.name}</div>
              </Link>
            ))}
          </div>

          {/* Groupes */}
          <h3 style={{ marginBottom: '1rem' }}>🏛️ Groupes ({groups.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {groups.map(g => (
              <Link key={g.id} to={`/group/${g.id}`} className="card" style={{ padding: '1rem', textDecoration: 'none', color: 'inherit' }}>
                <div className="avatar" style={{ background: g.bg || '#1B4FD8', marginBottom: '0.5rem' }}>{g.name?.charAt(0)}</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.name}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{g.members} membres</div>
              </Link>
            ))}
          </div>
        </main>
      </div>

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title"><span>✏️ Modifier le profil</span><button className="modal-close" onClick={() => setEditModal(false)}>✕</button></div>
            <form onSubmit={handleEdit}>
              <div className="form-group"><label>Nom complet</label><input className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div className="form-group"><label>Promotion</label><select className="input" value={editForm.promotion} onChange={e => setEditForm({ ...editForm, promotion: e.target.value })}><option value="">Sélectionner</option><option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option><option value="M1">M1</option><option value="M2">M2</option></select></div>
              <div className="form-group"><label>Bio</label><textarea className="input" rows="3" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} /></div>
              <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => setEditModal(false)}>Annuler</button><button type="submit" className="btn-save">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
