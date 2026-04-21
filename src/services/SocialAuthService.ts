import { a, f, getDb, auth } from '../config/firebase';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { secureLoggingService } from './SecureLoggingService';
import { User } from '../models/User';
import { UserUtils } from '../utils/UserUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Importação condicional para evitar erros em plataformas não suportadas
let AppleAuthentication: any = null;
if (Platform.OS === 'ios') {
  AppleAuthentication = require('expo-apple-authentication');
}

// Registrar para receber o redirecionamento de autenticação
// Deferir chamada para evitar execução imediata no boot
const completeAuthSessionLazy = () => {
  try {
    WebBrowser.maybeCompleteAuthSession();
  } catch (e) {
    console.warn('Erro ao completar sessão de autenticação:', e);
  }
};

// Configurações baseadas no ambiente
export const GOOGLE_CLIENT_ID = {
  expo: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || 'SEU_GOOGLE_EXPO_CLIENT_ID',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || 'SEU_GOOGLE_IOS_CLIENT_ID',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || 'SEU_GOOGLE_ANDROID_CLIENT_ID',
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || 'SEU_GOOGLE_WEB_CLIENT_ID',
};

export const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || 'SEU_FACEBOOK_APP_ID';

export interface SocialAuthResult {
  success: boolean;
  user?: any;
  error?: string;
  additionalUserInfo?: any;
}

export class SocialAuthService {
  private static instance: SocialAuthService;

  private constructor() {}

  public static getInstance(): SocialAuthService {
    if (!SocialAuthService.instance) {
      SocialAuthService.instance = new SocialAuthService();
    }
    return SocialAuthService.instance;
  }

