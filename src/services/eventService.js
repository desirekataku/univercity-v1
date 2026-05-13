// src/services/eventService.js
import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, increment, arrayUnion, arrayRemove
} from 'firebase/firestore';

const EVENTS = 'events';

export const eventService = {

  // ============ CRÉER UN ÉVÉNEMENT ============
  async createEvent(data) {
    try {
      console.log('📅 Création événement:', data.title);
      
      const ref = collection(db, EVENTS);
      const now = Timestamp.now();
      
      // Convertir la date si nécessaire
      let eventDate = data.eventDate;
      if (eventDate && !(eventDate instanceof Timestamp)) {
        eventDate = Timestamp.fromDate(new Date(eventDate));
      }
      
      const eventData = {
        title: data.title,
        description: data.description || '',
        eventDate: eventDate,
        location: data.location || '',
        groupId: data.groupId || null,
        createdBy: data.createdBy,
        organizerName: data.organizerName,
        participants: [],
        participantsCount: 0,
        createdAt: now,
        updatedAt: now,
        status: 'upcoming', // upcoming, ongoing, past, cancelled
        maxParticipants: data.maxParticipants || null,
        imageUrl: data.imageUrl || null
      };
      
      const docRef = await addDoc(ref, eventData);
      console.log('✅ Événement créé:', docRef.id);
      
      return { success: true, id: docRef.id };
      
    } catch (error) {
      console.error('❌ Create event error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ RÉCUPÉRER UN ÉVÉNEMENT ============
  async getEvent(eventId) {
    try {
      const ref = doc(db, EVENTS, eventId);
      const snap = await getDoc(ref);
      
      if (!snap.exists()) {
        return { success: false, error: 'Événement non trouvé' };
      }
      
      const data = { id: snap.id, ...snap.data() };
      
      // Ajouter des champs calculés
      const now = new Date();
      const eventDate = data.eventDate?.toDate?.() || new Date(data.eventDate);
      data.isPast = eventDate < now;
      data.isToday = eventDate.toDateString() === now.toDateString();
      
      return { success: true, data };
      
    } catch (error) {
      console.error('Get event error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ RÉCUPÉRER TOUS LES ÉVÉNEMENTS ============
  async getAllEvents(limitCount = 50) {
    try {
      const ref = collection(db, EVENTS);
      const q = query(
        ref,
        orderBy('eventDate', 'asc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      const events = [];
      const now = new Date();
      
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        const eventDate = data.eventDate?.toDate?.() || new Date(data.eventDate);
        
        // Mettre à jour le statut si nécessaire
        if (eventDate < now && data.status === 'upcoming') {
          data.status = 'past';
        }
        
        events.push(data);
      });
      
      return { success: true, data: events };
      
    } catch (error) {
      console.error('Get all events error:', error);
      return { success: true, data: [] };
    }
  },

  // ============ ÉVÉNEMENTS D'UN GROUPE ============
  async getGroupEvents(groupId) {
    try {
      const ref = collection(db, EVENTS);
      const q = query(
        ref,
        where('groupId', '==', groupId),
        orderBy('eventDate', 'asc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      
      const events = [];
      snapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: events };
      
    } catch (error) {
      console.error('Get group events error:', error);
      return { success: true, data: [] };
    }
  },

  // ============ ÉVÉNEMENTS D'UN UTILISATEUR ============
  async getUserEvents(userId) {
    try {
      // Récupérer les événements où l'utilisateur participe
      const ref = collection(db, EVENTS);
      const q = query(
        ref,
        where('participants', 'array-contains', userId),
        orderBy('eventDate', 'asc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      
      const events = [];
      snapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: events };
      
    } catch (error) {
      console.error('Get user events error:', error);
      return { success: true, data: [] };
    }
  },

  // ============ ÉVÉNEMENTS À VENIR ============
  async getUpcomingEvents(limitCount = 20) {
    try {
      const now = new Date();
      const ref = collection(db, EVENTS);
      const q = query(
        ref,
        where('eventDate', '>=', now),
        orderBy('eventDate', 'asc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      const events = [];
      snapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: events };
      
    } catch (error) {
      console.error('Get upcoming events error:', error);
      return { success: true, data: [] };
    }
  },

  // ============ PARTICIPER / SE DÉSISTER ============
  async toggleParticipate(eventId, userId) {
    try {
      const ref = doc(db, EVENTS, eventId);
      const snap = await getDoc(ref);
      
      if (!snap.exists()) {
        return { success: false, error: 'Événement non trouvé' };
      }
      
      const data = snap.data();
      const isParticipant = data.participants?.includes(userId);
      
      // Vérifier la limite de participants
      if (!isParticipant && data.maxParticipants) {
        if (data.participantsCount >= data.maxParticipants) {
          return { success: false, error: 'Nombre maximum de participants atteint' };
        }
      }
      
      if (isParticipant) {
        await updateDoc(ref, {
          participantsCount: increment(-1),
          participants: arrayRemove(userId),
          updatedAt: Timestamp.now()
        });
      } else {
        await updateDoc(ref, {
          participantsCount: increment(1),
          participants: arrayUnion(userId),
          updatedAt: Timestamp.now()
        });
      }
      
      return { success: true, participating: !isParticipant };
      
    } catch (error) {
      console.error('Toggle participate error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ VÉRIFIER PARTICIPATION ============
  async checkParticipation(eventId, userId) {
    try {
      const snap = await getDoc(doc(db, EVENTS, eventId));
      if (!snap.exists()) return { success: false };
      
      const data = snap.data();
      return { 
        success: true, 
        participating: data.participants?.includes(userId) || false,
        participantsCount: data.participantsCount || 0,
        maxParticipants: data.maxParticipants || null
      };
      
    } catch (error) {
      console.error('Check participation error:', error);
      return { success: false };
    }
  },

  // ============ MODIFIER UN ÉVÉNEMENT ============
  async updateEvent(eventId, updates) {
    try {
      const ref = doc(db, EVENTS, eventId);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      // Convertir la date si présente
      if (updates.eventDate && !(updates.eventDate instanceof Timestamp)) {
        updateData.eventDate = Timestamp.fromDate(new Date(updates.eventDate));
      }
      
      await updateDoc(ref, updateData);
      return { success: true };
      
    } catch (error) {
      console.error('Update event error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ SUPPRIMER UN ÉVÉNEMENT ============
  async deleteEvent(eventId) {
    try {
      console.log('🗑️ Suppression événement:', eventId);
      const ref = doc(db, EVENTS, eventId);
      await deleteDoc(ref);
      console.log('✅ Événement supprimé');
      return { success: true };
      
    } catch (error) {
      console.error('Delete event error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ ANNULER UN ÉVÉNEMENT ============
  async cancelEvent(eventId) {
    try {
      const ref = doc(db, EVENTS, eventId);
      await updateDoc(ref, {
        status: 'cancelled',
        updatedAt: Timestamp.now()
      });
      return { success: true };
      
    } catch (error) {
      console.error('Cancel event error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ FORMATER DATE ============
  formatEventDate(timestamp) {
    if (!timestamp) return 'Date non définie';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // ============ FORMER DATE COURTE ============
  formatShortDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // ============ VÉRIFIER SI ÉVÉNEMENT EST PASSÉ ============
  isPastEvent(eventDate) {
    const date = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
    return date < new Date();
  },

  // ============ VÉRIFIER SI ÉVÉNEMENT EST AUJOURD'HUI ============
  isTodayEvent(eventDate) {
    const date = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }
};
