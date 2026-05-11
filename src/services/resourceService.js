// src/services/resourceService.js
import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, increment, arrayUnion, arrayRemove
} from 'firebase/firestore';

const RESOURCES = 'resources';

// Configuration Cloudinary
const CLOUD_NAME = 'dgil48bqm';
const UPLOAD_PRESET = 'univercity';

export const resourceService = {

  // Upload vers Cloudinary
  async uploadResource(file, data, userId, user) {
    try {
      console.log('📤 Upload vers Cloudinary...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'univercity/resources');
      
      // Ajouter des tags pour la recherche
      if (data.tags && data.tags.length) {
        formData.append('tags', data.tags.join(','));
      }
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        { method: 'POST', body: formData }
      );
      
      const cloudinaryData = await response.json();
      
      if (!response.ok) {
        throw new Error(cloudinaryData.error?.message || 'Upload échoué');
      }
      
      console.log('✅ Upload réussi:', cloudinaryData.secure_url);
      
      // Créer la ressource dans Firestore
      const resourceData = {
        title: data.title,
        description: data.description,
        type: data.type,
        subject: data.subject,
        level: data.level,
        fileUrl: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
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
      
      return { success: true, id: docRef.id, url: cloudinaryData.secure_url };
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      return { success: false, error: error.message };
    }
  },

  // Récupérer toutes les ressources
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

  // Rechercher des ressources
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
      return { success: true, data: [] };
    }
  },

  // Générer une URL de téléchargement avec transformation Cloudinary
  getDownloadUrl(resource, options = {}) {
    const baseUrl = resource.fileUrl;
    
    // Paramètres de transformation Cloudinary
    const transformations = [];
    
    // Forcer le téléchargement (fl_attachment)
    if (options.forceDownload !== false) {
      transformations.push('fl_attachment');
    }
    
    // Pour les PDF, on peut ajouter des options
    if (resource.type === 'pdf') {
      // 'pg_1' pour la première page en aperçu si besoin
      if (options.preview) {
        transformations.push('pg_1');
      }
    }
    
    // Appliquer les transformations
    if (transformations.length > 0) {
      const transformString = transformations.join(',');
      return baseUrl.replace('/upload/', `/upload/${transformString}/`);
    }
    
    return baseUrl;
  },

  // Télécharger une ressource
  async downloadResource(resource) {
    try {
      console.log('📥 Téléchargement:', resource.title);
      
      // 1. Incrémenter le compteur de téléchargements
      const resourceRef = doc(db, RESOURCES, resource.id);
      await updateDoc(resourceRef, {
        downloads: increment(1)
      });
      
      // 2. Générer l'URL de téléchargement forcé
      const downloadUrl = this.getDownloadUrl(resource, { forceDownload: true });
      
      console.log('🔗 URL de téléchargement:', downloadUrl);
      
      // 3. Créer un lien invisible pour forcer le téléchargement
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = resource.fileName || 'document.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 4. Alternative si le lien ne fonctionne pas
      setTimeout(() => {
        window.open(downloadUrl, '_blank');
      }, 100);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      // Fallback : ouvrir l'URL directement
      window.open(resource.fileUrl, '_blank');
      return { success: false, error: error.message };
    }
  },

  // Aperçu du fichier (pour les PDF)
  async previewResource(resource) {
    try {
      const previewUrl = this.getDownloadUrl(resource, { preview: true, forceDownload: false });
      window.open(previewUrl, '_blank');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Liker/Unliker
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
      return { success: false };
    }
  },

  // Supprimer une ressource
  async deleteResource(resourceId, publicId) {
    try {
      await deleteDoc(doc(db, RESOURCES, resourceId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Top contributeurs
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
      return { success: true, data: [] };
    }
  },

  // Formater taille fichier
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
};
