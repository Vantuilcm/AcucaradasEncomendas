import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Fase 1.3.5: FIREBASE SAFE REINTRODUCTION
 * Reintroduzindo o Firebase com proteção contra crash fatal na inicialização.
 * Se o build 905 abrir, conseguimos "domar" o Firebase.
 */

// REINTRODUZINDO FIREBASE COM WRAPPER DE SEGURANÇA
import { db, auth } from '../config/firebase';

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
        console.log('🛡️ [AUTH] Safe Firebase Init sequence started...');
        // Tentar acessar uma propriedade do db para forçar resolução do import
        console.log('🛡️ [AUTH] Firestore availability:', !!db);
        console.log('🛡️ [AUTH] Auth availability:', !!auth);
      } catch (e) {
        console.error('🛡️ [AUTH] Caught crash during Firebase access:', e);
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
