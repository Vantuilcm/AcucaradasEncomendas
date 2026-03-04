import React, { createContext, useContext, useEffect, useState } from 'react';
import { db as firestore } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Alert, TouchableWithoutFeedback } from 'react-native';
import { User } from '../models/User';
import { AuthService } from '../services/AuthService';
import { SecurityService } from '../services/SecurityService';
import { DeviceSecurityService } from '../services/DeviceSecurityService';
import { secureLoggingService } from '../services/SecureLoggingService';
import { SecureStorageService } from '../services/SecureStorageService';

// Interface para o contexto de autenticação
interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  is2FAEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: User, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  validateSession: () => Promise<boolean>;
  refreshUserActivity: () => void;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithFacebook: () => Promise<{ success: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
}

// Criar o contexto
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Provedor do contexto de autenticação
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const authService = AuthService.getInstance();

  // Método de logout (definido antes para ser usado em hooks)
  const logout = async () => {
    try {
      setLoading(true);

      // Parar monitoramento de inatividade
      SecurityService.stopActivityMonitor();

      // Remover token
      await SecureStorageService.removeData('authToken');
      setAuthToken(null);

      // Limpar estado
      const userId = user?.id;
      setUser(null);

      secureLoggingService.security('Logout realizado', { userId, timestamp: new Date().toISOString() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      secureLoggingService.security('Erro ao fazer logout', { 
        userId: user?.id,
        errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificar segurança do dispositivo
  useEffect(() => {
    const checkDeviceSecurity = async () => {
      try {
        const securityCheck = await DeviceSecurityService.performSecurityCheck();
        
        if (securityCheck.compromised) {
          secureLoggingService.security('Dispositivo comprometido detectado', {
            compromised: securityCheck.compromised,
            emulator: securityCheck.emulator,
            debugging: securityCheck.debugging
          });
          
          // Alertar usuário sobre dispositivo comprometido
          Alert.alert(
            'Alerta de Segurança',
            'Este dispositivo pode estar comprometido. Algumas funcionalidades podem ser limitadas para sua segurança.',
            [{ text: 'Entendi', style: 'cancel' }]
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        secureLoggingService.error('Erro ao verificar segurança do dispositivo', { errorMessage });
      }
    };
    
    checkDeviceSecurity();
  }, []);

  // Verificar autenticação ao iniciar o app
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar se existe um token salvo
        const token = await SecureStorageService.getData('authToken');

        if (token && SecurityService.validateToken(token)) {
          setAuthToken(token);
          const payload = SecurityService.getTokenPayload(token);

          if (payload && payload.id) {
            // Buscar dados do usuário
            const userDoc = await getDoc(doc(firestore, 'users', payload.id));

            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
              setUser(userData);

              // Iniciar monitoramento de inatividade
              SecurityService.startActivityMonitor(() => logout());
            } else {
              // Se o documento do usuário não existe, fazer logout
              await logout();
            }
          }
        } else {
          // Token inválido ou expirado
          await logout();
        }
      } catch (error) {
        secureLoggingService.security('Erro ao verificar autenticação', { 
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
          severity: 'high'
        });
        await logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Limpar monitor de atividade ao desmontar
    return () => {
      SecurityService.stopActivityMonitor();
    };
  }, []);

  // Método de login
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Sanitizar entradas
      const sanitizedEmail = SecurityService.sanitizeInput(email);

      // Registrar tentativa de login (antes da verificação de segurança)
      secureLoggingService.security('Tentativa de login iniciada', { email: sanitizedEmail });
      
      // Verificar segurança do dispositivo antes do login
      const securityCheck = await DeviceSecurityService.performSecurityCheck();
      if (securityCheck.compromised) {
        secureLoggingService.security('Tentativa de login em dispositivo comprometido', {
          email: sanitizedEmail,
          compromised: securityCheck.compromised,
          emulator: securityCheck.emulator,
          debugging: securityCheck.debugging
        });
      }

      // Verificar bloqueio por tentativas incorretas
      if (SecurityService.isBlocked(sanitizedEmail)) {
        secureLoggingService.security('Tentativa de login bloqueada por excesso de tentativas', { email: sanitizedEmail });
        Alert.alert(
          'Conta Bloqueada',
          'Muitas tentativas incorretas. Sua conta foi temporariamente bloqueada por 15 minutos.'
        );
        return;
      }

      // Realizar autenticação
      try {
        const { user: authUser, token } = await authService.autenticarUsuario({
          email: sanitizedEmail,
          senha: password
        });

        if (authUser && token) {
          // Registrar tentativa bem-sucedida
          await SecurityService.registerLoginAttempt(true, sanitizedEmail);

          // Armazenar token
          await SecureStorageService.storeData('authToken', token, { sensitive: true });
          setAuthToken(token);

          // Buscar dados completos do usuário
          const userDoc = await getDoc(doc(firestore, 'users', authUser.id));

          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setUser(userData);

            // Iniciar monitoramento de inatividade
            SecurityService.startActivityMonitor(() => logout());

            // Substituir o logging comum por logging seguro
            secureLoggingService.security('Login bem-sucedido', { userId: userData.id, timestamp: new Date().toISOString() });
          } else {
            secureLoggingService.security('Falha no login: dados do usuário não encontrados', { email: sanitizedEmail });
            throw new Error('Dados do usuário não encontrados');
          }
        } else {
          secureLoggingService.security('Falha na autenticação', { email: sanitizedEmail });
          throw new Error('Falha na autenticação');
        }
      } catch (error) {
        // Registrar tentativa falha
        await SecurityService.registerLoginAttempt(false, sanitizedEmail);

        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorCode = (error as any).code || 'unknown';

        secureLoggingService.security('Erro ao fazer login', { 
          email: email, 
          errorMessage,
          errorCode
        });
        Alert.alert('Erro', 'E-mail ou senha incorretos.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Método de cadastro
  const register = async (userData: User, password: string) => {
    try {
      setLoading(true);
      
      // Sanitizar entradas
      const sanitizedEmail = SecurityService.sanitizeInput(userData.email);
      const sanitizedName = SecurityService.sanitizeInput(userData.nome);

      // Registrar tentativa de criação de usuário
      secureLoggingService.security('Tentativa de registro de novo usuário', { email: sanitizedEmail });

      // Verificar segurança do dispositivo antes do registro
      const securityCheck = await DeviceSecurityService.performSecurityCheck();
      if (securityCheck.compromised) {
        secureLoggingService.security('Registro bloqueado: dispositivo comprometido', {
          email: sanitizedEmail,
          compromised: securityCheck.compromised,
          emulator: securityCheck.emulator,
          debugging: securityCheck.debugging
        });
        Alert.alert('Segurança', 'O registro não pode ser realizado em dispositivos comprometidos.');
        setLoading(false);
        return;
      }

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

        // Atualizar estado
        setUser(newUser);

        // Iniciar monitoramento de inatividade
        SecurityService.startActivityMonitor(() => logout());

        secureLoggingService.security('Registro bem-sucedido', { userId: newUser.id, timestamp: new Date().toISOString() });
      } else {
        secureLoggingService.security('Falha ao registrar usuário', { email: sanitizedEmail });
        throw new Error('Falha ao registrar usuário');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorCode = (error as any).code || 'unknown';

      secureLoggingService.security('Erro ao registrar usuário', { 
        email: userData.email, 
        errorMessage,
        errorCode
      });
      Alert.alert('Erro', errorMessage || 'Falha ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Método para redefinir senha
  const resetPassword = async (email: string) => {
    const sanitizedEmail = SecurityService.sanitizeInput(email);
    try {
      setLoading(true);

      // Enviar email de recuperação
      await authService.resetPassword(sanitizedEmail);

      Alert.alert(
        'Recuperação de senha',
        'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha.'
      );

      secureLoggingService.security('Solicitação de recuperação de senha', { 
        email: sanitizedEmail,
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      secureLoggingService.security('Erro ao solicitar recuperação de senha', { 
        email: sanitizedEmail,
        errorMessage 
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

      if (!user || !user.id) {
        throw new Error('Usuário não autenticado');
      }

      // Sanitizar dados
      const sanitizedData: Partial<User> = {};
      if (userData.nome) sanitizedData.nome = SecurityService.sanitizeInput(userData.nome);
      if (userData.email) sanitizedData.email = SecurityService.sanitizeInput(userData.email);
      if (userData.telefone)
        sanitizedData.telefone = SecurityService.sanitizeInput(userData.telefone);
      if (userData.endereco) sanitizedData.endereco = userData.endereco;

      // Atualizar no Firestore
      const userRef = doc(firestore, 'users', user.id);
      await updateDoc(userRef, {
        ...sanitizedData,
        updatedAt: new Date(),
      } as any);

      // Atualizar estado local
      setUser({
        ...user,
        ...sanitizedData,
      });

      secureLoggingService.security('Dados do usuário atualizados', { 
        userId: user.id,
        fieldsUpdated: Object.keys(sanitizedData),
        timestamp: new Date().toISOString() 
      });
      Alert.alert('Sucesso', 'Dados atualizados com sucesso.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      secureLoggingService.security('Erro ao atualizar dados do usuário', { 
        userId: user?.id,
        fieldsAttempted: Object.keys(userData),
        errorMessage 
      });
      Alert.alert('Erro', 'Não foi possível atualizar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Validar sessão atual
  const validateSession = async (): Promise<boolean> => {
    try {
      // Verificar token existente
      let currentToken = authToken;
      if (!currentToken) {
        currentToken = await SecureStorageService.getData('authToken');

        if (!currentToken) {
          return false;
        }

        setAuthToken(currentToken);
      }

      // Validar token
      if (!SecurityService.validateToken(currentToken)) {
        await logout();
        return false;
      }

      // Atualizar timestamp de atividade
      SecurityService.resetActivityTimer();

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      secureLoggingService.security('Erro ao validar sessão', { 
        userId: user?.id,
        errorMessage,
        timestamp: new Date().toISOString() 
      });
      await logout();
      return false;
    }
  };

  // Atualizar timestamp de atividade
  const refreshUserActivity = () => {
    SecurityService.resetActivityTimer();
  };

  // Métodos de login social (stubs para implementação futura)
  const signInWithGoogle = async () => {
    return { success: false, error: 'Autenticação com Google não configurada.' };
  };

  const signInWithFacebook = async () => {
    return { success: false, error: 'Autenticação com Facebook desativada por segurança.' };
  };

  const signInWithApple = async () => {
    return { success: false, error: 'Autenticação com Apple não configurada.' };
  };

  return (
    <TouchableWithoutFeedback onPress={refreshUserActivity}>
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: !!user,
          loading,
          is2FAEnabled: false,
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
