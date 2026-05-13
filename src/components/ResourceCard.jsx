// src/components/ResourceCard.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resourceService } from '../services/resourceService';
import './ResourceCard.css';

const ResourceCard = ({ resource, onLike, onDownload, onDelete, currentUserId, viewMode }) => {
  const [imageError, setImageError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { user } = useAuth();
  const isOwner = user?.uid === resource.uploadedBy;
  
  const getFileIcon = (type) => {
    const icons = {
      pdf: { icon: '📄', color: '#ef4444' },
      doc: { icon: '📝', color: '#3b82f6' },
      image: { icon: '🖼️', color: '#10b981' },
      other: { icon: '📎', color: '#8a8f9a' }
    };
    return icons[type] || icons.other;
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  const handleDownload = async () => {
    setDownloading(true);
    await onDownload();
    setTimeout(() => setDownloading(false), 2000);
  };
  
  const handleDelete = async () => {
    await onDelete();
    setShowDeleteConfirm(false);
  };
  
  const fileIcon = getFileIcon(resource.type);
  const isLiked = resource.likedBy?.includes(currentUserId);
  
  if (viewMode === 'list') {
    return (
      <div className="resource-card-list">
        <div className="resource-icon" style={{ background: `${fileIcon.color}20` }}>
          <span style={{ fontSize: '1.5rem' }}>{fileIcon.icon}</span>
        </div>
        
        <div className="resource-info">
          <h4>{resource.title}</h4>
          <p className="resource-desc">{resource.description?.substring(0, 80)}...</p>
          <div className="resource-meta">
            <span>📅 {formatDate(resource.createdAt)}</span>
            <span>📥 {resource.downloads || 0} téléchargements</span>
            <span>❤️ {resource.likes || 0} likes</span>
          </div>
        </div>
        
        <div className="resource-actions">
          <button className={`action-btn like ${isLiked ? 'active' : ''}`} onClick={onLike}>
            {isLiked ? '❤️' : '🤍'} {resource.likes || 0}
          </button>
          <button className="action-btn download" onClick={handleDownload} disabled={downloading}>
            {downloading ? '⏳...' : '⬇️ Télécharger'}
          </button>
          {isOwner && (
            <button className="action-btn delete" onClick={() => setShowDeleteConfirm(true)}>
              🗑️
            </button>
          )}
        </div>
        
        {/* Modal confirmation suppression */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
              <h4>🗑️ Supprimer la ressource</h4>
              <p>Es-tu sûr de vouloir supprimer <strong>"{resource.title}"</strong> ?</p>
              <p className="warning-text">⚠️ Cette action est irréversible !</p>
              <div className="delete-confirm-buttons">
                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
                <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Vue grille
  return (
    <div className="resource-card">
      {/* Bouton supprimer (angle) */}
      {isOwner && (
        <button className="card-delete-btn" onClick={() => setShowDeleteConfirm(true)} title="Supprimer">
          🗑️
        </button>
      )}
      
      <div className="card-preview">
        {resource.type === 'image' && !imageError ? (
          <img src={resource.fileUrl} alt={resource.title} onError={() => setImageError(true)} />
        ) : (
          <div className="preview-placeholder" style={{ background: `${fileIcon.color}15` }}>
            <span className="preview-icon">{fileIcon.icon}</span>
            <span className="file-type">{resource.type?.toUpperCase()}</span>
          </div>
        )}
      </div>
      
      <div className="card-content">
        <h4 className="card-title">{resource.title}</h4>
        <p className="card-description">{resource.description?.substring(0, 100)}...</p>
        
        <div className="card-tags">
          {resource.subject && <span className="tag subject">{resource.subject}</span>}
          {resource.level && <span className="tag level">{resource.level}</span>}
        </div>
        
        <div className="card-footer">
          <div className="uploader-info">
            <div className="uploader-avatar" style={{ background: resource.uploaderAvatarBg || '#6c63ff' }}>
              {resource.uploaderInitials || 'U'}
            </div>
            <div className="uploader-details">
              <span className="uploader-name">{resource.uploaderName}</span>
              <span className="upload-date">{formatDate(resource.createdAt)}</span>
            </div>
          </div>
          
          <div className="card-stats">
            <button className={`stat-btn ${isLiked ? 'liked' : ''}`} onClick={onLike}>
              <span>{isLiked ? '❤️' : '🤍'}</span>
              <span>{resource.likes || 0}</span>
            </button>
            <button className="stat-btn" onClick={handleDownload} disabled={downloading}>
              <span>⬇️</span>
              <span>{downloading ? '...' : (resource.downloads || 0)}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal confirmation suppression */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <h4>🗑️ Supprimer la ressource</h4>
            <p>Es-tu sûr de vouloir supprimer <strong>"{resource.title}"</strong> ?</p>
            <p className="warning-text">⚠️ Cette action est irréversible !</p>
            <div className="delete-confirm-buttons">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
              <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceCard;
