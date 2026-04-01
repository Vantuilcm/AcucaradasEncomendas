import { useState, useCallback, useEffect } from 'react';
// @ts-ignore
import {
  // @ts-ignore
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  // @ts-ignore
  onAuthStateChanged,
  User,
  // @ts-ignore
  GoogleAuthProvider,
  // @ts-ignore
  FacebookAuthProvider,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
// import { loggingService } from '../services/LoggingService';
import { secureLoggingService } from '../services/SecureLoggingService';
import {
  SocialAuthService,
  SocialAuthResult,
  GOOGLE_CLIENT_ID,
  FACEBOOK_APP_ID,
} from '../services/SocialAuthService';
import { TwoFactorAuthService, TwoFactorAuthResult } from '../services/TwoFactorAuthService';

import { Role } from '../services/PermissionsService';
import { UserUtils } from '../utils/UserUtils';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  is2FAEnabled: boolean;
  is2FAVerified: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetError: () => void;
  signInWithGoogle: (role?: string) => Promise<SocialAuthResult>;
  signInWithFacebook: (role?: string) => Promise<SocialAuthResult>;
  signInWithApple: (role?: string) => Promise<SocialAuthResult>;
  enable2FA: () => Promise<TwoFactorAuthResult>;
  disable2FA: () => Promise<TwoFactorAuthResult>;
  verify2FACode: (code: string) => Promise<TwoFactorAuthResult>;
  generate2FACode: () => Promise<TwoFactorAuthResult>;
  regenerateBackupCodes: () => Promise<TwoFactorAuthResult>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(false);
  const auth = getAuth();
  const socialAuthService = SocialAuthService.getInstance();
  const twoFactorAuthService = new TwoFactorAuthService();
  const [, , googlePromptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID.expo,
    iosClientId: GOOGLE_CLIENT_ID.ios,
    androidClientId: GOOGLE_CLIENT_ID.android,
    webClientId: GOOGLE_CLIENT_ID.web,
    scopes: ['profile', 'email'],
  });
  const [, , facebookPromptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
    scopes: ['public_profile', 'email'],
  });

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
        try {
          setUser(user);
          setLoading(false);
          if (user) {
            // Registrar autenticação no logging seguro
            secureLoggingService.security('Usuário autenticado', {
              userId: UserUtils.getUserId(user),
              email: UserUtils.getUserEmail(user),
              timestamp: new Date().toISOString()
            });

            // Verificar status do 2FA
            const enabled = await twoFactorAuthService.is2FAEnabled();
            setIs2FAEnabled(enabled);

            // Verificar se já tem uma sessão 2FA válida
            const hasSession = await twoFactorAuthService.hasValidSession();
            setIs2FAVerified(hasSession);
          } else {
            setIs2FAEnabled(false);
            setIs2FAVerified(false);
          }
        } catch (error) {
          console.error('Erro no processamento do estado de autenticação:', error);
          setLoading(false);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Erro ao configurar listener de autenticação:', error);
      setLoading(false);
    }
  }, [auth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        setError(null);
        await signInWithEmailAndPassword(auth, email, password);

        // Verificar se o usuário tem 2FA ativado após o login
        const enabled = await twoFactorAuthService.is2FAEnabled();
        setIs2FAEnabled(enabled);

        if (enabled) {
          // Se tem 2FA, não está verificado ainda
          setIs2FAVerified(false);
          // Gerar código automaticamente
          await twoFactorAuthService.generateAndSendVerificationCode();
        } else {
          // Se não tem 2FA, está verificado por padrão
          setIs2FAVerified(true);
        }

        secureLoggingService.security('Usuário autenticado com sucesso', {
          email,
          timestamp: new Date().toISOString(),
          method: 'email/password'
        });
      } catch (err: any) {
        const errorMessage = 'Email ou senha inválidos';
        setError(errorMessage);
        secureLoggingService.security('Falha na autenticação', { 
          email, 
          errorMessage: err.message || errorMessage,
          errorCode: err.code || 'unknown',
          timestamp: new Date().toISOString()
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [auth]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        setError(null);
        await createUserWithEmailAndPassword(auth, email, password);
        setIs2FAEnabled(false);
        setIs2FAVerified(true);
        secureLoggingService.security('Usuário criado com sucesso', {
          email,
          timestamp: new Date().toISOString(),
          method: 'email/password'
        });
      } catch (err: any) {
        const errorMessage = 'Erro ao criar conta. Tente novamente.';
        setError(errorMessage);
        secureLoggingService.security('Falha ao criar conta', { 
          email, 
          errorMessage: err.message || errorMessage,
          errorCode: err.code || 'unknown',
          timestamp: new Date().toISOString()
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [auth]
  );

  const handleSignOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut(auth);
      await twoFactorAuthService.clearSession();
      setIs2FAEnabled(false);
      setIs2FAVerified(false);
      secureLoggingService.security('Usuário deslogado com sucesso', {
        userId: UserUtils.getUserId(user),
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
        const errorMessage = 'Erro ao deslogar usuário';
        setError(errorMessage);
        secureLoggingService.security('Falha ao deslogar usuário', { 
          userId: UserUtils.getUserId(user), 
          errorMessage: err.message || errorMessage,
          errorCode: err.code || 'unknown',
          timestamp: new Date().toISOString()
        });
        throw err;
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Métodos de autenticação social
  const signInWithGoogle = useCallback(async (role?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate role against PermissionsService.ts enum
      if (role && !Object.values(Role).includes(role as Role)) {
        const errorMessage = 'Função de usuário inválida. Selecione Comprador, Produtor ou Entregador.';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      const authResponse = await googlePromptAsync();
      if (authResponse.type !== 'success') {
        return { success: false, error: 'Autenticação cancelada ou não concluída.' };
      }
      const idToken = authResponse.params?.id_token;
      if (!idToken) {
        return { success: false, error: 'Token do Google ausente.' };
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await socialAuthService.signInWithCredential(credential, role);
      if (result.success) {
        // Registrar autenticação social bem-sucedida
        secureLoggingService.security('Autenticação com Google bem-sucedida', {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          timestamp: new Date().toISOString(),
          method: 'google'
        });
        
        // Verificar 2FA após autenticação social
        const enabled = await twoFactorAuthService.is2FAEnabled();
        setIs2FAEnabled(enabled);
        setIs2FAVerified(!enabled); // Verificado se não tem 2FA

        if (enabled) {
          await twoFactorAuthService.generateAndSendVerificationCode();
        }
      }
      return result;
    } catch (err: any) {
      const errorMessage = 'Erro ao autenticar com Google';
      setError(errorMessage);
      secureLoggingService.security('Falha na autenticação com Google', { 
        errorMessage: err.message || errorMessage,
        errorCode: err.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [auth, googlePromptAsync, socialAuthService, twoFactorAuthService]);

  const signInWithFacebook = useCallback(async (role?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate role against PermissionsService.ts enum
      if (role && !Object.values(Role).includes(role as Role)) {
        const errorMessage = 'Função de usuário inválida. Selecione Comprador, Produtor ou Entregador.';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      const authResponse = await facebookPromptAsync();
      if (authResponse.type !== 'success') {
        return { success: false, error: 'Autenticação cancelada ou não concluída.' };
      }
      const accessToken = authResponse.params?.access_token;
      if (!accessToken) {
        return { success: false, error: 'Token do Facebook ausente.' };
      }
      const credential = FacebookAuthProvider.credential(accessToken);
      const result = await socialAuthService.signInWithCredential(credential, role);
      if (result.success) {
        // Registrar autenticação social bem-sucedida
        secureLoggingService.security('Autenticação com Facebook bem-sucedida', {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          timestamp: new Date().toISOString(),
          method: 'facebook'
        });
        
        // Verificar 2FA após autenticação social
        const enabled = await twoFactorAuthService.is2FAEnabled();
        setIs2FAEnabled(enabled);
        setIs2FAVerified(!enabled); // Verificado se não tem 2FA

        if (enabled) {
          await twoFactorAuthService.generateAndSendVerificationCode();
        }
      }
      return result;
    } catch (err: any) {
      const errorMessage = 'Erro ao autenticar com Facebook';
      setError(errorMessage);
      secureLoggingService.security('Falha na autenticação com Facebook', { 
        errorMessage: err.message || errorMessage,
        errorCode: err.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [auth, facebookPromptAsync, socialAuthService, twoFactorAuthService]);

  const signInWithApple = useCallback(async (role?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Validate role against PermissionsService.ts enum
      if (role && !Object.values(Role).includes(role as Role)) {
        const errorMessage = 'Função de usuário inválida. Selecione Comprador, Produtor ou Entregador.';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      const result = await socialAuthService.signInWithApple(role);
      if (result.success) {
        // Registrar autenticação social bem-sucedida
        secureLoggingService.security('Autenticação com Apple bem-sucedida', {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          timestamp: new Date().toISOString(),
          method: 'apple'
        });
        
        // Verificar 2FA após autenticação social
        const enabled = await twoFactorAuthService.is2FAEnabled();
        setIs2FAEnabled(enabled);
        setIs2FAVerified(!enabled); // Verificado se não tem 2FA

        if (enabled) {
          await twoFactorAuthService.generateAndSendVerificationCode();
        }
      }
      return result;
    } catch (err: any) {
      const errorMessage = 'Erro ao autenticar com Apple';
      setError(errorMessage);
      secureLoggingService.security('Falha na autenticação com Apple', { 
        errorMessage: err.message || errorMessage,
        errorCode: err.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Métodos de 2FA
  const enable2FA = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await twoFactorAuthService.enable2FA();
      if (result.success) {
        setIs2FAEnabled(true);
        secureLoggingService.security('2FA ativado com sucesso', {
          userId: UserUtils.getUserId(user),
          timestamp: new Date().toISOString()
        });
      }
      return result;
    } catch (err: any) {
      const errorMessage = 'Erro ao ativar autenticação de dois fatores';
      setError(errorMessage);
      secureLoggingService.security('Falha ao ativar 2FA', { 
        userId: UserUtils.getUserId(user),
        errorMessage: err.message || errorMessage,
        errorCode: err.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const disable2FA = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await twoFactorAuthService.disable2FA();
      if (result.success) {
        setIs2FAEnabled(false);
        setIs2FAVerified(true);
        secureLoggingService.security('2FA desativado', {
          userId: UserUtils.getUserId(user),
          timestamp: new Date().toISOString()
        });
      }
      return result;
    } catch (err: any) {
      const errorMessage = 'Erro ao desativar autenticação de dois fatores';
      setError(errorMessage);
      secureLoggingService.security('Falha ao desativar 2FA', { 
        userId: UserUtils.getUserId(user),
        errorMessage: err.message || errorMessage,
        errorCode: err.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const verify2FACode = useCallback(async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await twoFactorAuthService.verifyCode(code);
      if (result.success) {
        setIs2FAVerified(true);
        secureLoggingService.security('Código 2FA verificado com sucesso', {
          userId: UserUtils.getUserId(user),
          timestamp: new Date().toISOString()
        });
      } else {
        secureLoggingService.security('Falha na verificação do código 2FA', {
          userId: UserUtils.getUserId(user),
          timestamp: new Date().toISOString()
        });
      }
      return result;
    } catch (err: any) {
      const errorMessage = 'Erro ao verificar código';
      setError(errorMessage);
      secureLoggingService.security('Erro ao verificar código 2FA', { 
        userId: UserUtils.getUserId(user),
        errorMessage: err.message || errorMessage,
        errorCode: err.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const generate2FACode = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await twoFactorAuthService.generateAndSendVerificationCode();
      if (result.success) {
        secureLoggingService.security('Código 2FA gerado e enviado', {
          userId: UserUtils.getUserId(user),
          timestamp: new Date().toISOString()
        });
      }
      return result;
    } catch (err: any) {
      const errorMessage = 'Erro ao gerar código de verificação';
      setError(errorMessage);
      secureLoggingService.security('Erro ao gerar código 2FA', { 
        userId: UserUtils.getUserId(user),
        errorMessage: err.message || errorMessage,
        errorCode: err.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Regenerar códigos de backup
  const regenerateBackupCodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await twoFactorAuthService.regenerateBackupCodes();
      if (result.success) {
        secureLoggingService.security('Códigos de backup 2FA regenerados', {
          userId: UserUtils.getUserId(user),
          timestamp: new Date().toISOString()
        });
      }
      return result;
    } catch (err: any) {
      const errorMessage = 'Erro ao gerar novos códigos de backup';
      setError(errorMessage);
      secureLoggingService.security('Erro ao regenerar códigos de backup 2FA', { 
        userId: UserUtils.getUserId(user),
        errorMessage: err.message || errorMessage,
        errorCode: err.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    is2FAEnabled,
    is2FAVerified,
    signIn,
    signUp,
    signOut: handleSignOut,
    resetError,
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    enable2FA,
    disable2FA,
    verify2FACode,
    generate2FACode,
    regenerateBackupCodes,
  };
}
