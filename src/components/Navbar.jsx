// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <nav className="topnav">
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>

        <Link to={isAuthenticated ? '/feed' : '/'} className="logo">
          Uni<span>ver</span>city
        </Link>

        {isAuthenticated && (
          <div className="nav-links">
            <Link to="/feed" className="nav-link">Feed</Link>
            <Link to="/explore" className="nav-link">Explorer</Link>
            <Link to="/events" className="nav-link">Événements</Link>
            <Link to="/messages" className="nav-link">Messages</Link>
            <Link to="/resources" className="nav-link">📚 Ressources</Link>
          </div>
        )}

        <div className="nav-right">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <Link to="/profile" className="nav-avatar" style={{ background: user?.avatarBg || '#1B4FD8' }}>
                {user?.initials || 'U'}
              </Link>
              <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn btn-outline">Connexion</Link>
              <Link to="/auth" className="btn btn-primary">Inscription</Link>
            </>
          )}
        </div>
      </nav>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/feed" onClick={() => setMenuOpen(false)}>Feed</Link>
          <Link to="/explore" onClick={() => setMenuOpen(false)}>Explorer</Link>
          <Link to="/events" onClick={() => setMenuOpen(false)}>Événements</Link>
          <Link to="/messages" onClick={() => setMenuOpen(false)}>Messages</Link>
          <Link to="/resources" onClick={() => setMenuOpen(false)}>📚 Ressources</Link>
          <Link to="/profile" onClick={() => setMenuOpen(false)}>Profil</Link>
          <button onClick={() => { handleLogout(); setMenuOpen(false); }}>Déconnexion</button>
        </div>
      )}
    </>
  );
};

export default Navbar;
