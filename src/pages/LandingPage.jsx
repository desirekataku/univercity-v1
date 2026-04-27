import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="nav-inner">
          <Link to="/" className="logo">Uni<span>ver</span>city</Link>
          <div className="nav-btns">
            <Link to="/auth?mode=login" className="btn btn-outline">Connexion</Link>
            <Link to="/auth?mode=register" className="btn btn-primary">Inscription</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1>
            Le réseau social<br />
            <span className="highlight">de votre promotion</span>
          </h1>
          <p className="hero-desc">
            Créez des groupes comme sur WhatsApp, partagez vos cours,
            organisez des événements et discutez avec vos camarades.
          </p>
          <div className="hero-actions">
            <Link to="/auth?mode=register" className="btn btn-primary btn-lg">
              🎓 Rejoindre gratuitement
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">💬</div>
          <h3>Groupes de discussion</h3>
          <p>Créez des groupes pour votre promo, vos projets ou vos centres d'intérêt.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📚</div>
          <h3>Partage de ressources</h3>
          <p>Partagez des PDF, cours, résumés avec les membres de vos groupes.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📅</div>
          <h3>Événements</h3>
          <p>Organisez des révisions collectives et suivez tous vos événements.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔍</div>
          <h3>Explorez</h3>
          <p>Trouvez des groupes d'étude et connectez-vous avec d'autres étudiants.</p>
        </div>
      </section>

      <footer>
        <p>© 2025 Univercity — Le réseau des étudiants</p>
      </footer>
    </div>
  );
};

export default LandingPage;

