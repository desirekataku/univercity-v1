// src/pages/ResourcesPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { resourceService } from '../services/resourceService';
import { groupService } from '../services/groupService';
import Navbar from '../components/Navbar';
import ResourceCard from '../components/ResourceCard';
import UploadModal from '../components/UploadModal';
import TopContributors from '../components/TopContributors';
import './ResourcesPage.css';

const ResourcesPage = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    subject: 'all',
    level: 'all',
    groupId: 'all'
  });
  const [topContributors, setTopContributors] = useState([]);
  const [viewMode, setViewMode] = useState('grid');

  const types = [
    { value: 'all', label: 'Tous', icon: '📚' },
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'doc', label: 'Document', icon: '📝' },
    { value: 'image', label: 'Image', icon: '🖼️' },
    { value: 'other', label: 'Autre', icon: '📎' }
  ];
  
  const subjects = [
    'all', 'Mathématiques', 'Physique', 'Informatique', 
    'Droit', 'Économie', 'Médecine', 'Langues', 'Histoire'
  ];
  
  const levels = ['all', 'L1', 'L2', 'L3', 'M1', 'M2'];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [resources, filters, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    
    const resResult = await resourceService.getResources();
    if (resResult.success) setResources(resResult.data);
    
    const groupResult = await groupService.getUserGroups(user?.uid);
    if (groupResult.success) setGroups(groupResult.data);
    
    const topResult = await resourceService.getTopContributors(5);
    if (topResult.success) setTopContributors(topResult.data);
    
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...resources];
    
    if (filters.type !== 'all') {
      filtered = filtered.filter(r => r.type === filters.type);
    }
    if (filters.subject !== 'all') {
      filtered = filtered.filter(r => r.subject === filters.subject);
    }
    if (filters.level !== 'all') {
      filtered = filtered.filter(r => r.level === filters.level);
    }
    if (filters.groupId !== 'all') {
      filtered = filtered.filter(r => r.groupId === filters.groupId);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.title?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.tags?.some(t => t.toLowerCase().includes(term))
      );
    }
    
    setFilteredResources(filtered);
  };

  const handleLike = async (resourceId) => {
    const result = await resourceService.toggleLike(resourceId, user.uid);
    if (result.success) {
      setResources(prev => prev.map(r => 
        r.id === resourceId 
          ? { 
              ...r, 
              likes: result.liked ? r.likes + 1 : r.likes - 1,
              likedBy: result.liked 
                ? [...(r.likedBy || []), user.uid]
                : (r.likedBy || []).filter(id => id !== user.uid)
            }
          : r
      ));
    }
  };

  const handleDownload = async (resource) => {
    const result = await resourceService.downloadResource(resource);
    if (!result.success) {
      console.error('Erreur téléchargement:', result.error);
      alert('Erreur lors du téléchargement. Réessaie plus tard.');
    }
  };

  // ✅ FONCTION SUPPRESSION
  const handleDelete = async (resourceId) => {
    console.log('🗑️ Suppression demande pour:', resourceId);
    
    if (window.confirm('Es-tu sûr de vouloir supprimer cette ressource ? Cette action est irréversible.')) {
      const result = await resourceService.deleteResource(resourceId);
      
      if (result.success) {
        console.log('✅ Ressource supprimée');
        // Recharger la liste
        await loadData();
      } else {
        console.error('❌ Erreur suppression:', result.error);
        alert('Erreur lors de la suppression: ' + result.error);
      }
    }
  };

  const handleUploadSuccess = () => {
    console.log('✅ Upload réussi, rechargement...');
    loadData();
    setShowUpload(false);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="resources-page">
      <Navbar />
      
      <div className="resources-container">
        <div className="resources-header">
          <div>
            <h1>📚 Bibliothèque de ressources</h1>
            <p className="resources-subtitle">Partagez et découvrez des documents, cours et fichiers</p>
          </div>
          <button className="btn-upload" onClick={() => setShowUpload(true)}>
            <span>+</span> Partager une ressource
          </button>
        </div>

        <div className="search-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher par titre, description ou tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="search-clear" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>
          
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ≡
            </button>
          </div>
        </div>

        <div className="resources-layout">
          <aside className="resources-sidebar">
            <div className="filter-section">
              <h3>Filtres</h3>
              
              <div className="filter-group">
                <label>Type de fichier</label>
                <div className="filter-buttons">
                  {types.map(t => (
                    <button
                      key={t.value}
                      className={`filter-chip ${filters.type === t.value ? 'active' : ''}`}
                      onClick={() => setFilters({ ...filters, type: t.value })}
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Matière</label>
                <select 
                  className="filter-select"
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                >
                  {subjects.map(s => (
                    <option key={s} value={s}>{s === 'all' ? 'Toutes les matières' : s}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Niveau</label>
                <div className="filter-levels">
                  {levels.map(l => (
                    <button
                      key={l}
                      className={`level-btn ${filters.level === l ? 'active' : ''}`}
                      onClick={() => setFilters({ ...filters, level: l })}
                    >
                      {l === 'all' ? 'Tous' : l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Groupe</label>
                <select 
                  className="filter-select"
                  value={filters.groupId}
                  onChange={(e) => setFilters({ ...filters, groupId: e.target.value })}
                >
                  <option value="all">Tous les groupes</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <TopContributors contributors={topContributors} />
          </aside>

          <main className="resources-main">
            <div className="resources-stats">
              <span>{filteredResources.length} ressource(s) trouvée(s)</span>
              {(filters.type !== 'all' || filters.subject !== 'all' || filters.level !== 'all' || filters.groupId !== 'all') && (
                <button 
                  className="clear-filters"
                  onClick={() => setFilters({ type: 'all', subject: 'all', level: 'all', groupId: 'all' })}
                >
                  Effacer les filtres ✕
                </button>
              )}
            </div>

            {filteredResources.length === 0 ? (
              <div className="empty-resources">
                <div className="empty-icon">📭</div>
                <h3>Aucune ressource trouvée</h3>
                <p>Soyez le premier à partager un document !</p>
                <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                  + Partager une ressource
                </button>
              </div>
            ) : (
              <div className={`resources-${viewMode}`}>
                {filteredResources.map(resource => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onLike={() => handleLike(resource.id)}
                    onDownload={() => handleDownload(resource)}
                    onDelete={() => handleDelete(resource.id)}
                    currentUserId={user.uid}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
          user={user}
          groups={groups}
        />
      )}
    </div>
  );
};

export default ResourcesPage;
