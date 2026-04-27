
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
    visibility: 'public'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      bg: ['#1B4FD8', '#059669', '#7C3AED', '#D97706', '#DC2626'][Math.floor(Math.random() * 5)]
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
        <h2>Créer un groupe</h2>
        <p className="text-muted">Créez un groupe pour discuter et partager avec vos camarades</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
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

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              className="input"
              placeholder="Décrivez le but de ce groupe..."
              rows="3"
              value={form.description}
              onChange={handleChange}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>Visibilité</label>
            <select name="visibility" className="input" value={form.visibility} onChange={handleChange}>
              <option value="public">🌍 Public - Tout le monde peut trouver et rejoindre</option>
              <option value="private">🔒 Privé - Sur invitation seulement</option>
            </select>
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

