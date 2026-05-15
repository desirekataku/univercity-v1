// src/services/groupService.js
import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, arrayUnion, arrayRemove,
  increment, Timestamp
} from 'firebase/firestore';

const GROUPS = 'groups';

export const groupService = {

  async createGroup(data) {
    try {
      const ref = collection(db, GROUPS);
      const now = Timestamp.now();
      const docRef = await addDoc(ref, {
        ...data,
        members: 1,
        membersList: [data.createdBy],
        admins: [data.createdBy],
        pendingRequests: [],
        posts: 0,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        visibility: data.visibility || 'public',
        icon: data.icon || '🏛️',
        bg: data.bg || '#1B4FD8'
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Create group error:', error);
      return { success: false, error: error.message };
    }
  },

  async getGroup(groupId) {
    try {
      const ref = doc(db, GROUPS, groupId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false, error: 'Groupe non trouvé' };
      return { success: true, data: { id: snap.id, ...snap.data() } };
    } catch (error) {
      console.error('Get group error:', error);
      return { success: false, error: error.message };
    }
  },

  async getAllGroups() {
    try {
      const ref = collection(db, GROUPS);
      const q = query(ref, where('status', '==', 'active'), orderBy('members', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const groups = [];
      snapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: groups };
    } catch (error) {
      console.error('Get all groups error:', error);
      return { success: true, data: [] };
    }
  },

  async getUserGroups(userId) {
    try {
      const ref = collection(db, GROUPS);
      const q = query(ref, where('membersList', 'array-contains', userId), where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      const groups = [];
      snapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: groups };
    } catch (error) {
      console.error('Get user groups error:', error);
      return { success: true, data: [] };
    }
  },

  async searchGroups(term) {
    try {
      const ref = collection(db, GROUPS);
      const q = query(ref, where('status', '==', 'active'), limit(50));
      const snapshot = await getDocs(q);
      const groups = [];
      const search = term.toLowerCase();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name?.toLowerCase().includes(search) || data.description?.toLowerCase().includes(search)) {
          groups.push({ id: doc.id, ...data });
        }
      });
      return { success: true, data: groups };
    } catch (error) {
      console.error('Search groups error:', error);
      return { success: true, data: [] };
    }
  },

  // Rejoindre directement (sans approbation)
  async joinGroup(groupId, userId) {
    try {
      const ref = doc(db, GROUPS, groupId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false, error: 'Groupe non trouvé' };
      
      const data = snap.data();
      
      if (data.membersList?.includes(userId)) {
        return { success: true, isMember: true };
      }
      
      await updateDoc(ref, {
        members: increment(1),
        membersList: arrayUnion(userId),
        updatedAt: Timestamp.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Join group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Demander à rejoindre (avec approbation)
  async requestToJoin(groupId, userId) {
    try {
      const ref = doc(db, GROUPS, groupId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false, error: 'Groupe non trouvé' };
      
      const data = snap.data();
      
      if (data.membersList?.includes(userId)) {
        return { success: true, isMember: true };
      }
      
      if (data.pendingRequests?.includes(userId)) {
        return { success: true, alreadyRequested: true };
      }
      
      await updateDoc(ref, {
        pendingRequests: arrayUnion(userId),
        updatedAt: Timestamp.now()
      });
      
      return { success: true, requestSent: true };
    } catch (error) {
      console.error('Request to join error:', error);
      return { success: false, error: error.message };
    }
  },

  // Approuver une demande (admin seulement)
  async approveRequest(groupId, userId) {
    try {
      const ref = doc(db, GROUPS, groupId);
      await updateDoc(ref, {
        members: increment(1),
        membersList: arrayUnion(userId),
        pendingRequests: arrayRemove(userId),
        updatedAt: Timestamp.now()
      });
      return { success: true };
    } catch (error) {
      console.error('Approve request error:', error);
      return { success: false };
    }
  },

  // Refuser une demande
  async rejectRequest(groupId, userId) {
    try {
      const ref = doc(db, GROUPS, groupId);
      await updateDoc(ref, {
        pendingRequests: arrayRemove(userId),
        updatedAt: Timestamp.now()
      });
      return { success: true };
    } catch (error) {
      console.error('Reject request error:', error);
      return { success: false };
    }
  },

  async leaveGroup(groupId, userId) {
    try {
      const ref = doc(db, GROUPS, groupId);
      await updateDoc(ref, {
        members: increment(-1),
        membersList: arrayRemove(userId),
        admins: arrayRemove(userId),
        updatedAt: Timestamp.now()
      });
      return { success: true };
    } catch (error) {
      console.error('Leave group error:', error);
      return { success: false };
    }
  },

  async checkMembership(groupId, userId) {
    try {
      const snap = await getDoc(doc(db, GROUPS, groupId));
      if (!snap.exists()) return { success: false, error: 'Groupe non trouvé' };
      const data = snap.data();
      return {
        success: true,
        data: {
          isMember: data.membersList?.includes(userId) || false,
          isAdmin: data.admins?.includes(userId) || false,
          hasPendingRequest: data.pendingRequests?.includes(userId) || false
        }
      };
    } catch (err) {
      console.error('Check membership error:', err);
      return { success: false, error: err.message };
    }
  },

  async addAdmin(groupId, userId) {
    try {
      const ref = doc(db, GROUPS, groupId);
      await updateDoc(ref, {
        admins: arrayUnion(userId),
        updatedAt: Timestamp.now()
      });
      return { success: true };
    } catch (error) {
      console.error('Add admin error:', error);
      return { success: false };
    }
  }
};
