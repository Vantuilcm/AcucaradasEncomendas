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
  signInWithGoogle: (role: string) => Promise<{ success: boolean; error?: string }>;
  signInWithFacebook: (role: string) => Promise<{ success: boolean; error?: string }>;
  signInWithApple: (role: string) => Promise<{ success: boolean; error?: string }>;
  is2FAEnabled?: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null); // Limpar erro anterior
      console.log('🛡️ [DEBUG_LOGIN] INICIANDO PROCESSO');
      console.log('🛡️ [DEBUG_LOGIN] Email:', email);
      
      const auth = getAuth();
      console.log('🛡️ [DEBUG_LOGIN] Instância Auth obtida:', auth ? '✅ OK' : '❌ NULL');
      
      const signInFn = authFunctions.signInWithEmailAndPassword;
      console.log('🛡️ [DEBUG_LOGIN] Função signIn encontrada:', typeof signInFn === 'function' ? '✅ OK' : '❌ NOT_A_FUNCTION');

      if (typeof signInFn !== 'function') {
        throw new Error('Módulo de Autenticação do Firebase não carregado corretamente (NOT_A_FUNCTION).');
      }

      console.log('🛡️ [DEBUG_LOGIN] Chamando Firebase SDK...');
      const userCredential = await signInFn(auth, email, password);
      console.log('✅ [DEBUG_LOGIN] SUCESSO SDK! UID:', userCredential.user.uid);
      
      const db = getDb();
      const userRef = dbFunctions.doc(db, 'users', userCredential.user.uid);
      console.log('🛡️ [DEBUG_LOGIN] Buscando perfil no Firestore...');
      const userDoc = await dbFunctions.getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('✅ [DEBUG_LOGIN] Perfil encontrado no Firestore:', data.role);
        setUser({ ...data, id: userCredential.user.uid });
      } else {
        console.warn('⚠️ [DEBUG_LOGIN] Perfil não existe no Firestore. Usando defaults.');
        setUser({ 
          id: userCredential.user.uid, 
          email: userCredential.user.email, 
          nome: userCredential.user.displayName || '',
          role: role || 'customer'
        });
      }
    } catch (error: any) {
      // 🚨 NÃO MASCARAR O ERRO - EXPOR TUDO
      console.error('❌ [DEBUG_LOGIN] ERRO FATAL DETECTADO:');
      console.error('❌ [DEBUG_LOGIN] CODE:', error.code);
      console.error('❌ [DEBUG_LOGIN] MESSAGE:', error.message);
      console.error('❌ [DEBUG_LOGIN] FULL_ERROR:', JSON.stringify(error, null, 2));
      
      // Criar uma mensagem de erro técnica e detalhada para o usuário (em ambiente de debug)
      const technicalError = `[${error.code || 'unknown'}] ${error.message}`;
      setError(technicalError);
      throw error; // Repropagar para a tela
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

  const signInWithGoogle = async (role: string) => {
    try {
      console.log('🛡️ [DEBUG_SOCIAL] Iniciando Google Auth');
      // TODO: Implementar lógica real de Google Auth para Firebase Web SDK
      // Por enquanto, retorna erro informativo para debug
      return { success: false, error: 'Google Auth pendente de implementação no novo Lazy Load' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signInWithFacebook = async (role: string) => {
    return { success: false, error: 'Facebook Auth pendente de implementação' };
  };

  const signInWithApple = async (role: string) => {
    return { success: false, error: 'Apple Auth pendente de implementação' };
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
        signInWithGoogle,
        signInWithFacebook,
        signInWithApple,
        is2FAEnabled: user?.twoFactorEnabled || false,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
