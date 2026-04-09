import { a } from '../config/firebase';
import { f } from '../config/firebase';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { secureLoggingService } from './SecureLoggingService';
// Importação modificada para resolver problema de compatibilidade
import { SecurityService } from './SecurityService';
import { db, auth } from '../config/firebase';
import { User } from '../models/User';
const { updateProfile, signOut, signInWithCredential, OAuthProvider } = a;
import { UserUtils } from '../utils/UserUtils';
const { collection, query, where, limit, getDocs, addDoc, updateDoc, doc, setDoc } = f;
import AsyncStorage from '@react-native-async-storage/async-storage';
// Importação condicional para evitar erros em plataformas não suportadas
let AppleAuthentication: any = null;
if (Platform.OS === 'ios') {
  AppleAuthentication = require('expo-apple-authentication');
}

// Registrar para receber o redirecionamento de autenticação
WebBrowser.maybeCompleteAuthSession();

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

  // Função auxiliar para encontrar ou criar usuário com autenticação social
  private async findOrCreateSocialUser(userData: {
    email: string;
    name: string;
    provider: string;
    providerId: string;
    profilePicture?: string;
  }): Promise<{ user: User; token: string }> {
    try {
      // Verificar se já existe um usuário com este email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', userData.email), limit(1));
      const userQuery = await getDocs(q);

      let userId: string;
      let user: User;

      if (userQuery.empty) {
        // Criar novo usuário
        const newUser: Omit<User, 'id'> = {
          email: userData.email,
          nome: userData.name,
          role: 'comprador', // Segurança: Força o papel como comprador
          dataCriacao: new Date(),
          ultimoLogin: new Date(),
          perfil: {
            fotoPerfil: userData.profilePicture || undefined,
          },
        };

        const docRef = await addDoc(collection(db, 'users'), newUser as any);
        userId = docRef.id;
        user = { id: userId, ...newUser } as User;
      } else {
        // Atualizar informações do usuário existente
        const userDocSnapshot = userQuery.docs[0];
        userId = userDocSnapshot.id;
        user = { id: userId, ...userDocSnapshot.data() } as User;

        // Atualizar dados de autenticação social
        await updateDoc(doc(db, 'users', userId), {
          ultimoLogin: new Date(),
        });
      }

      // Gerar token JWT
      const token = SecurityService.generateToken({
        id: userId,
        email: userData.email,
        isAdmin: (user as any)?.isAdmin || false,
      });

      // Armazenar token de forma segura
      await SecurityService.storeSecureData('authToken', token);

      return { user, token };
    } catch (error: any) {
      secureLoggingService.security('Erro ao processar autenticação social', { 
        email: userData.email,
        provider: userData.provider,
        errorMessage: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      throw new Error('Falha ao processar autenticação social');
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
      const provider = new OAuthProvider('apple.com');
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
      const result = await signInWithCredential(auth, credential);
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
          await updateProfile(user, { displayName });
        } catch (updateError) {
          secureLoggingService.warn('Erro ao atualizar profile', { error: updateError });
        }
      }

      // Novos usuários sempre recebem papel de comprador por segurança
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
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
      const userRef = doc(db, 'users', user.uid);
      // Atualiza apenas dados básicos como login, sem tocar no papel (role)
      await setDoc(userRef, {
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
      await signOut(auth);
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
