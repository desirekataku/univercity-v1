import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, limit, Timestamp, increment
} from 'firebase/firestore';

const USERS = 'users';

export const userService = {
  async createUser(userData) {
    const usersRef = collection(db, USERS);
    const now = Timestamp.now();
    const docRef = await addDoc(usersRef, {
      ...userData,
      createdAt: now,
      updatedAt: now,
      followers: 0,
      following: 0,
      status: 'active'
    });
    return { success: true, id: docRef.id };
  },

  async getUser(uid) {
    const usersRef = collection(db, USERS);
    const q = query(usersRef, where('uid', '==', uid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return { success: false, error: 'Utilisateur non trouvé' };
    let data;
    snapshot.forEach(doc => { data = { id: doc.id, ...doc.data() }; });
    return { success: true, data };
  },

  async getUserById(docId) {
    const userRef = doc(db, USERS, docId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { success: false };
    return { success: true, data: { id: snap.id, ...snap.data() } };
  },

  async updateUser(uid, updates) {
    const result = await this.getUser(uid);
    if (!result.success) return result;
    const userRef = doc(db, USERS, result.data.id);
    await updateDoc(userRef, { ...updates, updatedAt: Timestamp.now() });
    return { success: true };
  },

  async searchUsers(searchTerm) {
    const usersRef = collection(db, USERS);
    const q = query(usersRef, where('status', '==', 'active'), limit(50));
    const snapshot = await getDocs(q);
    const users = [];
    const term = searchTerm.toLowerCase();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.name?.toLowerCase().includes(term)) {
        users.push({ id: doc.id, ...data });
      }
    });
    return { success: true, data: users };
  },

  async getSuggestedUsers(currentUid) {
    const usersRef = collection(db, USERS);
    const q = query(usersRef, where('status', '==', 'active'), limit(20));
    const snapshot = await getDocs(q);
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.uid !== currentUid) users.push({ id: doc.id, ...data });
    });
    return { success: true, data: users };
  },

  async followUser(currentUid, targetUid) {
    const current = await this.getUser(currentUid);
    const target = await this.getUser(targetUid);
    if (!current.success || !target.success) return { success: false };
    
    const currentRef = doc(db, USERS, current.data.id);
    const targetRef = doc(db, USERS, target.data.id);
    
    await updateDoc(currentRef, { following: increment(1) });
    await updateDoc(targetRef, { followers: increment(1) });
    
    return { success: true };
  },

  async unfollowUser(currentUid, targetUid) {
    const current = await this.getUser(currentUid);
    const target = await this.getUser(targetUid);
    if (!current.success || !target.success) return { success: false };
    
    const currentRef = doc(db, USERS, current.data.id);
    const targetRef = doc(db, USERS, target.data.id);
    
    await updateDoc(currentRef, { following: increment(-1) });
    await updateDoc(targetRef, { followers: increment(-1) });
    
    return { success: true };
  },

  async isFollowing(currentUid, targetUid) {
    return { success: true, following: false };
  },

  async getFriends(uid) {
    return this.getSuggestedUsers(uid);
  }
};
