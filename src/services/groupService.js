import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, limit, arrayUnion, arrayRemove,
  increment, Timestamp
} from 'firebase/firestore';

const GROUPS = 'groups';

export const groupService = {

  async createGroup(data) {
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
      visibility: data.visibility || 'public'
    });
    return { success: true, id: docRef.id };
  },

  async getGroup(groupId) {
    const ref = doc(db, GROUPS, groupId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { success: false, error: 'Groupe non trouvé' };
    return { success: true, data: { id: snap.id, ...snap.data() } };
  },

  async getAllGroups() {
    const ref = collection(db, GROUPS);
    const q = query(ref, where('status', '==', 'active'), orderBy('members', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    const groups = [];
    snapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: groups };
  },

  async getUserGroups(userId) {
    const ref = collection(db, GROUPS);
    const q = query(ref, where('membersList', 'array-contains', userId), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    const groups = [];
    snapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: groups };
  },

  async searchGroups(term) {
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
  },

  // Envoyer une demande pour rejoindre
  async requestJoin(groupId, userId) {
    const ref = doc(db, GROUPS, groupId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { success: false, error: 'Groupe non trouvé' };
    const data = snap.data();
    if (data.membersList.includes(userId)) return { success: true, isMember: true };
    if (data.pendingRequests?.includes(userId)) return { success: true, alreadyRequested: true };

    await updateDoc(ref, {
      pendingRequests: arrayUnion(userId),
      updatedAt: Timestamp.now()
    });
    return { success: true, requestSent: true };
  },

  // Approuver une demande (admin seulement)
  async approveRequest(groupId, userId) {
    const ref = doc(db, GROUPS, groupId);
    await updateDoc(ref, {
      members: increment(1),
      membersList: arrayUnion(userId),
      pendingRequests: arrayRemove(userId),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  },

  // Rejeter une demande
  async rejectRequest(groupId, userId) {
    const ref = doc(db, GROUPS, groupId);
    await updateDoc(ref, {
      pendingRequests: arrayRemove(userId),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  },

  async joinGroup(groupId, userId) {
    return this.requestJoin(groupId, userId);
  },

  async leaveGroup(groupId, userId) {
    const ref = doc(db, GROUPS, groupId);
    await updateDoc(ref, {
      members: increment(-1),
      membersList: arrayRemove(userId),
      admins: arrayRemove(userId),
      updatedAt: Timestamp.now()
    });
    return { success: true };
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
        isAdmin: data.admins?.includes(userId) || false
      }
    };
  } catch (err) {
    console.error('Erreur checkMembership:', err);
    return { success: false, error: err.message };
  }
},

  async addAdmin(groupId, userId) {
    const ref = doc(db, GROUPS, groupId);
    await updateDoc(ref, {
      admins: arrayUnion(userId),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  }
};
