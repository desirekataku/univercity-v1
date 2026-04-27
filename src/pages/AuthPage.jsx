import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const modeFromUrl = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(modeFromUrl !== 'register');
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', password: '', promotion: ''
  });
  const [error, setError] = useState('');
  const { login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    if (result.success) {
      navigate('/feed');
    } else {
      setError(result.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.prenom || !form.nom) {
      setError('Prénom et nom requis');
      return;
    }
    const result = await register(form);
    if (result.success) {
      navigate('/feed');
    } else {
      setError(result.error);
    }
  };

  const handleGoogle = async () => {
    const result = await loginWithGoogle();
    if (result.success) {
      navigate('/feed');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>{isLogin ? 'Connexion' : 'Inscription'}</h2>
        <p className="auth-sub">
          {isLogin ? 'Heureux de vous revoir !' : 'Rejoignez votre communauté'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn-google" onClick={handleGoogle}>
          <span>G</span> Continuer avec Google
        </button>

        <div className="divider"><span>ou</span></div>

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          {!isLogin && (
            <div className="form-row">
              <input
                name="prenom"
                placeholder="Prénom"
                value={form.prenom}
                onChange={handleChange}
                className="input"
              />
              <input
                name="nom"
                placeholder="Nom"
                value={form.nom}
                onChange={handleChange}
                className="input"
              />
            </div>
          )}

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="input"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={handleChange}
            className="input"
            required
          />

          {!isLogin && (
            <select
              name="promotion"
              value={form.promotion}
              onChange={handleChange}
              className="input"
            >
              <option value="">Ta promotion (facultatif)</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="M1">M1</option>
              <option value="M2">M2</option>
            </select>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isLogin ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{' '}
          <span
            onClick={() => setIsLogin(!isLogin)}
            style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
          >
            {isLogin ? "S'inscrire" : 'Se connecter'}
          </span>
        </p>

        <Link to="/" className="back-link">← Retour à l'accueil</Link>
      </div>
    </div>
  );
};

export default AuthPage;
