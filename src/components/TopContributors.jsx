// src/components/TopContributors.jsx
import React from 'react';
import './TopContributors.css';

const TopContributors = ({ contributors }) => {
  if (contributors.length === 0) return null;
  
  return (
    <div className="top-contributors">
      <h3>🏆 Top contributeurs</h3>
      <div className="contributors-list">
        {contributors.map((c, index) => (
          <div key={c.uid} className="contributor-item">
            <div className="contributor-rank">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
            </div>
            <div className="contributor-avatar" style={{ background: c.avatarBg || '#6c63ff' }}>
              {c.initials}
            </div>
            <div className="contributor-info">
              <div className="contributor-name">{c.name}</div>
              <div className="contributor-stats">
                📚 {c.count} ressource(s) • 📥 {c.totalDownloads} dl
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopContributors;
