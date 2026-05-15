// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { userService } from '../services/userService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const result = await userService.getUser(firebaseUser.uid);
          if (result.success && result.data) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              avatarBg: result.data.avatarBg || '#1B4FD8',
              ...result.data
            });
          } else {
            // Utilisateur existe dans Firebase Auth mais pas dans Firestore
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'Utilisateur',
              initials: (firebaseUser.displayName?.charAt(0) || 'U').toUpperCase(),
              avatarBg: '#1B4FD8',
              role: 'etudiant',
              bio: '',
              promotion: ''
            });
          }
        } catch (error) {
          console.error('Erreur chargement utilisateur:', error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Utilisateur',
            initials: 'U',
            avatarBg: '#1B4FD8',
            role: 'etudiant'
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err) {
      let message = 'Email ou mot de passe incorrect';
      if (err.code === 'auth/user-not-found') message = 'Aucun compte associé à cet email';
      if (err.code === 'auth/wrong-password') message = 'Mot de passe incorrect';
      if (err.code === 'auth/too-many-requests') message = 'Trop de tentatives. Réessayez plus tard';
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userResult = await userService.getUser(result.user.uid);
      if (!userResult.success) {
        const fullName = result.user.displayName || 'Utilisateur';
        const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        await userService.createUser({
          uid: result.user.uid,
          email: result.user.email,
          name: fullName,
          initials: initials,
          avatarBg: '#1B4FD8',
          role: 'etudiant',
          promotion: '',
          bio: ''
        });
      }
      return { success: true };
    } catch (err) {
      console.error('Google login error:', err);
      return { success: false, error: err.message };
    }
  };

  const register = async (userData) => {
    try {
      const { email, password, prenom, nom, promotion } = userData;
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      const fullName = `${prenom} ${nom}`.trim();
      const initials = `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();

      await userService.createUser({
        uid: result.user.uid,
        email: email,
        name: fullName,
        initials: initials,
        avatarBg: '#1B4FD8',
        role: userData.role || 'etudiant',
        promotion: promotion || '',
        bio: '',
        followers: 0,
        following: 0,
        followersList: [],
        followingList: []
      });

      return { success: true };
    } catch (err) {
      console.error('Register error:', err);
      let msg = 'Erreur lors de l\'inscription';
      if (err.code === 'auth/email-already-in-use') msg = 'Cet email est déjà utilisé';
      if (err.code === 'auth/weak-password') msg = 'Le mot de passe doit contenir au moins 6 caractères';
      if (err.code === 'auth/invalid-email') msg = 'Email invalide';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    isAuthenticated: !!user,
    isChefPromo: user?.role === 'chef_promo'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
};
