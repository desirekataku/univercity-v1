// src/services/notificationService.js
import { db } from '../config/firebase';
import { 
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, arrayUnion, arrayRemove 
} from 'firebase/firestore';

const NOTIFICATIONS = 'notifications';

export const notificationService = {

  // Créer une notification
  async createNotification({ userId, type, title, message, data }) {
    try {
      const ref = collection(db, NOTIFICATIONS);
      const now = Timestamp.now();
      const docRef = await addDoc(ref, {
        userId,
        type, // 'message', 'like', 'comment', 'join', 'event'
        title,
        message,
        data: data || {},
        read: false,
        createdAt: now
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Create notification error:', error);
      return { success: false };
    }
  },

  // Récupérer les notifications d'un utilisateur
  async getUserNotifications(userId, limitCount = 30) {
    try {
      const ref = collection(db, NOTIFICATIONS);
      const q = query(
        ref,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const notifications = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          time: this.formatTime(data.createdAt)
        });
      });
      return { success: true, data: notifications };
    } catch (error) {
      console.error('Get notifications error:', error);
      return { success: true, data: [] };
    }
  },

  // Marquer comme lu
  async markAsRead(notificationId) {
    try {
      const ref = doc(db, NOTIFICATIONS, notificationId);
      await updateDoc(ref, { read: true });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Marquer toutes comme lues
  async markAllAsRead(userId) {
    try {
      const ref = collection(db, NOTIFICATIONS);
      const q = query(ref, where('userId', '==', userId), where('read', '==', false));
      const snapshot = await getDocs(q);
      
      const promises = [];
      snapshot.forEach(doc => {
        promises.push(updateDoc(doc.ref, { read: true }));
      });
      await Promise.all(promises);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Supprimer une notification
  async deleteNotification(notificationId) {
    try {
      const ref = doc(db, NOTIFICATIONS, notificationId);
      await deleteDoc(ref);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Formater le temps
  formatTime(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const past = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((now - past) / 1000);

    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
    return past.toLocaleDateString('fr-FR');
  }
};
