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
        const result = await userService.getUser(firebaseUser.uid);
        if (result.success && result.data) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...result.data
          });
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Utilisateur',
            initials: 'U',
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
      return { success: false, error: 'Email ou mot de passe incorrect' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userResult = await userService.getUser(result.user.uid);
      if (!userResult.success) {
        await userService.createUser({
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName || 'Utilisateur',
          initials: (result.user.displayName?.charAt(0) || 'U').toUpperCase(),
          role: 'etudiant'
        });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const register = async (userData) => {
    try {
      const { email, password, prenom, nom } = userData;
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      const fullName = `${prenom} ${nom}`.trim();
      const initials = `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();

      await userService.createUser({
        uid: result.user.uid,
        email,
        name: fullName,
        initials,
        role: userData.role || 'etudiant',
        promotion: userData.promotion || '',
        bio: ''
      });

      return { success: true };
    } catch (err) {
      let msg = 'Erreur inscription';
      if (err.code === 'auth/email-already-in-use') msg = 'Cet email est déjà utilisé';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
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

