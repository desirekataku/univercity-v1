import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventService } from '../services/eventService';
import { groupService } from '../services/groupService';
import Navbar from '../components/Navbar';
import './EventsPage.css';

const EventsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', eventDate: '', location: '', groupId: ''
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    // Récupérer tous les événements (pas filtrés par groupe)
    const eResult = await eventService.getAllEvents();
    if (eResult.success) setEvents(eResult.data);

    // Récupérer les groupes pour le formulaire de création
    const gResult = await groupService.getUserGroups(user.uid);
    if (gResult.success) setGroups(gResult.data);

    setLoading(false);
  };

  const createEvent = async (e) => {
    e.preventDefault();
    if (!form.title || !form.eventDate || !form.groupId) return;

    await eventService.createEvent({
      ...form,
      createdBy: user.uid,
      organizerName: user.name,
      eventDate: new Date(form.eventDate)
    });

    setShowCreate(false);
    setForm({ title: '', description: '', eventDate: '', location: '', groupId: '' });
    loadData();
  };

  const toggleParticipate = async (eventId) => {
    await eventService.toggleParticipate(eventId, user.uid);
    loadData();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="events-page">
      <Navbar />
      <div className="app-layout">
        <aside className="sidebar-left">
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Mes groupes</h3>
            {groups.map(g => (
              <div key={g.id} style={{ padding: '0.4rem 0', fontSize: '0.85rem' }}>
                {g.name}
              </div>
            ))}
          </div>
        </aside>

        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>📅 Tous les événements</h2>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Créer un événement
            </button>
          </div>

          {events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <div className="empty-title">Aucun événement</div>
              <div className="empty-sub">Créez un événement pour votre groupe !</div>
            </div>
          ) : (
            <div className="events-list">
              {events.map(event => (
                <div key={event.id} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>{event.title}</h3>
                  <div className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    📅 {new Date(event.eventDate?.toDate?.() || event.eventDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {event.location && ` · 📍 ${event.location}`}
                  </div>
                  <p style={{ marginBottom: '0.25rem' }}>{event.description}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--blue)', marginBottom: '0.75rem' }}>
                    👤 Organisé par {event.organizerName}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                      👥 {event.participantsCount || 0} participants
                    </span>
                    <button
                      className={event.participants?.includes(user.uid) ? 'btn btn-outline' : 'btn btn-primary'}
                      onClick={() => toggleParticipate(event.id)}
                    >
                      {event.participants?.includes(user.uid) ? '✓ Je participe' : 'Participer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal création */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <span>📅 Créer un événement</span>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={createEvent}>
              <div className="form-group">
                <label>Titre *</label>
                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Groupe *</label>
                <select className="input" value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })} required>
                  <option value="">Choisir un groupe</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input type="date" className="input" value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Lieu</label>
                <input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Salle B-108" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="input" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn-save">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
