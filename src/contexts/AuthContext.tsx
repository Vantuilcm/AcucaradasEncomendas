import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, getDb, authFunctions, dbFunctions } from '../config/firebase';
import { TwoFactorAuthService } from '../services/TwoFactorAuthService';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Versão Lazy-Getter
 * O app usa Lazy Getters para garantir que o Firebase NUNCA
 * seja carregado durante o boot do aplicativo no topo do arquivo.
 */

// Interface completa restaurada
interface AuthContextData {
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  profileLoading: boolean;
  isReady: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  register: (userData: any, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (userData: any) => Promise<void>;
  validateSession: () => Promise<boolean>;
  refreshUserActivity: () => void;
  verify2FACode: (code: string) => Promise<boolean>;
  generate2FACode: () => Promise<void>;
  is2FAEnabled?: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const bootstrapLazyFirebase = async () => {
      try {
        console.log('🛡️ [AUTH] Initializing Lazy Firebase with Getters...');
        
        const auth = getAuth();
        const db = getDb();

        // Configurar o observador de estado do usuário usando a função lazy
        authFunctions.onAuthStateChanged(auth, async (firebaseUser: any) => {
          if (firebaseUser) {
            console.log('👤 [AUTH] User found:', firebaseUser.email);
            try {
              // Buscar dados extras do Firestore
              const userRef = dbFunctions.doc(db, 'users', firebaseUser.uid);
              const userDoc = await dbFunctions.getDoc(userRef);
              
              if (userDoc.exists()) {
                const data = userDoc.data();
                setUser({ ...data, id: firebaseUser.uid });
              } else {
                setUser({ 
                  id: firebaseUser.uid, 
                  email: firebaseUser.email, 
                  nome: firebaseUser.displayName || '' 
                });
              }
            } catch (err) {
              console.error('❌ [AUTH] Error fetching user profile:', err);
              setUser({ 
                id: firebaseUser.uid, 
                email: firebaseUser.email, 
                nome: firebaseUser.displayName || '' 
              });
            }
          } else {
            console.log('👤 [AUTH] No user found.');
            setUser(null);
          }
          setLoading(false);
          setIsReady(true);
        });
      } catch (e) {
        console.error('❌ [AUTH] Fatal Lazy Load Error:', e);
        setLoading(false);
        setIsReady(true);
      }
    };

    // Pequeno delay para garantir que o motor nativo está pronto
    const timer = setTimeout(bootstrapLazyFirebase, 250);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string, role?: string) => {
    try {
      setLoading(true);
      console.log('🛡️ [AUTH] Attempting login for:', email);
      
      const auth = getAuth();
      const db = getDb();

      console.log('🛡️ [AUTH] Calling signInWithEmailAndPassword...');
      const userCredential = await authFunctions.signInWithEmailAndPassword(auth, email, password);
      console.log('✅ [AUTH] Login success for user UID:', userCredential.user.uid);
      
      // Forçar busca de perfil após login
      const userRef = dbFunctions.doc(db, 'users', userCredential.user.uid);
      console.log('🛡️ [AUTH] Fetching user profile from Firestore...');
      const userDoc = await dbFunctions.getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('✅ [AUTH] User profile found in Firestore with role:', data.role);
        setUser({ ...data, id: userCredential.user.uid });
      } else {
        console.warn('⚠️ [AUTH] User profile not found in Firestore. Using defaults.');
        setUser({ 
          id: userCredential.user.uid, 
          email: userCredential.user.email, 
          nome: userCredential.user.displayName || '',
          role: role || 'customer'
        });
      }
    } catch (error: any) {
      console.error('❌ [AUTH] Detailed Login Error:', {
        code: error.code,
        message: error.message
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any, password: string) => {
    try {
      setLoading(true);
      const auth = getAuth();
      const db = getDb();
      const userCredential = await authFunctions.createUserWithEmailAndPassword(auth, userData.email, password);
      
      // Criar doc no Firestore
      const userDoc = {
        uid: userCredential.user.uid,
        email: userData.email,
        nome: userData.nome || userData.name || '',
        role: userData.role || 'customer',
        createdAt: dbFunctions.serverTimestamp(),
        updatedAt: dbFunctions.serverTimestamp()
      };
      
      await dbFunctions.setDoc(dbFunctions.doc(db, 'users', userCredential.user.uid), userDoc);
      setUser({ ...userDoc, id: userCredential.user.uid });
      console.log('✅ [AUTH] Register success');
    } catch (error) {
      console.error('❌ [AUTH] Register error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authFunctions.signOut(getAuth());
      setUser(null);
    } catch (error) {
      console.error('❌ [AUTH] Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    await authFunctions.sendPasswordResetEmail(getAuth(), email);
  };

  const updateUser = async (userData: any) => {
    if (!user) return;
    const db = getDb();
    const userRef = dbFunctions.doc(db, 'users', user.id);
    await dbFunctions.updateDoc(userRef, userData);
    setUser((prev: any) => ({ ...prev, ...userData }));
  };

  const validateSession = async () => true;
  const refreshUserActivity = () => {};

  const verify2FACode = async (code: string) => {
    const tfaService = new TwoFactorAuthService();
    const result = await tfaService.verifyCode(code);
    return result.success;
  };

  const generate2FACode = async () => {
    const tfaService = new TwoFactorAuthService();
    await tfaService.generateAndSendVerificationCode();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        profileLoading: false,
        isReady,
        login,
        register,
        logout,
        resetPassword,
        updateUser,
        validateSession,
        refreshUserActivity,
        verify2FACode,
        generate2FACode,
        is2FAEnabled: user?.twoFactorEnabled || false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
