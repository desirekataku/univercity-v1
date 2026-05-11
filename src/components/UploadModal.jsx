// src/components/UploadModal.jsx
import React, { useState } from 'react';
import { resourceService } from '../services/resourceService';
import './UploadModal.css';

const UploadModal = ({ onClose, onSuccess, user, groups }) => {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'pdf',
    subject: '',
    level: '',
    groupId: '',
    tags: ''
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const types = [
    { value: 'pdf', label: '📄 PDF', accept: '.pdf' },
    { value: 'doc', label: '📝 Document', accept: '.doc,.docx,.txt' },
    { value: 'image', label: '🖼️ Image', accept: '.jpg,.jpeg,.png,.gif' },
    { value: 'other', label: '📎 Autre', accept: '*' }
  ];

  const subjects = [
    'Mathématiques', 'Physique', 'Informatique', 
    'Droit', 'Économie', 'Médecine', 'Langues', 'Histoire', 'Autre'
  ];

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      // Auto-détecter le type
      if (selected.type === 'application/pdf') {
        setForm({ ...form, type: 'pdf' });
      } else if (selected.type.includes('image')) {
        setForm({ ...form, type: 'image' });
      } else if (selected.type.includes('word') || selected.type.includes('text')) {
        setForm({ ...form, type: 'doc' });
      } else {
        setForm({ ...form, type: 'other' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }
    if (!form.title.trim()) {
      setError('Veuillez donner un titre');
      return;
    }
    
    setUploading(true);
    setProgress(0);
    setError('');
    
    // Simuler progression pour l'UI
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);
    
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(t => t);
      
      const result = await resourceService.uploadResource(
        file,
        {
          title: form.title,
          description: form.description,
          type: form.type,
          subject: form.subject,
          level: form.level,
          groupId: form.groupId,
          tags: tags
        },
        user.uid,
        user
      );
      
      clearInterval(interval);
      
      if (result.success) {
        setProgress(100);
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        setError(result.error);
        setUploading(false);
      }
    } catch (err) {
      clearInterval(interval);
      setError('Erreur lors de l\'upload: ' + err.message);
      setUploading(false);
    }
  };

  return (
    <div className="upload-modal-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={e => e.stopPropagation()}>
        <div className="upload-modal-header">
          <h2>📤 Partager une ressource</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Zone de drop fichier */}
          <div 
            className={`drop-zone ${file ? 'has-file' : ''}`}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
            />
            {file ? (
              <div className="file-selected">
                <span className="file-icon">📄</span>
                <div>
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{resourceService.formatFileSize(file.size)}</div>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setFile(null); 
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="drop-zone-content">
                <span className="upload-icon">📁</span>
                <p>Cliquez pour sélectionner un fichier</p>
                <small>PDF, DOC, Image, TXT (Max 50MB)</small>
              </div>
            )}
          </div>
          
          {/* Formulaire */}
          <div className="form-row">
            <div className="form-group">
              <label>Titre *</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Cours de programmation L2"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Type de fichier</label>
              <div className="type-buttons">
                {types.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    className={`type-btn ${form.type === t.value ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, type: t.value })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Matière</label>
              <select 
                className="input" 
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                <option value="">Sélectionner une matière</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label>Niveau</label>
              <div className="level-buttons">
                {levels.map(l => (
                  <button
                    key={l}
                    type="button"
                    className={`level-pill ${form.level === l ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, level: l })}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>Groupe (optionnel)</label>
            <select 
              className="input" 
              value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}
            >
              <option value="">Partager avec tous</option>
              {groups && groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              className="input"
              rows="3"
              placeholder="Décrivez le contenu de votre ressource..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          
          <div className="form-group">
            <label>Tags (séparés par des virgules)</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: cours, examen, revision"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          {/* Barre de progression */}
          {uploading && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}>
                {progress}%
              </div>
            </div>
          )}
          
          <div className="modal-buttons">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-submit" disabled={uploading}>
              {uploading ? 'Téléchargement...' : '📤 Publier la ressource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
