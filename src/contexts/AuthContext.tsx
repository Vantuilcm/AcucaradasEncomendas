import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, authFunctions, dbFunctions } from '../config/firebase';
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
  signInWithCredential: (credential: any, role: string) => Promise<{ success: boolean; error?: string }>;
  is2FAEnabled?: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapLazyFirebase = async () => {
      try {
        console.log('🛡️ [AUTH] Initializing Lazy Firebase with Getters...');
        
        // Configurar o observador de estado do usuário usando a função lazy
        authFunctions.onAuthStateChanged(async (firebaseUser: any) => {
          try {
            if (firebaseUser) {
              console.log('👤 [AUTH] User detected:', firebaseUser.email);
              setProfileLoading(true);
              
              // Buscar perfil no Firestore
              const userRef = dbFunctions.doc('users', firebaseUser.uid);
              const userDoc = await dbFunctions.getDoc(userRef);

              if (userDoc.exists()) {
                const data = userDoc.data();
                // ETAPA 2 — PADRONIZAÇÃO FIRESTORE USERS
                const normalizedRole = (data?.role || data?.activeRole || 'comprador').toLowerCase();
                const userRoles = data?.roles || [normalizedRole];
                
                const updatedUser = { 
                  ...data, 
                  id: firebaseUser.uid, 
                  role: normalizedRole, 
                  activeRole: normalizedRole, 
                  roles: userRoles, 
                  active: data?.active ?? true 
                };

                console.log('✅ [AUTH] Profile loaded and normalized:', normalizedRole);
                setUser(updatedUser);
              } else {
                console.log('⚠️ [AUTH] Firebase user exists but no Firestore profile found.');
                const newUser = { 
                  id: firebaseUser.uid, 
                  email: firebaseUser.email, 
                  nome: firebaseUser.displayName || '',
                  role: 'comprador',
                  activeRole: 'comprador',
                  roles: ['comprador'],
                  active: true
                };
                setUser(newUser);
              }
            } else {
              console.log('👤 [AUTH] No user found.');
              setUser(null);
              setProfileLoading(false);
            }
          } catch (error) {
            console.error('❌ [AUTH] Error in onAuthStateChanged:', error);
            setProfileLoading(false);
          } finally {
            setLoading(false);
            setProfileLoading(false);
            setIsReady(true);
            console.log('🛡️ [AUTH] Bootstrap Complete. isReady=true');
          }
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

  const login = async (email: string, password: string, _role?: string) => {
    try {
      setLoading(true);
      setProfileLoading(true);
      setError(null);
      
      // Normalização rigorosa do e-mail
      const normalizedEmail = email.trim().toLowerCase();
      console.log('🛡️ [DEBUG_LOGIN] INICIANDO PROCESSO PARA:', normalizedEmail);
      
      const signInFn = authFunctions.signInWithEmailAndPassword;

      if (typeof signInFn !== 'function') {
        throw new Error('Módulo de Autenticação do Firebase não carregado corretamente.');
      }

      // Passo 1: Autenticação Firebase
      console.log('🛡️ [DEBUG_LOGIN] Chamando Firebase SDK...');
      const userCredential = await signInFn(normalizedEmail, password);
      console.log('✅ [DEBUG_LOGIN] SUCESSO SDK! UID:', userCredential.user.uid);
      
      // Passo 2: Busca de Perfil Firestore
      const userRef = dbFunctions.doc('users', userCredential.user.uid);
      console.log('🛡️ [DEBUG_LOGIN] Buscando perfil no Firestore...');
      const userDoc = await dbFunctions.getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        // ETAPA 2 — PADRONIZAÇÃO FIRESTORE USERS NO LOGIN
        const profileRole = (data.role || data.activeRole || 'comprador').toLowerCase();
        const userRoles = data.roles || [profileRole];
        
        console.log('✅ [DEBUG_LOGIN] Perfil encontrado:', profileRole);

        const updatedUser = { 
          ...data, 
          id: userCredential.user.uid, 
          role: profileRole,
          activeRole: profileRole,
          roles: userRoles,
          active: data.active ?? true
        };

        setUser(updatedUser);
      } else {
        console.warn('⚠️ [DEBUG_LOGIN] Perfil não existe no Firestore.');
        throw { code: 'firestore/profile-not-found', message: 'Conta autenticada, mas perfil não encontrado no sistema.' };
      }
    } catch (error: any) {
      console.error('❌ [DEBUG_LOGIN] ERRO:', error.code, error.message);
      let detailedMessage = error.message;

      switch (error.code) {
        case 'auth/too-many-requests':
          detailedMessage = 'Muitas tentativas sem sucesso. A conta foi bloqueada temporariamente por segurança.';
          break;
        case 'firestore/profile-not-found':
          // A mensagem já pode estar definida no throw anterior
          break;
      }

      setError(detailedMessage);
      throw { ...error, message: detailedMessage };
    } finally {
      setLoading(false);
      setProfileLoading(false);
    }
  };

  const register = async (userData: any, password: string) => {
    try {
      setLoading(true);
      setProfileLoading(true);
      const userCredential = await authFunctions.createUserWithEmailAndPassword(userData.email, password);
      
      // Criar doc no Firestore
      const userDoc = {
        id: userCredential.user.uid,
        email: userData.email,
        nome: userData.nome || userData.name || '',
        role: (userData.role || 'comprador').toLowerCase(),
        activeRole: (userData.role || 'comprador').toLowerCase(),
        roles: [(userData.role || 'comprador').toLowerCase()],
        active: true,
        createdAt: dbFunctions.serverTimestamp(),
        updatedAt: dbFunctions.serverTimestamp()
      };
      
      await dbFunctions.setDoc(dbFunctions.doc('users', userCredential.user.uid), userDoc);
      setUser(userDoc);
      console.log('✅ [AUTH] Register success');
    } catch (error) {
      console.error('❌ [AUTH] Register error:', error);
      throw error;
    } finally {
      setLoading(false);
      setProfileLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authFunctions.signOut();
      setUser(null);
    } catch (error) {
      console.error('❌ [AUTH] Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    await authFunctions.sendPasswordResetEmail(email);
  };

  const updateUser = async (userData: any) => {
    if (!user) return;
    const userRef = dbFunctions.doc('users', user.id);
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

  const signInWithGoogle = async (_role: string) => {
    try {
      console.log('🛡️ [DEBUG_SOCIAL] Iniciando Google Auth via AuthSession');
      // A implementação real deve usar useAuthRequest no componente UI
      // Aqui apenas logamos que o componente deve lidar com isso
      return { success: false, error: 'Inicie o login pelo botão do Google' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signInWithFacebook = async (_role: string) => {
    return { success: false, error: 'Facebook Auth pendente de implementação' };
  };

  const signInWithApple = async (role: string) => {
    try {
      console.log('🛡️ [DEBUG_SOCIAL] Iniciando Apple Auth');
      const AppleAuthentication = require('expo-apple-authentication');
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('🛡️ [DEBUG_SOCIAL] Apple Credential obtida');
      
      const auth = getAuth();
      const appleProvider = new authFunctions.OAuthProvider('apple.com');
      const firebaseCredential = appleProvider.credential({
        idToken: credential.identityToken!,
      });

      console.log('🛡️ [DEBUG_SOCIAL] Criando sessão no Firebase...');
      const userCredential = await authFunctions.signInWithCredential(auth, firebaseCredential);
      
      // Sincronizar perfil se necessário
      const userRef = dbFunctions.doc('users', userCredential.user.uid);
      const userDoc = await dbFunctions.getDoc(userRef);
      
      if (!userDoc.exists()) {
        const fullName = credential.fullName;
        const nome = fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : '';
        
        await dbFunctions.setDoc(userRef, {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          nome: nome || userCredential.user.displayName || '',
          role: (role || 'comprador').toLowerCase(),
          createdAt: dbFunctions.serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ [DEBUG_SOCIAL] Apple Auth Error:', error);
      if (error.code === 'ERR_CANCELED') {
        return { success: false, error: 'Login cancelado pelo usuário' };
      }
      return { success: false, error: error.message };
    }
  };

  const signInWithCredential = async (credential: any, role: string) => {
    try {
      setLoading(true);
      const auth = getAuth();
      const userCredential = await authFunctions.signInWithCredential(auth, credential);
      
      // Sincronizar perfil
      const userRef = dbFunctions.doc('users', userCredential.user.uid);
      const userDoc = await dbFunctions.getDoc(userRef);
      
      if (!userDoc.exists()) {
        await dbFunctions.setDoc(userRef, {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          nome: userCredential.user.displayName || '',
          role: (role || 'comprador').toLowerCase(),
          createdAt: dbFunctions.serverTimestamp(),
        });
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ [DEBUG_SOCIAL] Credential Auth Error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        profileLoading,
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
        signInWithCredential,
        is2FAEnabled: user?.twoFactorEnabled || false,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
