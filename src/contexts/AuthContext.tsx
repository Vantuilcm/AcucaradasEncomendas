import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Fase 1.3.7: FIREBASE LAZY LOADING
 * O build 908 provou que o crash acontece no IMPORT estático.
 * Esta versão implementa a solução definitiva: Carregamento sob demanda (Lazy).
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
  const [firebaseInstance, setFirebaseInstance] = useState<any>(null);

  useEffect(() => {
    const bootstrapLazyFirebase = async () => {
      try {
        console.log('🛡️ [AUTH] Starting Lazy Firebase Load...');
        
        // 🚀 O SEGREDO: Importar o Firebase apenas DEPOIS que o app já está montado
        // Isso evita que o erro de linkagem nativa mate o processo de boot.
        const firebaseModule: any = await import('../config/firebase');
        const authModule: any = await import('firebase/auth');
        const firestoreModule: any = await import('firebase/firestore');
        
        if (firebaseModule && firebaseModule.auth) {
          console.log('✅ [AUTH] Firebase Lazy Loaded successfully!');
          
          // Resolver o problema de importação modular que às vezes coloca tudo em .default
          const authFunctions = authModule.onAuthStateChanged ? authModule : authModule.default;
          const firestoreFunctions = firestoreModule.doc ? firestoreModule : firestoreModule.default;

          setFirebaseInstance({
            ...firebaseModule,
            authFunctions,
            firestoreFunctions
          });

          // Configurar o observador de estado do usuário
          authFunctions.onAuthStateChanged(firebaseModule.auth, async (firebaseUser: any) => {
            if (firebaseUser) {
              console.log('👤 [AUTH] User found:', firebaseUser.email);
              // Buscar dados extras do Firestore
              const userRef = firestoreModule.doc(firebaseModule.db, 'users', firebaseUser.uid);
              const userDoc = await firestoreModule.getDoc(userRef);
              
              if (userDoc.exists()) {
                setUser({ ...userDoc.data(), id: firebaseUser.uid });
              } else {
                setUser({ 
                  id: firebaseUser.uid, 
                  email: firebaseUser.email, 
                  name: firebaseUser.displayName 
                });
              }
            } else {
              console.log('👤 [AUTH] No user found.');
              setUser(null);
            }
            setLoading(false);
          });
        }
      } catch (e) {
        console.error('❌ [AUTH] Fatal Lazy Load Error:', e);
        setLoading(false);
      } finally {
        setIsReady(true);
      }
    };

    // Pequeno delay extra para garantir que a UI principal já rendenizou
    const timer = setTimeout(bootstrapLazyFirebase, 800);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string) => {
    if (!firebaseInstance) throw new Error("Firebase not initialized yet");
    try {
      setLoading(true);
      const { authFunctions, auth } = firebaseInstance;
      const userCredential = await authFunctions.signInWithEmailAndPassword(auth, email, password);
      console.log('✅ [AUTH] Login success:', userCredential.user.email);
    } catch (error) {
      console.error('❌ [AUTH] Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any, password: string) => {
    if (!firebaseInstance) throw new Error("Firebase not initialized yet");
    try {
      setLoading(true);
      const { authFunctions, firestoreFunctions, auth, db } = firebaseInstance;
      const userCredential = await authFunctions.createUserWithEmailAndPassword(auth, userData.email, password);
      
      // Criar doc no Firestore
      const userDoc = {
        uid: userCredential.user.uid,
        email: userData.email,
        name: userData.name,
        createdAt: firestoreFunctions.serverTimestamp(),
        role: 'customer'
      };
      
      await firestoreFunctions.setDoc(firestoreFunctions.doc(db, 'users', userCredential.user.uid), userDoc);
      console.log('✅ [AUTH] Register success');
    } catch (error) {
      console.error('❌ [AUTH] Register error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!firebaseInstance) return;
    try {
      await firebaseInstance.authFunctions.signOut(firebaseInstance.auth);
      setUser(null);
    } catch (error) {
      console.error('❌ [AUTH] Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    if (!firebaseInstance) throw new Error("Firebase not initialized yet");
    await firebaseInstance.authFunctions.sendPasswordResetEmail(firebaseInstance.auth, email);
  };

  const updateUser = async (userData: any) => {
    if (!firebaseInstance || !user) return;
    const { firestoreFunctions, db } = firebaseInstance;
    const userRef = firestoreFunctions.doc(db, 'users', user.id);
    await firestoreFunctions.updateDoc(userRef, userData);
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
