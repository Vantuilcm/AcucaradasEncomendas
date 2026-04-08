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
        const firebaseModule = await import('../config/firebase');
        
        if (firebaseModule && firebaseModule.db) {
          console.log('✅ [AUTH] Firebase Lazy Loaded successfully!');
          setFirebaseInstance(firebaseModule);
        }
      } catch (e) {
        console.error('❌ [AUTH] Fatal Lazy Load Error:', e);
      } finally {
        setLoading(false);
        setIsReady(true);
      }
    };

    // Pequeno delay extra para garantir que a UI principal já rendenizou
    const timer = setTimeout(bootstrapLazyFirebase, 1000);
    return () => clearTimeout(timer);
  }, []);

  const login = async () => {
    if (!firebaseInstance) throw new Error("Firebase not initialized yet");
    console.log('Login logic will use firebaseInstance.auth');
  };

  const register = async () => {};
  const logout = async () => {};
  const resetPassword = async () => {};
  const updateUser = async () => {};
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
