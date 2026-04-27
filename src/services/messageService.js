import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, orderBy, limit, increment, Timestamp,
  onSnapshot
} from 'firebase/firestore';

const CONVERSATIONS = 'conversations';
const MESSAGES = 'messages';

export const messageService = {

  // Créer ou récupérer une conversation entre 2 utilisateurs
  async getOrCreateConversation(user1Id, user2Id) {
    const ref = collection(db, CONVERSATIONS);
    const q = query(
      ref,
      where('participants', 'array-contains', user1Id)
    );
    const snapshot = await getDocs(q);
    
    let conv = null;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.participants.includes(user2Id) && !data.isGroup) {
        conv = { id: doc.id, ...data };
      }
    });

    if (conv) return { success: true, data: conv };

    // Créer une nouvelle conversation
    const now = Timestamp.now();
    const docRef = await addDoc(ref, {
      participants: [user1Id, user2Id],
      isGroup: false,
      createdAt: now,
      updatedAt: now,
      lastMessage: '',
      lastMessageTime: now
    });

    return { success: true, data: { id: docRef.id, participants: [user1Id, user2Id], isGroup: false } };
  },

  // Récupérer les conversations d'un utilisateur
  async getUserConversations(userId) {
    const ref = collection(db, CONVERSATIONS);
    const q = query(
      ref,
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
      limit(30)
    );
    const snapshot = await getDocs(q);
    const conversations = [];
    snapshot.forEach(doc => conversations.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: conversations };
  },

  // Envoyer un message
  async sendMessage(convId, data) {
    const msgRef = collection(db, CONVERSATIONS, convId, MESSAGES);
    const now = Timestamp.now();
    await addDoc(msgRef, {
      ...data,
      createdAt: now,
      read: false
    });

    // Mettre à jour la conversation
    const convRef = doc(db, CONVERSATIONS, convId);
    await updateDoc(convRef, {
      lastMessage: data.content?.substring(0, 50) || '📎 Fichier',
      lastMessageTime: now,
      updatedAt: now
    });

    return { success: true };
  },

  // Récupérer les messages d'une conversation
  async getMessages(convId) {
    const ref = collection(db, CONVERSATIONS, convId, MESSAGES);
    const q = query(ref, orderBy('createdAt', 'asc'), limit(100));
    const snapshot = await getDocs(q);
    const messages = [];
    snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: messages };
  },

  // Écouter les nouveaux messages en temps réel
  subscribeToMessages(convId, callback) {
    const ref = collection(db, CONVERSATIONS, convId, MESSAGES);
    const q = query(ref, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
      callback(messages);
    });
  },

  // Marquer comme lu
  async markAsRead(convId) {
    const convRef = doc(db, CONVERSATIONS, convId);
    await updateDoc(convRef, { unreadCount: 0 });
    return { success: true };
  }
};

