import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { View, Text } from 'react-native';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Fase 1.3.3: Auth EXTREME VACUUM
 * Removendo TODAS as importações de bibliotecas externas (Expo Auth Session, Firebase, etc.)
 * para descartar crash de linkagem nativa no momento do import.
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
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('🛡️ [AUTH] Extreme Vacuum initialized.');
    setLoading(false);
    setIsReady(true);
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