  // Autenticação com Apple (apenas iOS)
  public async appleAuth(): Promise<{ user: User; token: string } | null> {
    if (Platform.OS !== 'ios') {
      throw new Error('Autenticação com Apple só está disponível no iOS');
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Apple não retorna sempre o email e nome, apenas na primeira vez
      // Então vamos usar o user identifier como chave única
      const email = credential.email || `${credential.user}@apple.com`;
      const name = credential.fullName?.givenName
        ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`
        : `Usuário Apple ${credential.user.substring(0, 5)}`;

      // Verificar se o usuário já existe ou criar um novo
      return await this.findOrCreateSocialUser({
        email,
        name,
        provider: 'apple',
        providerId: credential.user,
      });
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        // Usuário cancelou o login
        return null;
      }

      secureLoggingService.security('Erro na autenticação com Apple', { 
        errorMessage: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      throw new Error('Falha na autenticação com Apple');
    }
  }

  // Autenticação com Google
  public async googleAuth(credential: any, role?: string): Promise<SocialAuthResult> {
    completeAuthSessionLazy();
    try {
      const { signInWithCredential, GoogleAuthProvider } = a;
      const googleCredential = GoogleAuthProvider.credential(credential.idToken);
      await signInWithCredential(auth, googleCredential);
      return await this.signInWithCredential(googleCredential, role);
    } catch (error: any) {
      secureLoggingService.security('Erro no login com Google', {
        errorMessage: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no login com Google',
      };
    }
  }

  // Função auxiliar para encontrar ou criar usuário com autenticação social
  private async findOrCreateSocialUser(userData: {
    email: string;
    name: string;
    provider: string;
    providerId: string;
    profilePicture?: string;
    role?: string;
  }): Promise<{ user: User; token: string }> {
    try {
      const usersRef = f.collection(getDb(), 'users');
      const q = f.query(usersRef, f.where('email', '==', userData.email), f.limit(1));
      const querySnapshot = await f.getDocs(q);
      
      let user: User;
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        user = { id: userDoc.id, ...userDoc.data() } as User;
        
        // Atualizar informações do provedor se necessário
        await f.updateDoc(f.doc(getDb(), 'users', user.id), {
          ultimoLogin: new Date(),
          [`providers.${userData.provider}`]: userData.providerId
        });
      } else {
        // Criar novo usuário
        const newUserRef = f.doc(f.collection(getDb(), 'users'));
        user = {
          id: newUserRef.id,
          email: userData.email,
          nome: userData.name,
          role: userData.role || 'customer',
          // Note: providers is not in the User interface, so we'll store it but it won't be on the User type
          // If needed, the User interface should be updated.
          profilePicture: userData.profilePicture || '',
          dataCriacao: new Date(),
          ultimoLogin: new Date()
        } as unknown as User;
        
        await f.setDoc(newUserRef, user);
      }
      
      // Gerar token (em um cenário real, isso viria do Firebase Auth)
      const token = 'social_auth_token_placeholder';
      
      return { user, token };
    } catch (error) {
      secureLoggingService.error('Erro ao buscar/criar usuário social', { error });
      throw error;
    }
  }

  /**
   * Login com Apple usando Expo Apple Authentication
   */
  async signInWithApple(role?: string): Promise<SocialAuthResult> {
    try {
      if (!AppleAuthentication.isAvailableAsync()) {
        return {
          success: false,
          error: 'Login com Apple não está disponível neste dispositivo.',
        };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Criar um provider para o Firebase
      const provider = new a.OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: credential.identityToken,
        rawNonce: credential.nonce,
      });

      return await this.signInWithCredential(authCredential, role);
    } catch (error: any) {
      // Verifica se o erro foi porque o usuário cancelou
      if (error.code === 'ERR_CANCELED') {
        return { success: false, error: 'Login com Apple cancelado pelo usuário.' };
      }

      secureLoggingService.security('Erro ao fazer login com Apple', { 
        errorMessage: error.message || 'Erro desconhecido',
        errorCode: error.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no login com Apple',
      };
    }
  }

  /**
   * Método auxiliar para fazer login no Firebase com uma credencial
   */
  public async signInWithCredential(credential: any, role?: string): Promise<SocialAuthResult> {
    try {
      const result = await a.signInWithCredential(auth, credential);
      if (!result || !result.user) {
        throw new Error('Falha na autenticação: usuário não retornado');
      }
      const { user, additionalUserInfo } = result;

      // Salvar o token para uso posterior
      try {
        const accessToken = (user as any)?.stsTokenManager?.accessToken;
        if (user && accessToken) {
          await AsyncStorage.setItem('userToken', accessToken);
        }
      } catch (storageError) {
        secureLoggingService.warn('Erro ao salvar token no AsyncStorage', { error: storageError });
      }

      // Se for a primeira vez que o usuário acessa, salvar dados adicionais
      if (additionalUserInfo?.isNewUser) {
        await this.setupNewUser(user);
      } else {
        // Apenas atualizar os dados básicos sem tocar na role (que só deve ser alterada pelo backend/admin)
        await this.updateUserBasicInfo(user);
      }

      const userId = UserUtils.getUserId(user);
      secureLoggingService.security('Login social realizado com sucesso', {
        userId,
        email: UserUtils.getUserEmail(user),
        provider: additionalUserInfo?.providerId,
        isNewUser: additionalUserInfo?.isNewUser,
        role: role,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        user,
        additionalUserInfo,
      };
    } catch (error: any) {
      secureLoggingService.security('Erro ao autenticar no Firebase', { 
        errorMessage: error.message || 'Erro desconhecido',
        errorCode: error.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de autenticação no Firebase',
      };
    }
  }

  /**
   * Configura um novo usuário no sistema
   */
  private async setupNewUser(user: any): Promise<void> {
    if (!user?.uid) {
      secureLoggingService.error('Erro ao configurar novo usuário: objeto de usuário inválido');
      return;
    }
    try {
      // Se o usuário não tiver um nome de exibição, usar o email
      if (!user?.displayName && user?.email) {
        const displayName = user.email.split('@')[0];
        try {
          await a.updateProfile(user, { displayName });
        } catch (updateError) {
          secureLoggingService.warn('Erro ao atualizar profile', { error: updateError });
        }
      }

      // Novos usuários sempre recebem papel de comprador por segurança
      const userRef = f.doc(getDb(), 'users', user.uid);
      await f.setDoc(userRef, {
        email: user?.email || '',
        nome: user?.displayName || user?.email?.split('@')[0] || 'Usuário',
        role: 'comprador',
        dataCriacao: new Date(),
        ultimoLogin: new Date()
      }, { merge: true });
    } catch (error: any) {
      secureLoggingService.security('Erro ao configurar novo usuário', { 
        userId: user?.uid,
        email: user?.email,
        errorMessage: error?.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      // Não lançamos exceção aqui para não interromper o fluxo de login
    }
  }

  private async updateUserBasicInfo(user: any): Promise<void> {
    if (!user?.uid) {
      secureLoggingService.error('Erro ao atualizar info basica: objeto de usuário inválido');
      return;
    }
    try {
      const userRef = f.doc(getDb(), 'users', user.uid);
      // Atualiza apenas dados básicos como login, sem tocar no papel (role)
      await f.setDoc(userRef, {
        email: user?.email || '',
        nome: user?.displayName || user?.email?.split('@')[0] || 'Usuário',
        ultimoLogin: new Date()
      }, { merge: true });
    } catch (error: any) {
      secureLoggingService.security('Erro ao atualizar info basica do usuario', {
        userId: user?.uid,
        errorMessage: error?.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Desconectar usuários de todos os provedores sociais
   */
  async signOut(): Promise<boolean> {
    try {
      await a.signOut(auth);
      await AsyncStorage.removeItem('userToken');
      return true;
    } catch (error: any) {
      secureLoggingService.security('Erro ao desconectar', { 
        errorMessage: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
}
