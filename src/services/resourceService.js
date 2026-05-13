// src/services/resourceService.js
import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, increment, arrayUnion, arrayRemove
} from 'firebase/firestore';

const RESOURCES = 'resources';
const CLOUD_NAME = 'dgil48bqm';
const UPLOAD_PRESET = 'univercity';

export const resourceService = {

  // ============ UPLOAD ============
  async uploadResource(file, data, userId, user) {
    try {
      console.log('📤 Upload...');
      console.log('📄 Type:', data.type);
      console.log('📄 Fichier:', file.name);
      
      let fileUrl;
      
      // Pour les PDF et documents, utiliser Cloudinary en RAW
      if (data.type === 'pdf' || data.type === 'doc' || data.type === 'other') {
        console.log('📄 Upload vers Cloudinary (RAW)...');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'univercity/resources');
        
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
          { method: 'POST', body: formData }
        );
        
        const cloudinaryData = await response.json();
        if (!response.ok) throw new Error(cloudinaryData.error?.message);
        fileUrl = cloudinaryData.secure_url;
        console.log('✅ Cloudinary RAW URL:', fileUrl);
      } 
      // Pour les images, utiliser Cloudinary image
      else {
        console.log('🖼️ Upload vers Cloudinary...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'univercity/resources');
        
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );
        
        const cloudinaryData = await response.json();
        if (!response.ok) throw new Error(cloudinaryData.error?.message);
        fileUrl = cloudinaryData.secure_url;
        console.log('✅ Cloudinary URL:', fileUrl);
      }
      
      // Créer la ressource dans Firestore
      const resourceData = {
        title: data.title,
        description: data.description,
        type: data.type,
        subject: data.subject,
        level: data.level,
        fileUrl: fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: userId,
        uploaderName: user.name,
        uploaderInitials: user.initials || user.name?.charAt(0) || 'U',
        uploaderAvatarBg: user.avatarBg || '#6c63ff',
        groupId: data.groupId || null,
        downloads: 0,
        likes: 0,
        likedBy: [],
        tags: data.tags || [],
        createdAt: Timestamp.now(),
        status: 'active'
      };
      
      const docRef = await addDoc(collection(db, RESOURCES), resourceData);
      console.log('✅ Ressource créée dans Firestore:', docRef.id);
      
      return { success: true, id: docRef.id, url: fileUrl };
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ RÉCUPÉRATION DES RESSOURCES ============
  async getResources(filters = {}) {
    try {
      let constraints = [where('status', '==', 'active'), orderBy('createdAt', 'desc')];
      
      if (filters.type && filters.type !== 'all') {
        constraints.unshift(where('type', '==', filters.type));
      }
      if (filters.subject && filters.subject !== 'all') {
        constraints.unshift(where('subject', '==', filters.subject));
      }
      if (filters.level && filters.level !== 'all') {
        constraints.unshift(where('level', '==', filters.level));
      }
      if (filters.groupId && filters.groupId !== 'all') {
        constraints.unshift(where('groupId', '==', filters.groupId));
      }
      
      constraints.push(limit(50));
      const q = query(collection(db, RESOURCES), ...constraints);
      const snapshot = await getDocs(q);
      
      const resources = [];
      snapshot.forEach(doc => {
        resources.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: resources };
    } catch (error) {
      console.error('Get resources error:', error);
      return { success: true, data: [] };
    }
  },

  // ============ RECHERCHE ============
  async searchResources(searchTerm) {
    try {
      const q = query(
        collection(db, RESOURCES),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      
      const resources = [];
      const term = searchTerm.toLowerCase();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.title?.toLowerCase().includes(term) || 
            data.description?.toLowerCase().includes(term) ||
            data.tags?.some(tag => tag.toLowerCase().includes(term))) {
          resources.push({ id: doc.id, ...data });
        }
      });
      return { success: true, data: resources };
    } catch (error) {
      console.error('Search error:', error);
      return { success: true, data: [] };
    }
  },

  // ============ TÉLÉCHARGEMENT AVEC API SIGNATURE ============
  async downloadResource(resource) {
    try {
      console.log('📥 Téléchargement:', resource.title);
      console.log('🔗 URL originale:', resource.fileUrl);
      
      // Si c'est une image (pas besoin de signature)
      if (resource.type === 'image') {
        window.open(resource.fileUrl, '_blank');
        
        // Incrémenter compteur
        try {
          const resourceRef = doc(db, RESOURCES, resource.id);
          await updateDoc(resourceRef, { downloads: increment(1) });
        } catch (e) {}
        
        return { success: true };
      }
      
      // Pour les PDF, appeler l'API de signature
      console.log('🔐 Demande de signature à l\'API...');
      const response = await fetch(`/api/sign-pdf?url=${encodeURIComponent(resource.fileUrl)}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la signature');
      }
      
      console.log('✅ URL signée reçue');
      console.log('🔗 URL signée:', data.url);
      
      // Ouvrir l'URL signée
      window.open(data.url, '_blank');
      
      // Incrémenter le compteur
      try {
        const resourceRef = doc(db, RESOURCES, resource.id);
        await updateDoc(resourceRef, { downloads: increment(1) });
        console.log('✅ Compteur mis à jour');
      } catch (e) {
        console.warn('⚠️ Compteur non incrémenté');
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      alert('Erreur lors du téléchargement. Réessaie plus tard.');
      return { success: false, error: error.message };
    }
  },

  // ============ SUPPRESSION ============
  async deleteResource(resourceId) {
    try {
      console.log('🗑️ Suppression ressource:', resourceId);
      const resourceRef = doc(db, RESOURCES, resourceId);
      await deleteDoc(resourceRef);
      console.log('✅ Ressource supprimée');
      return { success: true };
    } catch (error) {
      console.error('❌ Delete error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ LIKES ============
  async toggleLike(resourceId, userId) {
    try {
      const ref = doc(db, RESOURCES, resourceId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false };
      
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
    } catch (error) {
      console.error('Like error:', error);
      return { success: false };
    }
  },

  // ============ TOP CONTRIBUTEURS ============
  async getTopContributors(limitCount = 5) {
    try {
      const q = query(collection(db, RESOURCES), where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      
      const contributorMap = new Map();
      snapshot.forEach(doc => {
        const data = doc.data();
        const uid = data.uploadedBy;
        if (!contributorMap.has(uid)) {
          contributorMap.set(uid, {
            uid,
            name: data.uploaderName,
            initials: data.uploaderInitials,
            avatarBg: data.uploaderAvatarBg,
            count: 0,
            totalDownloads: 0
          });
        }
        const contributor = contributorMap.get(uid);
        contributor.count++;
        contributor.totalDownloads += data.downloads || 0;
      });
      
      const contributors = Array.from(contributorMap.values());
      contributors.sort((a, b) => b.count - a.count);
      return { success: true, data: contributors.slice(0, limitCount) };
    } catch (error) {
      console.error('Top contributors error:', error);
      return { success: true, data: [] };
    }
  },

  // ============ UTILITAIRES ============
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
};
