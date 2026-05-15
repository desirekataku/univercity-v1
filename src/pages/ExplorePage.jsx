// src/pages/ExplorePage.jsx
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
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [people, setPeople] = useState([]);
  const [filteredPeople, setFilteredPeople] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [joinedGroupIds, setJoinedGroupIds] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'study', 'sport', 'art', 'tech', 'social'
  const [activeTab, setActiveTab] = useState('groups'); // 'groups' ou 'people'

  const categories = [
    { id: 'all', name: 'Tous', icon: '🌐' },
    { id: 'study', name: 'Étude', icon: '📚' },
    { id: 'sport', name: 'Sportif', icon: '⚽' },
    { id: 'art', name: 'Arts', icon: '🎨' },
    { id: 'tech', name: 'Technologie', icon: '💻' },
    { id: 'social', name: 'Sociale', icon: '👥' }
  ];

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [groups, people, search, activeFilter, activeTab]);

  const loadAll = async () => {
    setLoading(true);
    
    try {
      const gResult = await groupService.getAllGroups();
      if (gResult.success) {
        setGroups(gResult.data);
      }
      
      if (user) {
        const userGroupsResult = await groupService.getUserGroups(user.uid);
        if (userGroupsResult.success) {
          const ids = userGroupsResult.data.map(g => g.id);
          setJoinedGroupIds(ids);
        }
      }
      
      const pResult = await userService.getSuggestedUsers(user?.uid);
      if (pResult.success) setPeople(pResult.data);
      
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    // Filtre des groupes
    let filtered = [...groups];
    
    if (search.trim() && activeTab === 'groups') {
      const term = search.toLowerCase();
      filtered = filtered.filter(g => 
        g.name?.toLowerCase().includes(term) || 
        g.description?.toLowerCase().includes(term)
      );
    }
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(g => {
        const categoryMap = {
          'study': ['étude', 'revision', 'cours', 'study', 'exam'],
          'sport': ['sport', 'foot', 'basket', 'tennis', 'salle'],
          'art': ['art', 'musique', 'peinture', 'theatre', 'dessin'],
          'tech': ['tech', 'informatique', 'programmation', 'dev', 'code', 'technologie'],
          'social': ['social', 'sortie', 'soiree', 'meetup', 'amis']
        };
        
        const keywords = categoryMap[activeFilter] || [];
        const groupText = (g.name + ' ' + (g.description || '')).toLowerCase();
        return keywords.some(keyword => groupText.includes(keyword));
      });
    }
    
    setFilteredGroups(filtered);
    
    // Filtre des personnes
    let filteredPersons = [...people];
    if (search.trim() && activeTab === 'people') {
      const term = search.toLowerCase();
      filteredPersons = filteredPersons.filter(p => 
        p.name?.toLowerCase().includes(term) || 
        p.promotion?.toLowerCase().includes(term)
      );
    }
    setFilteredPeople(filteredPersons);
  };

  const joinGroup = async (groupId) => {
    try {
      const result = await groupService.joinGroup(groupId, user.uid);
      if (result.success) {
        alert('✅ Vous avez rejoint le groupe !');
        await loadAll();
      } else {
        alert('❌ ' + (result.error || 'Impossible de rejoindre'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du rejoignement');
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="explore-page">
      <Navbar />
      
      <div className="explore-container">
        {/* En-tête */}
        <div className="explore-header">
          <h1>🔍 Explorateur</h1>
          <p className="explore-subtitle">Découvrez des groupes et connectez-vous avec d'autres étudiants</p>
        </div>

        {/* Barre de recherche */}
        <div className="search-section">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder={activeTab === 'groups' ? "Rechercher un groupe..." : "Rechercher une personne..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>

        {/* Statistiques et bouton Créer groupe */}
        <div className="stats-header">
          <div className="stats-container">
            <button 
              className={`stat-tab ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('groups');
                setSearch('');
              }}
            >
              <span className="stat-icon">🏛️</span>
              <span className="stat-text">Groupes ({filteredGroups.length})</span>
            </button>
            <div className="stat-divider"></div>
            <button 
              className={`stat-tab ${activeTab === 'people' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('people');
                setSearch('');
              }}
            >
              <span className="stat-icon">👥</span>
              <span className="stat-text">Personnes ({filteredPeople.length})</span>
            </button>
          </div>
          
          {/* Bouton Créer un groupe - visible sur mobile */}
          <Link to="/create-group" className="create-group-btn-mobile">
            + Créer un groupe
          </Link>
        </div>

        {/* Filtres par catégorie (visible uniquement pour les groupes) */}
        {activeTab === 'groups' && (
          <div className="categories-filters">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-chip ${activeFilter === cat.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(cat.id)}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Section Groupes */}
        {activeTab === 'groups' && (
          <>
            {filteredGroups.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">Aucun groupe trouvé</div>
                <div className="empty-sub">Essayez une autre recherche ou créez votre propre groupe</div>
                <Link to="/create-group" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  + Créer un groupe
                </Link>
              </div>
            ) : (
              <div className="groups-grid">
                {filteredGroups.map(group => {
                  const isMember = joinedGroupIds.includes(group.id);
                  
                  return (
                    <div key={group.id} className="group-card">
                      <div className="group-card-header" style={{ background: `${group.bg || '#1B4FD8'}20` }}>
                        <div className="group-card-icon" style={{ background: group.bg || '#1B4FD8' }}>
                          {group.icon || group.name?.charAt(0) || '🏛️'}
                        </div>
                      </div>
                      <div className="group-card-content">
                        <h3 className="group-card-name">{group.name}</h3>
                        <p className="group-card-description">
                          {group.description || 'Groupe de discussion et partage'}
                        </p>
                        <div className="group-card-stats">
                          <span>👥 {group.members || 0} membres</span>
                          <span>📝 {group.posts || 0} publications</span>
                        </div>
                        <div className="group-card-actions">
                          <Link to={`/group/${group.id}`} className="btn-view">
                            Voir le groupe
                          </Link>
                          {!isMember && (
                            <button className="btn-join" onClick={() => joinGroup(group.id)}>
                              Rejoindre
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Section Personnes */}
        {activeTab === 'people' && (
          <>
            {filteredPeople.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <div className="empty-title">Aucune personne trouvée</div>
                <div className="empty-sub">Essayez une autre recherche</div>
              </div>
            ) : (
              <div className="people-grid">
                {filteredPeople.map(person => (
                  <Link key={person.id} to={`/profile/${person.uid}`} className="person-card">
                    <div className="person-avatar" style={{ background: person.avatarBg || '#1B4FD8' }}>
                      {person.initials}
                    </div>
                    <div className="person-name">{person.name}</div>
                    <div className="person-promotion">{person.promotion || 'Étudiant'}</div>
                    <div className="person-stats">
                      <span>📚 {person.followers || 0} abonnés</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bouton flottant pour mobile - Créer groupe */}
      <Link to="/create-group" className="fab-mobile-btn">
        +
      </Link>
    </div>
  );
};

export default ExplorePage;
