import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/groupService';
import { userService } from '../services/userService';
import Navbar from '../components/Navbar';
import './ExplorePage.css';

const ExplorePage = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const gResult = await groupService.getAllGroups();
    if (gResult.success) setGroups(gResult.data);
    
    const pResult = await userService.getSuggestedUsers(user.uid);
    if (pResult.success) setPeople(pResult.data);
    
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      loadAll();
      return;
    }
    const result = await groupService.searchGroups(search);
    if (result.success) setGroups(result.data);
  };

  const joinGroup = async (groupId) => {
    await groupService.joinGroup(groupId, user.uid);
    loadAll();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="explore-page">
      <Navbar />
      <div className="app-layout">
        <aside className="sidebar-left">
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Filtres</h3>
            <Link to="/create-group" className="btn btn-primary" style={{ width: '100%' }}>
              + Créer un groupe
            </Link>
          </div>
        </aside>

        <main>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="input"
                placeholder="Rechercher un groupe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn btn-primary" onClick={handleSearch}>Rechercher</button>
            </div>
          </div>

          <h3 style={{ marginBottom: '1rem' }}>🏛️ Groupes à découvrir</h3>
          {groups.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">Aucun groupe trouvé</div>
              <Link to="/create-group" className="btn btn-primary">Créer le premier groupe</Link>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map(group => (
                <div key={group.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="avatar avatar-lg" style={{ background: group.bg || '#1B4FD8' }}>
                      {group.name?.charAt(0)}
                    </div>
                    <div>
                      <Link to={`/group/${group.id}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'inherit' }}>
                        {group.name}
                      </Link>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>{group.members} membres</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {group.description || 'Groupe de discussion et partage'}
                  </p>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => joinGroup(group.id)}>
                    Rejoindre
                  </button>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ margin: '1.5rem 0 1rem' }}>👥 Personnes</h3>
          <div className="people-grid">
            {people.slice(0, 6).map(person => (
              <Link key={person.id} to={`/profile/${person.uid}`} className="card" style={{ padding: '1rem', textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
                <div className="avatar avatar-lg" style={{ background: person.avatarBg || '#1B4FD8', margin: '0 auto 0.5rem' }}>
                  {person.initials}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{person.name}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{person.promotion || 'Étudiant'}</div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExplorePage;

