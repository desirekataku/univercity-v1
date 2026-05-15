// src/services/messageService.js
import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, limit, Timestamp, onSnapshot
} from 'firebase/firestore';
import { notificationService } from './notificationService';

const CONVERSATIONS = 'conversations';
const MESSAGES = 'messages';

export const messageService = {

  async getOrCreateConversation(user1Id, user2Id) {
    try {
      const ref = collection(db, CONVERSATIONS);
      const q = query(ref, where('participants', 'array-contains', user1Id));
      const snapshot = await getDocs(q);
      
      let conv = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(user2Id) && !data.isGroup) {
          conv = { id: doc.id, ...data };
        }
      });

      if (conv) return { success: true, data: conv };

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
    } catch (error) {
      console.error('Get or create conversation error:', error);
      return { success: false, error: error.message };
    }
  },

  async getUserConversations(userId) {
    try {
      const ref = collection(db, CONVERSATIONS);
      const q = query(ref, where('participants', 'array-contains', userId), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const conversations = [];
      snapshot.forEach(doc => conversations.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: conversations };
    } catch (error) {
      console.error('Get user conversations error:', error);
      return { success: true, data: [] };
    }
  },

  async sendMessage(convId, data) {
    try {
      const msgRef = collection(db, CONVERSATIONS, convId, MESSAGES);
      const now = Timestamp.now();
      await addDoc(msgRef, {
        ...data,
        createdAt: now,
        read: false
      });

      const convRef = doc(db, CONVERSATIONS, convId);
      const convSnap = await getDoc(convRef);
      const convData = convSnap.data();
      
      if (!convData.isGroup) {
        const otherParticipant = convData.participants.find(id => id !== data.senderId);
        if (otherParticipant) {
          await notificationService.createNotification({
            userId: otherParticipant,
            type: 'message',
            title: 'Nouveau message',
            message: `${data.senderName || 'Quelqu\'un'} vous a envoyé un message`,
            data: { 
              convId: convId,
              message: data.content?.substring(0, 50),
              senderId: data.senderId,
              senderName: data.senderName
            }
          });
        }
      }

      await updateDoc(convRef, {
        lastMessage: data.content?.substring(0, 50) || '📎 Fichier',
        lastMessageTime: now,
        updatedAt: now
      });

      return { success: true };
    } catch (error) {
      console.error('Send message error:', error);
      return { success: false };
    }
  },

  async getMessages(convId) {
    try {
      const ref = collection(db, CONVERSATIONS, convId, MESSAGES);
      const q = query(ref, orderBy('createdAt', 'asc'), limit(100));
      const snapshot = await getDocs(q);
      const messages = [];
      snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: messages };
    } catch (error) {
      console.error('Get messages error:', error);
      return { success: true, data: [] };
    }
  },

  subscribeToMessages(convId, callback) {
    const ref = collection(db, CONVERSATIONS, convId, MESSAGES);
    const q = query(ref, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
      callback(messages);
    });
  },

  async markAsRead(convId) {
    try {
      const convRef = doc(db, CONVERSATIONS, convId);
      await updateDoc(convRef, { unreadCount: 0 });
      return { success: true };
    } catch (error) {
      console.error('Mark as read error:', error);
      return { success: false };
    }
  },

  // ✅ FONCTION AJOUTÉE
  async markConversationAsRead(convId, userId) {
    try {
      const messagesRef = collection(db, CONVERSATIONS, convId, MESSAGES);
      const q = query(
        messagesRef,
        where('read', '==', false),
        where('senderId', '!=', userId)
      );
      const snapshot = await getDocs(q);
      
      const promises = [];
      snapshot.forEach(doc => {
        promises.push(updateDoc(doc.ref, { read: true }));
      });
      await Promise.all(promises);
      
      return { success: true };
    } catch (error) {
      console.error('Mark conversation as read error:', error);
      return { success: false };
    }
  }
};
