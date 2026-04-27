import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, limit, arrayUnion, arrayRemove,
  increment, Timestamp
} from 'firebase/firestore';

const EVENTS = 'events';

export const eventService = {

  // Créer un événement
  async createEvent(data) {
    const ref = collection(db, EVENTS);
    const now = Timestamp.now();
    const docRef = await addDoc(ref, {
      ...data,
      participants: [],
      participantsCount: 0,
      createdAt: now,
      status: 'upcoming'
    });
    return { success: true, id: docRef.id };
  },

  // Récupérer les événements des groupes d'un utilisateur
  async getUserEvents(userGroups) {
    if (!userGroups || userGroups.length === 0) {
      return { success: true, data: [] };
    }

    const allEvents = [];
    for (const groupId of userGroups) {
      const ref = collection(db, EVENTS);
      const q = query(
        ref,
        where('groupId', '==', groupId),
        where('status', 'in', ['upcoming', 'ongoing']),
        orderBy('eventDate', 'asc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => allEvents.push({ id: doc.id, ...doc.data() }));
    }

    // Trier par date
    allEvents.sort((a, b) => {
      const dateA = a.eventDate?.seconds || 0;
      const dateB = b.eventDate?.seconds || 0;
      return dateA - dateB;
    });

    return { success: true, data: allEvents };
  },

  // Récupérer les événements d'un groupe
  async getGroupEvents(groupId) {
    const ref = collection(db, EVENTS);
    const q = query(
      ref,
      where('groupId', '==', groupId),
      orderBy('eventDate', 'asc'),
      limit(20)
    );
    const snapshot = await getDocs(q);
    const events = [];
    snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: events };
  },

  // Participer / Ne plus participer
  async toggleParticipate(eventId, userId) {
    const ref = doc(db, EVENTS, eventId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { success: false };

    const data = snap.data();
    const isParticipant = data.participants?.includes(userId);

    if (isParticipant) {
      await updateDoc(ref, {
        participantsCount: increment(-1),
        participants: arrayRemove(userId)
      });
    } else {
      await updateDoc(ref, {
        participantsCount: increment(1),
        participants: arrayUnion(userId)
      });
    }

    return { success: true, participating: !isParticipant };
  },
  
  async getAllEvents() {
  const ref = collection(db, EVENTS);
  const q = query(
    ref,
    where('status', 'in', ['upcoming', 'ongoing']),
    orderBy('eventDate', 'asc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  const events = [];
  snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
  return { success: true, data: events };
},

  // Vérifier si l'utilisateur participe
  async checkParticipation(eventId, userId) {
    const snap = await getDoc(doc(db, EVENTS, eventId));
    if (!snap.exists()) return { success: false };
    const data = snap.data();
    return { 
      success: true, 
      participating: data.participants?.includes(userId) 
    };
  }
};

