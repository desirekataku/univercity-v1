// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { notificationService } from '../services/notificationService';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const loadUnreadCount = async () => {
        const result = await notificationService.getUnreadMessagesCount(user.uid);
        if (result.success) {
          setUnreadMessagesCount(result.count);
        }
      };
      loadUnreadCount();
      
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

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
            <Link to="/resources" className="nav-link">Ressources</Link>
            <Link to="/messages" className="nav-link">
              Messages
              {unreadMessagesCount > 0 && (
                <span className="messages-badge">{unreadMessagesCount}</span>
              )}
            </Link>
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

      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/feed" onClick={() => setMenuOpen(false)}>Feed</Link>
          <Link to="/explore" onClick={() => setMenuOpen(false)}>Explorer</Link>
          <Link to="/events" onClick={() => setMenuOpen(false)}>Événements</Link>
           <Link to="/resources" onClick={() => setMenuOpen(false)}>Ressources</Link>
          <Link to="/messages" onClick={() => setMenuOpen(false)}>
            Messages
            {unreadMessagesCount > 0 && (
              <span className="messages-badge">{unreadMessagesCount}</span>
            )}
          </Link>
          <Link to="/profile" onClick={() => setMenuOpen(false)}>Profil</Link>
          <button onClick={() => { handleLogout(); setMenuOpen(false); }}>Déconnexion</button>
        </div>
      )}
    </>
  );
};

export default Navbar;
