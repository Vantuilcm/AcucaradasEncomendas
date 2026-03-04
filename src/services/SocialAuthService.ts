import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { secureLoggingService } from './SecureLoggingService';
// Importação corrigida para usar o arquivo TypeScript
import { SecurityService } from './SecurityService';
import { db as firestore, auth } from '../config/firebase';
import { User } from '../models/User';
import {
  signInWithCredential,
  OAuthProvider,
  updateProfile,
  AuthCredential,
  signOut,
} from 'firebase/auth';
import { collection, query, where, limit, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
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
  expo: 'SEU_GOOGLE_EXPO_CLIENT_ID',
  ios: 'SEU_GOOGLE_IOS_CLIENT_ID',
  android: 'SEU_GOOGLE_ANDROID_CLIENT_ID',
  web: 'SEU_GOOGLE_WEB_CLIENT_ID',
};

export const FACEBOOK_APP_ID = 'SEU_FACEBOOK_APP_ID';

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      secureLoggingService.security('Erro na autenticação com Apple', { 
        errorMessage,
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
      const userQuery = await getDocs(
        query(
          collection(firestore, 'users'),
          where('email', '==', userData.email),
          limit(1)
        )
      );

      let userId: string;
      let user: User;

      if (userQuery.empty) {
        // Criar novo usuário
        const newUser: Omit<User, 'id'> = {
          email: userData.email,
          nome: userData.name,
          dataCriacao: new Date(),
          ultimoLogin: new Date(),
          isAdmin: false,
          perfil: {
            fotoPerfil: userData.profilePicture || undefined,
          },
        };

        const docRef = await addDoc(collection(firestore, 'users'), newUser as any);
        userId = docRef.id;
        user = { id: userId, ...newUser } as User;
      } else {
        // Atualizar informações do usuário existente
        const userDoc = userQuery.docs[0];
        userId = userDoc.id;
        user = { id: userId, ...userDoc.data() } as User;

        // Atualizar dados de autenticação social
        await updateDoc(doc(firestore, 'users', userId), {
          ultimoLogin: new Date(),
        } as any);
      }

      // Gerar token JWT
      const token = SecurityService.generateToken({
        id: userId,
        email: userData.email,
        isAdmin: user.isAdmin || false,
      });

      // Armazenar token de forma segura
      await SecurityService.storeSecureData('authToken', token);

      return { user, token };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      secureLoggingService.security('Erro ao processar autenticação social', { 
        email: userData.email,
        provider: userData.provider,
        errorMessage,
        timestamp: new Date().toISOString()
      });
      throw new Error('Falha ao processar autenticação social');
    }
  }

  /**
   * Login com Apple usando Expo Apple Authentication
   */
  async signInWithApple(): Promise<SocialAuthResult> {
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

      return await this.signInWithCredential(authCredential);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorCode = (error as any).code || 'unknown';

      // Verifica se o erro foi porque o usuário cancelou
      if (errorCode === 'ERR_CANCELED') {
        return { success: false, error: 'Login com Apple cancelado pelo usuário.' };
      }

      secureLoggingService.security('Erro ao fazer login com Apple', { 
        errorMessage,
        errorCode,
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Método auxiliar para fazer login no Firebase com uma credencial
   */
  public async signInWithCredential(credential: AuthCredential): Promise<SocialAuthResult> {
    try {
      const result = await signInWithCredential(auth, credential);
      const { user, additionalUserInfo } = result;
      const accessToken = await user.getIdToken();

      // Salvar o token para uso posterior
      await AsyncStorage.setItem('userToken', accessToken);

      // Se for a primeira vez que o usuário acessa, salvar dados adicionais
      if (additionalUserInfo?.isNewUser) {
        await this.setupNewUser(user);
      }

      secureLoggingService.security('Login social realizado com sucesso', {
        userId: user.uid,
        email: user.email,
        provider: additionalUserInfo?.providerId,
        isNewUser: additionalUserInfo?.isNewUser,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        user,
        additionalUserInfo,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorCode = (error as any).code || 'unknown';

      secureLoggingService.security('Erro ao autenticar no Firebase', { 
        errorMessage,
        errorCode,
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Configura um novo usuário no sistema
   */
  private async setupNewUser(user: any): Promise<void> {
    try {
      // Se o usuário não tiver um nome de exibição, usar o email
      if (!user.displayName && user.email) {
        const displayName = user.email.split('@')[0];
        await updateProfile(user, { displayName });
      }

      // Criação do perfil de usuário com dados padrão
      // Você deve implementar isso baseado nas necessidades do seu app
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      secureLoggingService.security('Erro ao configurar novo usuário', { 
        userId: user.uid,
        email: user.email,
        errorMessage,
        timestamp: new Date().toISOString()
      });
      // Não lançamos exceção aqui para não interromper o fluxo de login
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      secureLoggingService.security('Erro ao desconectar', { 
        errorMessage,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
}
