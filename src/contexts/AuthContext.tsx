import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, a, f } from '../config/firebase';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Versão Ultra-Lazy
 * O app usa Proxy-Lazy-Loading para garantir que o Firebase NUNCA
 * seja carregado durante o boot do aplicativo.
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
        console.log('🛡️ [AUTH] Initializing Lazy Firebase...');
        
        // No React Native, precisamos garantir que o Auth está inicializado 
        // antes de configurar o observer. Acessar 'currentUser' força a inicialização no Proxy.
        const firebaseAuth = auth;
        const _initialUser = firebaseAuth.currentUser; 

        // Configurar o observador de estado do usuário
        a.onAuthStateChanged(firebaseAuth, async (firebaseUser: any) => {
          if (firebaseUser) {
            console.log('👤 [AUTH] User found:', firebaseUser.email);
            try {
              // Buscar dados extras do Firestore
              const userRef = f.doc(db, 'users', firebaseUser.uid);
              const userDoc = await f.getDoc(userRef);
              
              if (userDoc.exists()) {
                const data = userDoc.data();
                setUser({ ...data, id: firebaseUser.uid } as User);
              } else {
                setUser({ 
                  id: firebaseUser.uid, 
                  email: firebaseUser.email, 
                  nome: firebaseUser.displayName || '' 
                } as User);
              }
            } catch (err) {
              console.error('❌ [AUTH] Error fetching user profile:', err);
              setUser({ 
                id: firebaseUser.uid, 
                email: firebaseUser.email, 
                nome: firebaseUser.displayName || '' 
              } as User);
            }
          } else {
            console.log('👤 [AUTH] No user found.');
            setUser(null);
          }
          setLoading(false);
        });
      } catch (e) {
        console.error('❌ [AUTH] Fatal Lazy Load Error:', e);
        setLoading(false);
      } finally {
        setIsReady(true);
      }
    };

    // Pequeno delay para garantir que o motor nativo está pronto
    const timer = setTimeout(bootstrapLazyFirebase, 500);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await a.signInWithEmailAndPassword(auth, email, password);
      console.log('✅ [AUTH] Login success:', userCredential.user.email);
    } catch (error) {
      console.error('❌ [AUTH] Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any, password: string) => {
    try {
      setLoading(true);
      const userCredential = await a.createUserWithEmailAndPassword(auth, userData.email, password);
      
      // Criar doc no Firestore
      const userDoc = {
        uid: userCredential.user.uid,
        email: userData.email,
        name: userData.name,
        createdAt: f.serverTimestamp(),
        role: 'customer'
      };
      
      await f.setDoc(f.doc(db, 'users', userCredential.user.uid), userDoc);
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
      await a.signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('❌ [AUTH] Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    await a.sendPasswordResetEmail(auth, email);
  };

  const updateUser = async (userData: any) => {
    if (!user) return;
    const userRef = f.doc(db, 'users', user.id);
    await f.updateDoc(userRef, userData);
    setUser((prev: any) => ({ ...prev, ...userData }));
  };

  const validateSession = async () => true;
  const refreshUserActivity = () => {};

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
        is2FAEnabled: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
