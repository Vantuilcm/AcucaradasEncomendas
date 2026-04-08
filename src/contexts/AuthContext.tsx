import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserUtils } from '../utils/UserUtils';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Alert, TouchableWithoutFeedback } from 'react-native';
import { User } from '../models/User';
import { AuthService } from '../services/AuthService';
import { SecurityService } from '../services/SecurityService';
import { LoggingService } from '../services/LoggingService';
import { DeviceSecurityService } from '../services/DeviceSecurityService';
import { secureLoggingService } from '../services/SecureLoggingService';
import { SecureStorageService } from '../services/SecureStorageService';
import { SocialAuthService, GOOGLE_CLIENT_ID, FACEBOOK_APP_ID } from '../services/SocialAuthService';
import { TwoFactorAuthService } from '../services/TwoFactorAuthService';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
// @ts-ignore
import { GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';

// Interface para o contexto de autenticação
interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  profileLoading: boolean;
  isReady: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  register: (userData: User, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  validateSession: () => Promise<boolean>;
  refreshUserActivity: () => void;
  signInWithGoogle?: (role?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithFacebook?: (role?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithApple?: (role?: string) => Promise<{ success: boolean; error?: string }>;
  is2FAEnabled?: boolean;
}

// Criar o contexto
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Provedor do contexto de autenticação
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [, setIsDeviceSecure] = useState<boolean>(true);

  const authService = AuthService.getInstance();
  const socialAuthService = SocialAuthService.getInstance();
  const twoFactorAuthService = new TwoFactorAuthService();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

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

  // Verificar segurança do dispositivo
  useEffect(() => {
    console.log('🛡️ [AUTH] checkDeviceSecurity (Bypassed for stability)');
    /*
    const checkDeviceSecurity = async () => {
      try {
        const securityCheck = await DeviceSecurityService.performSecurityCheck();
        setIsDeviceSecure(!securityCheck.compromised);
        
        if (securityCheck.compromised) {
          secureLoggingService.security('Dispositivo comprometido detectado', {
            compromised: securityCheck.compromised,
            emulator: securityCheck.emulator,
            debugging: securityCheck.debugging
          });
        }
      } catch (error) {
        secureLoggingService.error('Erro ao verificar segurança do dispositivo', { error });
      }
    };
    
    checkDeviceSecurity();
    */
  }, []);

  // Buscar perfil completo do Firestore com resiliência, retry e logs estruturados
  const fetchUserProfile = useCallback(async (userId: string, retries = 3): Promise<User | null> => {
    let attempt = 0;
    while (attempt < retries) {
      try {
        setProfileLoading(true);
        secureLoggingService.security('PROFILE_FETCH_START', { userId, attempt: attempt + 1 });
        
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as any;
          const role = UserUtils.getUserRole(userData);
          
          secureLoggingService.security('PROFILE_FOUND', { 
            userId, 
            role,
            email: UserUtils.getUserEmail(userData)
          });
          
          if (role) {
            secureLoggingService.security('ROLE_RESOLVED', { userId, role });
          } else {
            secureLoggingService.warn('ROLE_MISSING', { userId });
          }
          
          return { ...userData, id: userId };
        } else {
          secureLoggingService.security('PROFILE_NOT_FOUND', { userId });
          return null;
        }
      } catch (error) {
        attempt++;
        secureLoggingService.error('FIREBASE_FETCH_ERROR', { 
          userId, 
          attempt,
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        });
        
        if (attempt >= retries) {
          return null;
        }
        // Espera curta antes do próximo retry (500ms, 1s, 1.5s)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      } finally {
        if (attempt === retries || attempt === 0) {
          setProfileLoading(false);
        }
      }
    }
    return null;
  }, []);

  // Verificar autenticação ao iniciar o app
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        setIsReady(false);
        console.log('🛡️ [AUTH] checkAuth started');
        
        // 🛡️ Hardening: Bypass temporário do SecureStorageService para evitar crash nativo no boot
        console.log('🛡️ [AUTH] SecureStorageService.getData bypassed');
        const token = null; // await SecureStorageService.getData('authToken');

        if (token && SecurityService.validateToken(token)) {
          setAuthToken(token);
          const payload = SecurityService.getTokenPayload(token);

          if (payload?.id) {
            secureLoggingService.security('AUTH_READY', { userId: payload.id });
            secureLoggingService.security('USER_FOUND', { userId: payload.id });
            const userData = await fetchUserProfile(payload.id);

            if (userData) {
              setUser(userData);
              const userId = UserUtils.getUserId(userData);
              const role = UserUtils.getUserRole(userData);
              
              secureLoggingService.security('PROFILE_READY', { 
                userId,
                role
              });

              // Configurar contexto do Sentry
              try {
                if (userId) {
                  LoggingService.getInstance().setUser(userId, {
                    email: UserUtils.getUserEmail(userData) || '',
                    role: role || '',
                    name: UserUtils.getUserName(userData) || '',
                  });
                }
              } catch (sentryError) {
                console.error('Erro ao configurar Sentry:', sentryError);
              }

              // Iniciar monitoramento de inatividade
              try {
                SecurityService.startActivityMonitor(() => logout());
              } catch (monitorError) {
                console.error('Erro ao iniciar monitor de atividade:', monitorError);
              }
            } else {
              secureLoggingService.security('LOGIN_RECOVERY_PATH', { reason: 'profile_not_found', userId: payload.id });
              await logout();
            }
          } else {
            await logout();
          }
        } else {
          // Token inválido ou expirado
          secureLoggingService.security('AUTH_READY', { userId: null, reason: 'no_token_or_invalid' });
          await logout();
        }
      } catch (error) {
        console.error('Erro no checkAuth:', error);
        secureLoggingService.security('Erro crítico ao verificar autenticação', { 
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
          severity: 'critical'
        });
        // Em caso de erro crítico, forçar estado seguro (não autenticado)
        setUser(null);
        setAuthToken(null);
      } finally {
        setLoading(false);
        setIsReady(true);
        secureLoggingService.security('APP_READY');
      }
    };

    checkAuth();

    // Limpar monitor de atividade ao desmontar
    return () => {
      try {
        SecurityService.stopActivityMonitor();
      } catch (e) {
        console.error('Erro ao parar monitor de atividade:', e);
      }
    };
  }, [fetchUserProfile]);

  // Método de login
  const login = async (email: string, password: string, _role?: string) => {
    try {
      console.log('AuthContext: login started', email);
      setLoading(true);
      
      // Registrar tentativa de login (antes da verificação de segurança)
      secureLoggingService.security('Tentativa de login iniciada', { email });
      
      // Verificar segurança do dispositivo antes do login
      // NOTE: Using static method directly
      const securityCheck = await DeviceSecurityService.performSecurityCheck();
      if (securityCheck.compromised) {
        secureLoggingService.security('Tentativa de login em dispositivo comprometido', {
          email,
          compromised: securityCheck.compromised,
          emulator: securityCheck.emulator,
          debugging: securityCheck.debugging
        });
        
        // Permitir login, mas com alerta
        Alert.alert(
          'Alerta de Segurança',
          'Este dispositivo pode estar comprometido. Algumas funcionalidades podem ser limitadas para sua segurança.',
          [{ text: 'Continuar', style: 'cancel' }]
        );
      }

      // Sanitizar entradas
      // const sanitizedEmail = SecurityService.sanitizeInput(email); // sanitizeInput not found in SecurityService?
      const sanitizedEmail = email.trim().toLowerCase();

      // Verificar bloqueio por tentativas incorretas
      const canAttempt = await SecurityService.registerLoginAttempt(false, sanitizedEmail);
      if (!canAttempt) {
        secureLoggingService.security('Tentativa de login bloqueada por excesso de tentativas', { email: sanitizedEmail });
        return;
      }

      // Realizar autenticação
      const { user: authUser, token } = await authService.autenticarUsuario({
        email: sanitizedEmail,
        senha: password
      });
      console.log('AuthContext: autenticarUsuario success', authUser, token);

      if (authUser && token) {
        // Registrar tentativa bem-sucedida
        await SecurityService.registerLoginAttempt(true, sanitizedEmail);

        // Salvar token
        await SecureStorageService.storeData('authToken', token, { sensitive: true });
        setAuthToken(token);

        // Buscar dados completos do usuário usando a função centralizada
        const userData = await fetchUserProfile(authUser.id);

        if (userData) {
          setUser(userData);
          const userId = UserUtils.getUserId(userData);
          const role = UserUtils.getUserRole(userData);

          // Iniciar monitoramento de inatividade
          SecurityService.startActivityMonitor(() => logout());

          // Logs estruturados
          secureLoggingService.security('LOGIN_SUCCESS', { 
            userId, 
            role,
            timestamp: new Date().toISOString() 
          });
          
          secureLoggingService.security('AUTH_READY', { userId, role });
        } else {
          secureLoggingService.security('LOGIN_FAILURE', { 
            reason: 'profile_fetch_failed', 
            email: sanitizedEmail 
          });
          throw new Error('Não foi possível carregar seu perfil. Tente novamente.');
        }
      } else {
        secureLoggingService.security('Falha na autenticação', { email: sanitizedEmail });
        throw new Error('Falha na autenticação');
      }
    } catch (error: any) {
      secureLoggingService.security('Erro ao fazer login', { 
        email: email, 
        errorMessage: error.message || 'Erro desconhecido',
        errorCode: error.code || 'unknown'
      });
      Alert.alert('Erro', 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  // Método de cadastro
  const register = async (userData: User, password: string) => {
    try {
      setLoading(true);
      
      // Verificar segurança do dispositivo antes do registro
      const securityCheck = await DeviceSecurityService.performSecurityCheck();
      if (securityCheck.compromised) {
        secureLoggingService.security('Tentativa de registro em dispositivo comprometido', {
          email: userData.email,
          rootDetected: securityCheck.compromised,
          emulatorDetected: securityCheck.emulator,
          debuggingEnabled: securityCheck.debugging
        });
        
        // Permitir registro, mas com alerta
        Alert.alert(
          'Alerta de Segurança',
          'Este dispositivo pode estar comprometido. Algumas funcionalidades podem ser limitadas para sua segurança.',
          [{ text: 'Continuar', style: 'cancel' }]
        );
      }

      // Sanitizar entradas
      const sanitizedEmail = SecurityService.sanitizeInput(userData.email);
      const sanitizedName = SecurityService.sanitizeInput(userData.nome);

      // Registrar tentativa de criação de usuário
      secureLoggingService.security('Tentativa de registro de novo usuário', { email: sanitizedEmail });
      
      // Criar o usuário
      const { user: newUser, token } = await authService.registrarUsuario(
        {
          ...userData,
          email: sanitizedEmail,
          nome: sanitizedName,
        },
        password
      );

      if (newUser && token) {
        // Armazenar token
        await SecureStorageService.storeData('authToken', token, { sensitive: true });
        setAuthToken(token);

        // Buscar dados completos do usuário para garantir sincronização
        const userData = await fetchUserProfile(newUser.id);
        
        if (userData) {
          setUser(userData);
          const userId = UserUtils.getUserId(userData);
          const role = UserUtils.getUserRole(userData);

          // Iniciar monitoramento de inatividade
          SecurityService.startActivityMonitor(() => logout());

          secureLoggingService.security('REGISTER_SUCCESS', { 
            userId, 
            role,
            timestamp: new Date().toISOString() 
          });
          
          secureLoggingService.security('AUTH_READY', { userId, role });
        } else {
          secureLoggingService.security('REGISTER_FAILURE', { 
            reason: 'profile_fetch_after_register_failed', 
            userId: newUser.id 
          });
          throw new Error('Conta criada, mas houve um erro ao carregar seu perfil. Tente fazer login.');
        }
      } else {
        secureLoggingService.security('Falha ao registrar usuário', { email: sanitizedEmail });
        throw new Error('Falha ao registrar usuário');
      }
    } catch (error: any) {
      secureLoggingService.security('Erro ao registrar usuário', { 
        email: userData.email, 
        errorMessage: error.message || 'Erro desconhecido',
        errorCode: error.code || 'unknown'
      });
      Alert.alert('Erro', error.message || 'Falha ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Método de logout
  const logout = async () => {
    try {
      setLoading(true);

      // Parar monitoramento de inatividade
      SecurityService.stopActivityMonitor();

      // Remover token
      await SecureStorageService.removeData('authToken');
      setAuthToken(null);

      // Limpar estado
      const userId = UserUtils.getUserId(user);
      setUser(null);

      secureLoggingService.security('Logout realizado', { userId, timestamp: new Date().toISOString() });
    } catch (error: any) {
      secureLoggingService.security('Erro ao fazer logout', { 
        userId: UserUtils.getUserId(user),
        errorMessage: error.message || 'Erro desconhecido' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Método para redefinir senha
  const resetPassword = async (email: string) => {
    let sanitizedEmail = email;
    try {
      setLoading(true);

      // Sanitizar email
      sanitizedEmail = SecurityService.sanitizeInput(email);

      // Enviar email de recuperação
      await authService.recuperarSenha(sanitizedEmail);

      Alert.alert(
        'Recuperação de senha',
        'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha.'
      );

      secureLoggingService.security('Solicitação de recuperação de senha', { 
        email: sanitizedEmail,
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      secureLoggingService.security('Erro ao solicitar recuperação de senha', { 
        email: sanitizedEmail,
        errorMessage: error.message || 'Erro desconhecido' 
      });
      Alert.alert(
        'Recuperação de senha',
        'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Método para atualizar dados do usuário
  const updateUser = async (userData: Partial<User>) => {
    try {
      setLoading(true);

      const userId = UserUtils.getUserId(user);
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      // Sanitizar dados
      const sanitizedData: Partial<User> = {};
      const userNome = UserUtils.getUserName(userData);
      const userEmail = UserUtils.getUserEmail(userData);
      
      if (userNome) sanitizedData.nome = SecurityService.sanitizeInput(userNome);
      if (userEmail) sanitizedData.email = SecurityService.sanitizeInput(userEmail);
      if (userData.telefone)
        sanitizedData.telefone = SecurityService.sanitizeInput(userData.telefone);
      if (userData.endereco) sanitizedData.endereco = userData.endereco;

      // Atualizar no Firestore
      await updateDoc(doc(db, 'users', userId), {
        ...sanitizedData,
        updatedAt: new Date(),
      } as any);

      // Atualizar estado local
      const updatedUser = {
        ...user,
        ...sanitizedData,
      } as User;
      setUser(updatedUser);

      // Atualizar contexto do Sentry
      LoggingService.getInstance().setUser(userId, {
        email: UserUtils.getUserEmail(updatedUser) || '',
        role: UserUtils.getUserRole(updatedUser) || '',
        name: UserUtils.getUserName(updatedUser) || '',
      });

      secureLoggingService.security('Dados do usuário atualizados', { 
        userId,
        fieldsUpdated: Object.keys(sanitizedData),
        timestamp: new Date().toISOString() 
      });
      Alert.alert('Sucesso', 'Dados atualizados com sucesso.');
    } catch (error: any) {
      secureLoggingService.security('Erro ao atualizar dados do usuário', { 
        userId: UserUtils.getUserId(user),
        fieldsAttempted: Object.keys(userData),
        errorMessage: error.message || 'Erro desconhecido' 
      });
      Alert.alert('Erro', 'Não foi possível atualizar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Validar sessão atual
  const validateSession = async (): Promise<boolean> => {
    try {
      let currentToken = authToken;
      // Verificar token existente
      if (!currentToken) {
        const token = await SecureStorageService.getData('authToken');

        if (!token) {
          return false;
        }

        setAuthToken(token);
        currentToken = token;
      }

      // Validar token
      if (!SecurityService.validateToken(currentToken)) {
        await logout();
        return false;
      }

      // Atualizar timestamp de atividade
      SecurityService.resetActivityTimer();

      return true;
    } catch (error: any) {
      secureLoggingService.security('Erro ao validar sessão', { 
        userId: user?.id,
        errorMessage: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString() 
      });
      await logout();
      return false;
    }
  };

  // Atualizar timestamp de atividade
  const refreshUserActivity = () => {
    SecurityService.updateLastActivity();
  };

  const handlePostSocialLogin = async (authUser: any, _role: string) => {
    try {
      if (!authUser?.uid) throw new Error('UID do usuário social ausente');

      const userRef = doc(db, 'users', authUser.uid);
      const usuariosRef = doc(db, 'usuarios', authUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        // O usuário já existe, não alteramos a role via frontend por segurança.
        // O app apenas lê os dados existentes.
        const existingData = userDoc.data() || {};
        setUser({ id: authUser.uid, ...existingData } as unknown as User);
      } else {
        // Cria o registro no Firestore se não existir. A role inicial é sempre de segurança (comprador),
        // ou se necessário forçar o fallback seguro.
        const defaultRole = 'comprador';
        const newUser = {
          email: authUser.email || '',
          nome: authUser.displayName || 'Usuário Social',
          role: defaultRole,
          dataCriacao: new Date(),
          ultimoLogin: new Date(),
        };
        await setDoc(userRef, newUser);
        await setDoc(usuariosRef, newUser);
        setUser({ id: authUser.uid, ...newUser } as unknown as User);
      }

      // Gerar e salvar token JWT
      const token = await authUser.getIdToken(true);
      if (token) {
        await SecureStorageService.storeData('authToken', token, { sensitive: true });
        setAuthToken(token);
      }

      // Iniciar monitoramento de inatividade
      try {
        SecurityService.startActivityMonitor(() => logout());
      } catch (monitorError) {
        console.error('Erro ao iniciar monitor de atividade no social login:', monitorError);
      }
    } catch (error) {
      console.error('Erro no handlePostSocialLogin:', error);
      throw error;
    }
  };

  const signInWithGoogle = useCallback(async (role: string = 'comprador') => {
    try {
      setLoading(true);
      const authResponse = await googlePromptAsync();
      if (authResponse.type !== 'success') {
        return { success: false, error: 'Autenticação cancelada ou não concluída.' };
      }
      const idToken = authResponse.params?.id_token;
      if (!idToken) return { success: false, error: 'Token do Google ausente.' };
      
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await socialAuthService.signInWithCredential(credential, role);
      
      if (result.success && result.user) {
        await handlePostSocialLogin(result.user, role);
        const enabled = await twoFactorAuthService.is2FAEnabled();
        setIs2FAEnabled(enabled);
      }
      return result;
    } catch (err: any) {
      secureLoggingService.security('Falha na autenticação com Google', { errorMessage: err.message });
      return { success: false, error: 'Erro ao autenticar com Google' };
    } finally {
      setLoading(false);
    }
  }, [googlePromptAsync, socialAuthService, twoFactorAuthService]);

  const signInWithFacebook = useCallback(async (role: string = 'comprador') => {
    try {
      setLoading(true);
      const authResponse = await facebookPromptAsync();
      if (authResponse.type !== 'success') {
        return { success: false, error: 'Autenticação cancelada ou não concluída.' };
      }
      const accessToken = authResponse.params?.access_token;
      if (!accessToken) return { success: false, error: 'Token do Facebook ausente.' };
      
      const credential = FacebookAuthProvider.credential(accessToken);
      const result = await socialAuthService.signInWithCredential(credential, role);
      
      if (result.success && result.user) {
        await handlePostSocialLogin(result.user, role);
        const enabled = await twoFactorAuthService.is2FAEnabled();
        setIs2FAEnabled(enabled);
      }
      return result;
    } catch (err: any) {
      secureLoggingService.security('Falha na autenticação com Facebook', { errorMessage: err.message });
      return { success: false, error: 'Erro ao autenticar com Facebook' };
    } finally {
      setLoading(false);
    }
  }, [facebookPromptAsync, socialAuthService, twoFactorAuthService]);

  const signInWithApple = useCallback(async (role: string = 'comprador') => {
    try {
      setLoading(true);
      const result = await socialAuthService.signInWithApple(role);
      
      if (result.success && result.user) {
        await handlePostSocialLogin(result.user, role);
        const enabled = await twoFactorAuthService.is2FAEnabled();
        setIs2FAEnabled(enabled);
      }
      return result;
    } catch (err: any) {
      secureLoggingService.security('Falha na autenticação com Apple', { errorMessage: err.message });
      return { success: false, error: 'Erro ao autenticar com Apple' };
    } finally {
      setLoading(false);
    }
  }, [socialAuthService, twoFactorAuthService]);

  return (
    <TouchableWithoutFeedback onPress={refreshUserActivity}>
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
          signInWithGoogle,
          signInWithFacebook,
          signInWithApple,
          is2FAEnabled,
        }}
      >
        {children}
      </AuthContext.Provider>
    </TouchableWithoutFeedback>
  );
};

// Hook personalizado para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
};
