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

/** Diagnóstico login — corrida Auth → Firestore (somente logs, sem correção) */
let authDiagSeq = 0;
let usersUidReadCount = 0;

const authDiagTimestamp = () => new Date().toISOString();

const nextAuthDiagSeq = () => {
  authDiagSeq += 1;
  return authDiagSeq;
};

const logAuthDebug = (message: string, extra?: Record<string, unknown>) => {
  console.log('[AUTH_DEBUG]', {
    seq: nextAuthDiagSeq(),
    timestamp: authDiagTimestamp(),
    message,
    usersUidReadCount,
    ...extra,
  });
};

const logAuthState = (context: string, hint?: { uid?: string; email?: string | null }) => {
  const auth = getAuth();
  const currentUser = auth?.currentUser;
  const authStable =
    !!currentUser?.uid &&
    (!hint?.uid || currentUser.uid === hint.uid);

  console.log('[AUTH_STATE]', {
    seq: nextAuthDiagSeq(),
    timestamp: authDiagTimestamp(),
    context,
    'currentUser.uid': currentUser?.uid ?? null,
    'currentUser.email': currentUser?.email ?? null,
    hintUid: hint?.uid ?? null,
    hintEmail: hint?.email ?? null,
    authStable,
    usersUidReadCount,
  });

  return { currentUser, authStable };
};

const logFirestoreRead = (
  context: string,
  path: string,
  uid: string,
  email?: string | null
) => {
  usersUidReadCount += 1;
  const readNumber = usersUidReadCount;

  logAuthState(`${context} — imediatamente antes de getDoc`, { uid, email });

  console.log('[FIRESTORE_READ]', {
    seq: nextAuthDiagSeq(),
    timestamp: authDiagTimestamp(),
    context,
    path,
    uid,
    email: email ?? null,
    readNumber,
    usersUidReadCount,
  });

  return readNumber;
};

const logFirestoreDenied = (
  context: string,
  path: string,
  uid: string,
  email: string | null | undefined,
  error: unknown
) => {
  const err = error as { code?: string; message?: string };
  logAuthState(`${context} — após getDoc negado`, { uid, email });

  console.error('[FIRESTORE_DENIED]', {
    seq: nextAuthDiagSeq(),
    timestamp: authDiagTimestamp(),
    context,
    path,
    uid,
    email: email ?? null,
    code: err?.code ?? 'unknown',
    message: err?.message ?? String(error),
    usersUidReadCount,
  });
};

const fetchUsersProfileDoc = async (
  context: string,
  uid: string,
  email?: string | null
) => {
  const path = `users/${uid}`;
  logFirestoreRead(context, path, uid, email);
  const userRef = dbFunctions.doc('users', uid);

  try {
    const userDoc = await dbFunctions.getDoc(userRef);
    logAuthDebug('getDoc concluído', {
      context,
      path,
      uid,
      exists: userDoc.exists(),
    });
    return userDoc;
  } catch (error) {
    logFirestoreDenied(context, path, uid, email, error);
    throw error;
  }
};

const PROFILE_NOT_FOUND_ERROR = {
  code: 'firestore/profile-not-found',
  message: 'Conta autenticada, mas perfil não encontrado no sistema.',
};

const buildUserFromFirestoreProfile = (
  firebaseUser: { uid: string; email?: string | null; displayName?: string | null },
  data: Record<string, any>
) => {
  const normalizedRole = (data?.role || data?.activeRole || 'comprador').toLowerCase();
  const userRoles = data?.roles || [normalizedRole];

  return {
    ...data,
    id: firebaseUser.uid,
    role: normalizedRole,
    activeRole: normalizedRole,
    roles: userRoles,
    active: data?.active ?? true,
  };
};

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
            logAuthDebug('onAuthStateChanged disparado', {
              hasUser: !!firebaseUser,
              listenerUid: firebaseUser?.uid ?? null,
              listenerEmail: firebaseUser?.email ?? null,
            });

            if (firebaseUser) {
              console.log('👤 [AUTH] User detected:', firebaseUser.email);
              setProfileLoading(true);

              const userDoc = await fetchUsersProfileDoc(
                'onAuthStateChanged',
                firebaseUser.uid,
                firebaseUser.email
              );

              if (userDoc.exists()) {
                const data = userDoc.data();
                const updatedUser = buildUserFromFirestoreProfile(firebaseUser, data);

                console.log('✅ [AUTH] Profile loaded and normalized:', updatedUser.role);
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
          } catch (error: any) {
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
      logAuthDebug('Login iniciado', { email: normalizedEmail });
      console.log('🛡️ [DEBUG_LOGIN] INICIANDO PROCESSO PARA:', normalizedEmail);

      logAuthState('login — antes de signInWithEmailAndPassword');

      const signInFn = authFunctions.signInWithEmailAndPassword;

      if (typeof signInFn !== 'function') {
        throw new Error('Módulo de Autenticação do Firebase não carregado corretamente.');
      }

      logAuthDebug('Chamando signInWithEmailAndPassword', { email: normalizedEmail });
      console.log('🛡️ [DEBUG_LOGIN] Chamando Firebase SDK...');
      const userCredential = await signInFn(normalizedEmail, password);

      logAuthDebug('signInWithEmailAndPassword concluído', {
        credentialUid: userCredential.user.uid,
        credentialEmail: userCredential.user.email,
      });
      logAuthState('login — imediatamente após signIn', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      });
      console.log('✅ [DEBUG_LOGIN] SUCESSO SDK! UID:', userCredential.user.uid);

      logAuthDebug('Buscando perfil users/{uid} diretamente após signIn');
      const userDoc = await fetchUsersProfileDoc(
        'login',
        userCredential.user.uid,
        userCredential.user.email
      );

      if (userDoc.exists()) {
        const data = userDoc.data();
        const profileRole = (data.role || data.activeRole || 'comprador').toLowerCase();
        console.log('✅ [DEBUG_LOGIN] Perfil encontrado:', profileRole);

        const updatedUser = buildUserFromFirestoreProfile(userCredential.user, data);
        setUser(updatedUser);
        logAuthDebug('Login concluído — perfil carregado via getDoc em login');
      } else {
        console.warn('⚠️ [DEBUG_LOGIN] Perfil não existe no Firestore.');
        throw PROFILE_NOT_FOUND_ERROR;
      }
    } catch (error: any) {
      console.error('❌ [DEBUG_LOGIN] ERRO:', error.code, error.message);
      if (error?.code === 'permission-denied') {
        logAuthState('login — catch permission-denied');
      }
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
