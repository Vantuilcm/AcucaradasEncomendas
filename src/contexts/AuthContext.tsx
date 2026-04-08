import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Fase 1.3.6: FIREBASE DEFERRED (Zero Import Crash)
 * Esta fase remove o import do Firebase do topo do arquivo e o move para dentro do ciclo de vida.
 * Se o build 908 abrir, confirmamos que o crash acontece no momento do 'import' (linkagem nativa).
 */

// Interface mínima
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
  const [user] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('🛡️ [AUTH] Deferred Init sequence starting...');
        
        // 🧪 EXPERIMENTO: Importação Dinâmica (Lazy Load)
        // Se o crash for na linkagem, este código nunca chegará a rodar, 
        // mas o app pelo menos passará da logo se o import no topo for removido.
        
        /* 
        const { db } = await import('../config/firebase');
        console.log('🛡️ [AUTH] Lazy Firestore check:', !!db);
        */

      } catch (e) {
        console.error('🛡️ [AUTH] Caught crash during deferred init:', e);
      } finally {
        setLoading(false);
        setIsReady(true);
      }
    };
    init();
  }, []);

  const login = async () => {};
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
