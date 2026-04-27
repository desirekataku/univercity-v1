import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, limit, arrayUnion, arrayRemove,
  increment, Timestamp
} from 'firebase/firestore';

const POSTS = 'posts';

export const postService = {

  // Créer un post dans un groupe
  async createPost(data) {
    const ref = collection(db, POSTS);
    const now = Timestamp.now();
    const docRef = await addDoc(ref, {
      ...data,
      likes: 0,
      comments: 0,
      likedBy: [],
      createdAt: now,
      status: 'active'
    });

    // Incrémenter le compteur de posts du groupe
    if (data.groupId) {
      const groupRef = doc(db, 'groups', data.groupId);
      await updateDoc(groupRef, { posts: increment(1) });
    }

    return { success: true, id: docRef.id };
  },

  // Récupérer les posts d'un groupe
  async getGroupPosts(groupId) {
    const ref = collection(db, POSTS);
    const q = query(
      ref,
      where('groupId', '==', groupId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const posts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        time: this.formatTime(data.createdAt)
      });
    });
    return { success: true, data: posts };
  },

  // Récupérer les posts de tous les groupes d'un utilisateur (pour le feed)
  async getFeedPosts(userId, userGroups) {
    if (!userGroups || userGroups.length === 0) {
      return { success: true, data: [] };
    }

    const allPosts = [];
    for (const groupId of userGroups) {
      const result = await this.getGroupPosts(groupId);
      if (result.success) {
        allPosts.push(...result.data);
      }
    }

    // Trier par date
    allPosts.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

    return { success: true, data: allPosts.slice(0, 50) };
  },

  // Liker / Unliker un post
  async toggleLike(postId, userId) {
    const ref = doc(db, POSTS, postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { success: false, error: 'Post non trouvé' };

    const data = snap.data();
    const hasLiked = data.likedBy?.includes(userId);

    if (hasLiked) {
      await updateDoc(ref, {
        likes: increment(-1),
        likedBy: arrayRemove(userId)
      });
    } else {
      await updateDoc(ref, {
        likes: increment(1),
        likedBy: arrayUnion(userId)
      });
    }

    return { success: true, liked: !hasLiked };
  },

  // Ajouter un commentaire
  async addComment(postId, data) {
    const commentsRef = collection(db, POSTS, postId, 'comments');
    const now = Timestamp.now();
    await addDoc(commentsRef, {
      ...data,
      likes: 0,
      createdAt: now
    });

    await updateDoc(doc(db, POSTS, postId), {
      comments: increment(1)
    });

    return { success: true };
  },

  // Récupérer les commentaires d'un post
  async getComments(postId) {
    const ref = collection(db, POSTS, postId, 'comments');
    const q = query(ref, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    const comments = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        time: this.formatTime(data.createdAt)
      });
    });
    return { success: true, data: comments };
  },

  // Formater le temps
  formatTime(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const past = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((now - past) / 1000);

    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
    return past.toLocaleDateString('fr-FR');
  }
};

