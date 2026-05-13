// src/pages/EventsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventService } from '../services/eventService';
import { groupService } from '../services/groupService';
import Navbar from '../components/Navbar';
import './EventsPage.css';

const EventsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, upcoming, past, my
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '',
    location: '',
    groupId: '',
    maxParticipants: ''
  });
  const [editEvent, setEditEvent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [events, filterType, selectedGroup]);

  const loadData = async () => {
    setLoading(true);
    
    // Charger événements
    const result = await eventService.getAllEvents();
    if (result.success) {
      setEvents(result.data);
    }
    
    // Charger groupes de l'utilisateur
    const groupResult = await groupService.getUserGroups(user?.uid);
    if (groupResult.success) {
      setGroups(groupResult.data);
    }
    
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...events];
    
    // Filtre par type (à venir / passé / mes événements)
    const now = new Date();
    if (filterType === 'upcoming') {
      filtered = filtered.filter(event => {
        const eventDate = event.eventDate?.toDate?.() || new Date(event.eventDate);
        return eventDate >= now;
      });
    } else if (filterType === 'past') {
      filtered = filtered.filter(event => {
        const eventDate = event.eventDate?.toDate?.() || new Date(event.eventDate);
        return eventDate < now;
      });
    } else if (filterType === 'my') {
      filtered = filtered.filter(event => 
        event.participants?.includes(user?.uid) || event.createdBy === user?.uid
      );
    }
    
    // Filtre par groupe
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(event => event.groupId === selectedGroup);
    }
    
    // Trier par date
    filtered.sort((a, b) => {
      const dateA = a.eventDate?.toDate?.() || new Date(a.eventDate);
      const dateB = b.eventDate?.toDate?.() || new Date(b.eventDate);
      return dateA - dateB;
    });
    
    setFilteredEvents(filtered);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.title.trim()) {
      setError('Le titre est requis');
      return;
    }
    if (!form.eventDate) {
      setError('La date est requise');
      return;
    }
    
    // Combiner date et heure
    let eventDateTime = new Date(form.eventDate);
    if (form.eventTime) {
      const [hours, minutes] = form.eventTime.split(':');
      eventDateTime.setHours(parseInt(hours), parseInt(minutes));
    }
    
    const result = await eventService.createEvent({
      title: form.title,
      description: form.description,
      eventDate: eventDateTime,
      location: form.location,
      groupId: form.groupId || null,
      createdBy: user.uid,
      organizerName: user.name,
      maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : null
    });
    
    if (result.success) {
      setShowCreate(false);
      setForm({
        title: '',
        description: '',
        eventDate: '',
        eventTime: '',
        location: '',
        groupId: '',
        maxParticipants: ''
      });
      loadData();
    } else {
      setError(result.error);
    }
  };

  const handleParticipate = async (eventId) => {
    const result = await eventService.toggleParticipate(eventId, user.uid);
    if (result.success) {
      loadData();
    } else {
      alert(result.error || 'Erreur lors de la participation');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Es-tu sûr de vouloir supprimer cet événement ?')) {
      const result = await eventService.deleteEvent(eventId);
      if (result.success) {
        loadData();
      } else {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleCancelEvent = async (eventId) => {
    if (window.confirm('Annuler cet événement ?')) {
      const result = await eventService.cancelEvent(eventId);
      if (result.success) {
        loadData();
      }
    }
  };

  const getEventStatus = (event) => {
    const eventDate = event.eventDate?.toDate?.() || new Date(event.eventDate);
    const now = new Date();
    
    if (event.status === 'cancelled') {
      return { label: 'Annulé', class: 'cancelled' };
    }
    if (eventDate < now) {
      return { label: 'Passé', class: 'past' };
    }
    if (eventDate.toDateString() === now.toDateString()) {
      return { label: "Aujourd'hui", class: 'today' };
    }
    return { label: 'À venir', class: 'upcoming' };
  };

  const isParticipant = (event) => {
    return event.participants?.includes(user?.uid);
  };

  const isOrganizer = (event) => {
    return event.createdBy === user?.uid;
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="events-page">
      <Navbar />
      
      <div className="events-container">
        {/* Header */}
        <div className="events-header">
          <div>
            <h1>📅 Événements</h1>
            <p className="events-subtitle">Organisez et participez à des événements avec vos camarades</p>
          </div>
          <button className="btn-create-event" onClick={() => setShowCreate(true)}>
            <span>+</span> Créer un événement
          </button>
        </div>

        {/* Filtres */}
        <div className="events-filters">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Tous
            </button>
            <button 
              className={`filter-tab ${filterType === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilterType('upcoming')}
            >
              À venir
            </button>
            <button 
              className={`filter-tab ${filterType === 'past' ? 'active' : ''}`}
              onClick={() => setFilterType('past')}
            >
              Passés
            </button>
            <button 
              className={`filter-tab ${filterType === 'my' ? 'active' : ''}`}
              onClick={() => setFilterType('my')}
            >
              Mes événements
            </button>
          </div>
          
          <select 
            className="filter-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="all">Tous les groupes</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>

        {/* Liste des événements */}
        {filteredEvents.length === 0 ? (
          <div className="empty-events">
            <div className="empty-icon">📅</div>
            <h3>Aucun événement trouvé</h3>
            <p>Créez le premier événement pour votre groupe !</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Créer un événement
            </button>
          </div>
        ) : (
          <div className="events-list">
            {filteredEvents.map(event => {
              const status = getEventStatus(event);
              const isUserParticipant = isParticipant(event);
              const isUserOrganizer = isOrganizer(event);
              const isFull = event.maxParticipants && event.participantsCount >= event.maxParticipants;
              
              return (
                <div key={event.id} className={`event-card ${status.class}`}>
                  {/* Statut */}
                  <div className={`event-status ${status.class}`}>
                    {status.label}
                  </div>
                  
                  {/* Contenu principal */}
                  <div className="event-main">
                    <div className="event-date-large">
                      <div className="event-day">
                        {event.eventDate?.toDate?.()?.getDate() || new Date(event.eventDate).getDate()}
                      </div>
                      <div className="event-month">
                        {event.eventDate?.toDate?.()?.toLocaleString('fr-FR', { month: 'short' }) || new Date(event.eventDate).toLocaleString('fr-FR', { month: 'short' })}
                      </div>
                    </div>
                    
                    <div className="event-details">
                      <h3 className="event-title">{event.title}</h3>
                      <p className="event-description">{event.description || 'Aucune description'}</p>
                      
                      <div className="event-metadata">
                        {event.location && (
                          <span className="event-meta">
                            📍 {event.location}
                          </span>
                        )}
                        <span className="event-meta">
                          ⏰ {eventService.formatShortDate(event.eventDate)}
                        </span>
                        {event.groupId && (
                          <span className="event-meta group">
                            👥 {groups.find(g => g.id === event.groupId)?.name || 'Groupe'}
                          </span>
                        )}
                      </div>
                      
                      <div className="event-participants">
                        <span>👤 {event.participantsCount || 0} participant(s)</span>
                        {event.maxParticipants && (
                          <span className="event-max">
                            max: {event.maxParticipants}
                          </span>
                        )}
                        {isFull && (
                          <span className="event-full">Complet !</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="event-actions">
                    {isUserOrganizer && status.class !== 'past' && status.class !== 'cancelled' && (
                      <>
                        <button 
                          className="btn-cancel-event"
                          onClick={() => handleCancelEvent(event.id)}
                        >
                          Annuler
                        </button>
                        <button 
                          className="btn-delete-event"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          🗑️ Supprimer
                        </button>
                      </>
                    )}
                    
                    {!isUserOrganizer && status.class !== 'past' && status.class !== 'cancelled' && (
                      <button 
                        className={`btn-participate ${isUserParticipant ? 'active' : ''}`}
                        onClick={() => handleParticipate(event.id)}
                        disabled={isFull && !isUserParticipant}
                      >
                        {isUserParticipant ? '✓ Je participe' : (isFull ? 'Complet' : '🤝 Participer')}
                      </button>
                    )}
                    
                    {status.class === 'past' && (
                      <span className="event-past-badge">Terminé</span>
                    )}
                    
                    {status.class === 'cancelled' && (
                      <span className="event-cancelled-badge">Annulé</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal création événement */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📅 Créer un événement</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreateEvent}>
              {error && <div className="form-error">{error}</div>}
              
              <div className="form-group">
                <label>Titre *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Révision collective"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Heure</label>
                  <input
                    type="time"
                    className="input"
                    value={form.eventTime}
                    onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Lieu</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Salle B-108, en ligne, etc."
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label>Groupe</label>
                  <select
                    className="input"
                    value={form.groupId}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  >
                    <option value="">Public (tous)</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Nombre max de participants</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Illimité si vide"
                  value={form.maxParticipants}
                  onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="input"
                  rows="4"
                  placeholder="Décrivez l'événement..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              
              <div className="modal-buttons">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  ✨ Créer l'événement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
