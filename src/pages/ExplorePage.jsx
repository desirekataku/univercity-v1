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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('groups'); // groups, people
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [joinLoading, setJoinLoading] = useState({});

  // Catégories de groupes
  const categories = [
    { id: 'all', name: 'Tous', icon: '🌐' },
    { id: 'study', name: 'Étude', icon: '📚' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'arts', name: 'Arts', icon: '🎨' },
    { id: 'tech', name: 'Tech', icon: '💻' },
    { id: 'social', name: 'Social', icon: '👥' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [groups, people, searchTerm, categoryFilter, activeTab]);

  const loadData = async () => {
    setLoading(true);
    
    // Charger tous les groupes publics
    const gResult = await groupService.getAllGroups();
    if (gResult.success) {
      setGroups(gResult.data);
      setFilteredGroups(gResult.data);
    }
    
    // Charger les suggestions d'utilisateurs
    const pResult = await userService.getSuggestedUsers(user?.uid);
    if (pResult.success) {
      setPeople(pResult.data);
      setFilteredPeople(pResult.data);
    }
    
    setLoading(false);
  };

  const applyFilters = () => {
    // Filtre groupes
    let filteredG = [...groups];
    
    // Recherche textuelle
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filteredG = filteredG.filter(g => 
        g.name?.toLowerCase().includes(term) ||
        g.description?.toLowerCase().includes(term)
      );
    }
    
    // Filtre par catégorie (si implémenté dans les groupes)
    if (categoryFilter !== 'all') {
      filteredG = filteredG.filter(g => g.category === categoryFilter);
    }
    
    setFilteredGroups(filteredG);
    
    // Filtre personnes
    let filteredP = [...people];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filteredP = filteredP.filter(p => 
        p.name?.toLowerCase().includes(term) ||
        p.promotion?.toLowerCase().includes(term)
      );
    }
    setFilteredPeople(filteredP);
  };

  const handleJoinGroup = async (groupId) => {
    setJoinLoading(prev => ({ ...prev, [groupId]: true }));
    
    const result = await groupService.joinGroup(groupId, user.uid);
    if (result.success) {
      // Mettre à jour l'état local
      setGroups(prev => prev.map(g => 
        g.id === groupId 
          ? { ...g, members: (g.members || 0) + 1, isMember: true }
          : g
      ));
    } else {
      alert(result.error || 'Erreur lors de l\'inscription');
    }
    
    setJoinLoading(prev => ({ ...prev, [groupId]: false }));
  };

  const handleFollowUser = async (userId) => {
    const result = await userService.followUser(user.uid, userId);
    if (result.success) {
      setPeople(prev => prev.map(p => 
        p.uid === userId 
          ? { ...p, isFollowing: true, followers: (p.followers || 0) + 1 }
          : p
      ));
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
        {/* Header */}
        <div className="explore-header">
          <h1>🔍 Explorer</h1>
          <p className="explore-subtitle">
            Découvrez des groupes et connectez-vous avec d'autres étudiants
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="explore-search">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Rechercher un groupe, une personne, une matière..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="search-clear" onClick={() => setSearchTerm('')}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="explore-tabs">
          <button 
            className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            🏛️ Groupes ({filteredGroups.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'people' ? 'active' : ''}`}
            onClick={() => setActiveTab('people')}
          >
            👥 Personnes ({filteredPeople.length})
          </button>
        </div>

        {/* Filtres catégories (visible seulement pour les groupes) */}
        {activeTab === 'groups' && (
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-chip ${categoryFilter === cat.id ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Contenu principal */}
        <div className="explore-content">
          {activeTab === 'groups' && (
            <>
              {filteredGroups.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏛️</div>
                  <h3>Aucun groupe trouvé</h3>
                  <p>Sois le premier à créer un groupe !</p>
                  <Link to="/create-group" className="btn btn-primary">
                    + Créer un groupe
                  </Link>
                </div>
              ) : (
                <div className="groups-grid">
                  {filteredGroups.map(group => (
                    <div key={group.id} className="group-card">
                      {/* Couleur d'en-tête */}
                      <div className="group-card-header" style={{ background: group.bg || '#6c63ff' }}>
                        <div className="group-card-icon">
                          {group.name?.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="group-card-content">
                        <h3 className="group-card-name">{group.name}</h3>
                        <p className="group-card-description">
                          {group.description || 'Aucune description'}
                        </p>
                        
                        <div className="group-card-stats">
                          <span>👥 {group.members || 0} membres</span>
                          <span>📝 {group.posts || 0} publications</span>
                        </div>
                        
                        <div className="group-card-actions">
                          <Link to={`/group/${group.id}`} className="btn-view">
                            Voir le groupe
                          </Link>
                          {!group.isMember && (
                            <button 
                              className="btn-join"
                              onClick={() => handleJoinGroup(group.id)}
                              disabled={joinLoading[group.id]}
                            >
                              {joinLoading[group.id] ? '...' : 'Rejoindre'}
                            </button>
                          )}
                          {group.isMember && (
                            <span className="member-badge">Membre ✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'people' && (
            <>
              {filteredPeople.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3>Aucune personne trouvée</h3>
                  <p>Invite tes amis à rejoindre la plateforme !</p>
                </div>
              ) : (
                <div className="people-grid">
                  {filteredPeople.map(person => (
                    <div key={person.uid} className="person-card">
                      <div className="person-avatar" style={{ background: person.avatarBg || '#6c63ff' }}>
                        {person.initials || person.name?.charAt(0) || 'U'}
                      </div>
                      
                      <h4 className="person-name">{person.name}</h4>
                      <p className="person-promotion">{person.promotion || 'Étudiant'}</p>
                      
                      <div className="person-stats">
                        <span>📚 {person.resourcesCount || 0} ressources</span>
                        <span>👥 {person.followers || 0} abonnés</span>
                      </div>
                      
                      <div className="person-actions">
                        <Link to={`/profile/${person.uid}`} className="btn-view-profile">
                          Voir profil
                        </Link>
                        {!person.isFollowing && (
                          <button 
                            className="btn-follow"
                            onClick={() => handleFollowUser(person.uid)}
                          >
                            + Suivre
                          </button>
                        )}
                        {person.isFollowing && (
                          <span className="following-badge">✓ Suivi</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
