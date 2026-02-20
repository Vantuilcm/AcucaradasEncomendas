import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { AppleAuthenticationScope } from "expo-apple-authentication/build/AppleAuthentication.types";
import { SecurityService as SecurityServiceBase } from "@/services/AppSecurityService";
const SecurityService = SecurityServiceBase;
import { OAuthProvider, AuthCredential, GoogleAuthProvider, FacebookAuthProvider, signInWithCredential, updateProfile } from "firebase/auth";
import { collection, query, where, limit, getDocs, addDoc, updateDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebase";
import { Role } from "./PermissionsService";
import { secureLoggingService } from "./SecureLoggingService";
import type { User as AppUser } from "../models/User";
import Constants from 'expo-constants';

// Registrar para receber o redirecionamento de autenticao
WebBrowser.maybeCompleteAuthSession();

// Configurações baseadas no ambiente
const GOOGLE_CLIENT_ID = {
  expo: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || Constants.expoConfig?.extra?.googleExpoClientId || '627855691834-5oflaa1nve907gro3ntehub8g8smg83l.apps.googleusercontent.com',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || Constants.expoConfig?.extra?.googleIosClientId || '627855691834-cg7iut6b6ebf7tl3eu09icmpbq14h489.apps.googleusercontent.com',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || Constants.expoConfig?.extra?.googleExpoClientId || '627855691834-5oflaa1nve907gro3ntehub8g8smg83l.apps.googleusercontent.com',
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || Constants.expoConfig?.extra?.googleExpoClientId || '627855691834-5oflaa1nve907gro3ntehub8g8smg83l.apps.googleusercontent.com',
};

const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';

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
  public async googleAuth(): Promise<{ user: AppUser; token: string } | null> {
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
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
        timestamp: new Date().toISOString()
      });
      throw new Error('Falha na autenticação com Google');
    }
  }

  // Autenticação com Facebook
  public async facebookAuth(): Promise<{ user: AppUser; token: string } | null> {
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
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
        timestamp: new Date().toISOString()
      });
      throw new Error('Falha na autenticação com Facebook');
    }
  }

  // Autenticação com Apple (apenas iOS)
  public async appleAuth(): Promise<{ user: AppUser; token: string } | null> {
    if (Platform.OS !== 'ios') {
      throw new Error('Autenticação com Apple só está disponível no iOS');
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthenticationScope.FULL_NAME,
          AppleAuthenticationScope.EMAIL,
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
      if (((error as any)?.code) === 'ERR_CANCELED') {
        // Usuário cancelou o login
        return null;
      }

      secureLoggingService.security('Erro na autenticação com Apple', { 
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
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
  }): Promise<{ user: AppUser; token: string }> {
    try {
      // Verificar se já existe um usuário com este email
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('email', '==', userData.email), limit(1));
      const userQuery = await getDocs(q);

      let userId: string;
      let user: AppUser;

      if (userQuery.empty) {
        // Criar novo usuário
        const newUser: any = {};

        const docRef = await addDoc(collection(db, 'users'), newUser);
        userId = docRef.id;
        user = { id: userId, ...newUser } as AppUser;
      } else {
        // Atualizar informações do usuário existente
        const userDoc = userQuery.docs[0];
        userId = userDoc.id;
        user = { id: userId, ...userDoc.data() } as AppUser;

        // Atualizar dados de autenticação social
        await updateDoc(userDoc.ref, {
          emailVerified: true,
          ultimoLogin: new Date(),
        });
      }

      // Gerar token JWT
      const token = SecurityService.generateToken({
        id: userId,
        email: userData.email,
        role: (typeof user.role === 'string' ? user.role : (user.role ?? Role.CLIENTE)) as any,
      });

      // Armazenar token de forma segura
      await SecurityService.storeSecureData('authToken', token);

      return { user, token };
    } catch (error) {
      secureLoggingService.security('Erro ao processar autenticação social', { 
        email: userData.email,
        provider: userData.provider,
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
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
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
        errorCode: ((error as any)?.code) ?? 'unknown',
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
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
        errorCode: ((error as any)?.code) ?? 'unknown',
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
      // @ts-ignore
      if (!(await AppleAuthentication.isAvailableAsync())) {
        return {
          success: false,
          error: 'Login com Apple não está disponível neste dispositivo.',
        };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthenticationScope.FULL_NAME,
          AppleAuthenticationScope.EMAIL,
        ],
      });

      // Criar um provider para o Firebase
      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: (credential.identityToken ?? undefined),
      });

      return await this.signInWithFirebase(authCredential);
    } catch (error) {
      // Verifica se o erro foi porque o usuário cancelou
      if (((error as any)?.code) === 'ERR_CANCELED') {
        return { success: false, error: 'Login com Apple cancelado pelo usuário.' };
      }

      secureLoggingService.security('Erro ao fazer login com Apple', { 
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
        errorCode: ((error as any)?.code) ?? 'unknown',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: (error instanceof Error ? error.message : 'Erro desconhecido no login com Apple'),
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
        await AsyncStorage.setItem('userToken', user.stsTokenManager?.accessToken ?? '');
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
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
        errorCode: ((error as any)?.code) ?? 'unknown',
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
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
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
        errorMessage: (error instanceof Error ? error.message : String(error) || 'Erro desconhecido'),
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
}










