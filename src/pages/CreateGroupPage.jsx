// src/pages/CreateGroupPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/groupService';
import Navbar from '../components/Navbar';
import './CreateGroupPage.css';

const CreateGroupPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'public',
    icon: '🏛️',
    bg: '#1B4FD8'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const icons = ['🏛️', '📚', '💻', '⚽', '🎵', '🎨', '🔬', '📊', '💬', '🤝', '🎮', '📖'];
  
  const colors = ['#1B4FD8', '#16A34A', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#4F46E5'];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Le nom du groupe est requis');
      return;
    }

    setLoading(true);
    const result = await groupService.createGroup({
      name: form.name.trim(),
      description: form.description.trim(),
      visibility: form.visibility,
      createdBy: user.uid,
      creatorName: user.name,
      icon: form.icon,
      bg: form.bg
    });

    if (result.success) {
      navigate(`/group/${result.id}`);
    } else {
      setError('Erreur lors de la création du groupe');
    }
    setLoading(false);
  };

  return (
    <div className="create-group-page">
      <Navbar />
      <div className="create-group-container">
        <h2>🏛️ Créer un groupe</h2>
        <p className="text-muted">Créez un groupe pour discuter et partager avec vos camarades</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Icône */}
          <div className="form-group">
            <label>Icône du groupe</label>
            <div className="icon-selector">
              {icons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-btn ${form.icon === icon ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Couleur */}
          <div className="form-group">
            <label>Couleur du groupe</label>
            <div className="color-selector">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-btn ${form.bg === color ? 'active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setForm({ ...form, bg: color })}
                />
              ))}
            </div>
          </div>

          {/* Nom */}
          <div className="form-group">
            <label>Nom du groupe *</label>
            <input
              name="name"
              className="input"
              placeholder="Ex: Groupe de révision Droit L2"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              className="input"
              placeholder="Décrivez le but de ce groupe..."
              rows="3"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* Visibilité */}
          <div className="form-group">
            <label>Visibilité</label>
            <select name="visibility" className="input" value={form.visibility} onChange={handleChange}>
              <option value="public">🌍 Public - Tout le monde peut trouver et rejoindre</option>
              <option value="private">🔒 Privé - Sur invitation seulement</option>
            </select>
          </div>

          {/* Aperçu */}
          <div className="form-group preview-group">
            <label>Aperçu</label>
            <div className="group-preview" style={{ background: form.bg }}>
              <span className="preview-icon">{form.icon}</span>
              <span className="preview-name">{form.name || 'Nom du groupe'}</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Création...' : '🎉 Créer le groupe'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupPage;
