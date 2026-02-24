import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
// Importação condicional para evitar erros em plataformas não suportadas
let AppleAuthentication: any = null;
if (Platform.OS === 'ios') {
  AppleAuthentication = require('expo-apple-authentication');
}
import * as WebBrowser from 'expo-web-browser';
import { loggingService } from './LoggingService';
import { secureLoggingService } from './SecureLoggingService';
// Importação modificada para resolver problema de compatibilidade
import { SecurityService } from './SecurityService.js';
import { firestore, auth } from '../config/firebase';
import { User } from '../models/User';
import {
  signInWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  updateProfile,
  getAuth,
  AuthCredential,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Registrar para receber o redirecionamento de autenticação
WebBrowser.maybeCompleteAuthSession();

// Configurações baseadas no ambiente
const GOOGLE_CLIENT_ID = {
  expo: 'SEU_GOOGLE_EXPO_CLIENT_ID',
  ios: 'SEU_GOOGLE_IOS_CLIENT_ID',
  android: 'SEU_GOOGLE_ANDROID_CLIENT_ID',
  web: 'SEU_GOOGLE_WEB_CLIENT_ID',
};

const FACEBOOK_APP_ID = 'SEU_FACEBOOK_APP_ID';

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

  // Autenticação com Google
  public async googleAuth(): Promise<{ user: User; token: string } | null> {
    try {
      const [request, response, promptAsync] = Google.useAuthRequest({
        expoClientId: GOOGLE_CLIENT_ID.expo,
        iosClientId: GOOGLE_CLIENT_ID.ios,
        androidClientId: GOOGLE_CLIENT_ID.android,
        webClientId: GOOGLE_CLIENT_ID.web,
      });

      if (response?.type === 'success') {
        // Obter token de acesso do Google
        const { authentication } = response;

        // Usar o token para buscar informações do usuário
        const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${authentication?.accessToken}` },
        });

        const userData = await userInfoResponse.json();

        // Verificar se o usuário já existe ou criar um novo
        return await this.findOrCreateSocialUser({
          email: userData.email,
          name: userData.name,
          provider: 'google',
          providerId: userData.id,
          profilePicture: userData.picture,
        });
      }

      // Abrir modal de autenticação do Google
      await promptAsync();
      return null;
    } catch (error) {
      secureLoggingService.security('Erro na autenticação com Google', { 
        errorMessage: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      throw new Error('Falha na autenticação com Google');
    }
  }

  // Autenticação com Facebook
  public async facebookAuth(): Promise<{ user: User; token: string } | null> {
    try {
      const [request, response, promptAsync] = Facebook.useAuthRequest({
        clientId: FACEBOOK_APP_ID,
      });

      if (response?.type === 'success') {
        const { access_token } = response.params;

        // Usar o token para buscar informações do usuário
        const userInfoResponse = await fetch(
          `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${access_token}`
        );

        const userData = await userInfoResponse.json();

        // Verificar se o usuário já existe ou criar um novo
        return await this.findOrCreateSocialUser({
          email: userData.email,
          name: userData.name,
          provider: 'facebook',
          providerId: userData.id,
          profilePicture: userData.picture?.data?.url,
        });
      }

      // Abrir modal de autenticação do Facebook
      await promptAsync();
      return null;
    } catch (error) {
      secureLoggingService.security('Erro na autenticação com Facebook', { 
        errorMessage: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      throw new Error('Falha na autenticação com Facebook');
    }
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
      const userQuery = await firestore
        .collection('users')
        .where('email', '==', userData.email)
        .limit(1)
        .get();

      let userId: string;
      let user: User;

      if (userQuery.empty) {
        // Criar novo usuário
        const newUser: Omit<User, 'id'> = {
          email: userData.email,
          nome: userData.name,
          dataCriacao: new Date().toISOString(),
          socialAuth: {
            provider: userData.provider,
            providerId: userData.providerId,
          },
          emailVerified: true, // Autenticação social já verifica o email
          foto: userData.profilePicture || null,
          // Outros campos padrão
          role: 'customer',
          dataUltimoLogin: new Date().toISOString(),
        };

        const docRef = await firestore.collection('users').add(newUser);
        userId = docRef.id;
        user = { id: userId, ...newUser } as User;
      } else {
        // Atualizar informações do usuário existente
        const userDoc = userQuery.docs[0];
        userId = userDoc.id;
        user = { id: userId, ...userDoc.data() } as User;

        // Atualizar dados de autenticação social
        await userDoc.ref.update({
          socialAuth: {
            provider: userData.provider,
            providerId: userData.providerId,
          },
          emailVerified: true,
          dataUltimoLogin: new Date().toISOString(),
        });
      }

      // Gerar token JWT
      const token = SecurityService.generateToken({
        id: userId,
        email: userData.email,
        role: user.role || 'customer',
      });

      // Armazenar token de forma segura
      await SecurityService.storeSecureData('authToken', token);

      return { user, token };
    } catch (error) {
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
   * Login com Google usando Expo Auth Session
   */
  async signInWithGoogle(): Promise<SocialAuthResult> {
    try {
      // Configuração do Google Sign-In
      const [request, response, promptAsync] = Google.useAuthRequest({
        expoClientId: GOOGLE_CLIENT_ID.web,
        androidClientId: GOOGLE_CLIENT_ID.android,
        iosClientId: GOOGLE_CLIENT_ID.ios,
        scopes: ['profile', 'email'],
      });

      if (response?.type === 'success') {
        const { id_token } = response.params;
        const credential = GoogleAuthProvider.credential(id_token);
        return await this.signInWithFirebase(credential);
      } else {
        await promptAsync();
        return { success: false, error: 'Autenticação cancelada ou não concluída.' };
      }
    } catch (error) {
      secureLoggingService.security('Erro ao fazer login com Google', { 
        errorMessage: error.message || 'Erro desconhecido',
        errorCode: error.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no login com Google',
      };
    }
  }

  /**
   * Login com Facebook usando Expo Auth Session
   */
  async signInWithFacebook(): Promise<SocialAuthResult> {
    try {
      // Configuração do Facebook Login
      const [request, response, promptAsync] = Facebook.useAuthRequest({
        clientId: FACEBOOK_APP_ID,
        scopes: ['public_profile', 'email'],
      });

      if (response?.type === 'success') {
        const { access_token } = response.params;
        const credential = FacebookAuthProvider.credential(access_token);
        return await this.signInWithFirebase(credential);
      } else {
        await promptAsync();
        return { success: false, error: 'Autenticação cancelada ou não concluída.' };
      }
    } catch (error) {
      secureLoggingService.security('Erro ao fazer login com Facebook', { 
        errorMessage: error.message || 'Erro desconhecido',
        errorCode: error.code || 'unknown',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no login com Facebook',
      };
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

      return await this.signInWithFirebase(authCredential);
    } catch (error) {
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
  private async signInWithFirebase(credential: AuthCredential): Promise<SocialAuthResult> {
    try {
      const result = await signInWithCredential(auth, credential);
      const { user, additionalUserInfo } = result;

      // Salvar o token para uso posterior
      if (user.stsTokenManager) {
        await AsyncStorage.setItem('userToken', user.stsTokenManager.accessToken);
      }

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
    try {
      // Se o usuário não tiver um nome de exibição, usar o email
      if (!user.displayName && user.email) {
        const displayName = user.email.split('@')[0];
        await updateProfile(user, { displayName });
      }

      // Criação do perfil de usuário com dados padrão
      // Você deve implementar isso baseado nas necessidades do seu app
    } catch (error) {
      secureLoggingService.security('Erro ao configurar novo usuário', { 
        userId: user.uid,
        email: user.email,
        errorMessage: error.message || 'Erro desconhecido',
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
      await auth.signOut();
      await AsyncStorage.removeItem('userToken');
      return true;
    } catch (error) {
      secureLoggingService.security('Erro ao desconectar', { 
        errorMessage: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
}
