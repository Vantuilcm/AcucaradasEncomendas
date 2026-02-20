import { Platform } from 'react-native';
import { messaging } from '../config/firebase';
import { getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { loggingService } from './LoggingService';

/**
 * ServiÃ§o para gerenciar o Firebase Cloud Messaging (FCM)
 * ResponsÃ¡vel por registrar tokens, receber notificaÃ§Ãµes e integrar com o sistema existente
 */
export class FCMService {
  private static instance: FCMService;
  private readonly tokensCollection = 'fcm_tokens';
  private currentToken: string | null = null;

  private constructor() {}

  /**
   * ObtÃ©m a instÃ¢ncia singleton do serviÃ§o FCM
   */
  public static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Inicializa o serviÃ§o FCM
   */
  public async initialize(): Promise<boolean> {
    try {
      if (Platform.OS !== 'web') {
        loggingService.info('FCM desativado fora do web');
        return false;
      }
      // Verificar se FCM Ã© suportado na plataforma atual
      if (Platform.OS === 'web') {
        const isMessagingSupported = await isSupported();
        if (!isMessagingSupported) {
          loggingService.warn('Firebase Cloud Messaging nÃ£o Ã© suportado neste navegador');
          return false;
        }
      }

      if (!messaging) {
        loggingService.warn('Firebase Messaging nÃ£o estÃ¡ inicializado');
        return false;
      }

      // Configurar listener para mensagens em primeiro plano
      this.setupMessageListener();

      return true;
    } catch (error) {
      loggingService.error('Erro ao inicializar FCM', { error });
      return false;
    }
  }

  /**
   * Configura o listener para mensagens recebidas quando o app estÃ¡ em primeiro plano
   */
  private setupMessageListener(): void {
    try {
      onMessage(messaging, payload => {
        loggingService.debug('Mensagem recebida em primeiro plano', { payload });

        // Aqui vocÃª pode processar a notificaÃ§Ã£o e exibi-la usando o sistema de notificaÃ§Ãµes local
        // Por exemplo, usando Expo Notifications ou OneSignal

        // Exemplo de integraÃ§Ã£o com o sistema existente:
        const { notification } = payload;
        if (notification) {
          // Processar a notificaÃ§Ã£o conforme necessÃ¡rio
          // VocÃª pode emitir um evento ou chamar uma funÃ§Ã£o de callback
        }
      });
    } catch (error) {
      loggingService.error('Erro ao configurar listener de mensagens FCM', { error });
    }
  }

  /**
   * Registra o token FCM para o usuÃ¡rio atual
   * @param userId ID do usuÃ¡rio
   * @returns Token FCM ou null em caso de erro
   */
  public async registerToken(userId: string): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        loggingService.info('Registro de token FCM ignorado fora do web');
        return null;
      }
      if (!messaging) {
        throw new Error('Firebase Messaging nÃ£o estÃ¡ inicializado');
      }

      // Obter o token FCM
      const token = await getToken(messaging, {
        vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (!token) {
        throw new Error('NÃ£o foi possÃ­vel obter o token FCM');
      }

      this.currentToken = token;

      // Salvar o token no Firestore
      await this.saveTokenToFirestore(userId, token);

      loggingService.info('Token FCM registrado com sucesso', { token });
      return token;
    } catch (error) {
      loggingService.error('Erro ao registrar token FCM', { error, userId });
      return null;
    }
  }

  /**
   * Salva o token FCM no Firestore
   * @param userId ID do usuÃ¡rio
   * @param token Token FCM
   */
  private async saveTokenToFirestore(userId: string, token: string): Promise<void> {
    try {
      const userTokensRef = doc(db, this.tokensCollection, userId);
      const userTokensDoc = await getDoc(userTokensRef);

      const tokenData = {
        token,
        platform: Platform.OS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (userTokensDoc.exists()) {
        // Atualizar o documento existente
        const existingData = userTokensDoc.data();
        const existingTokens = Array.isArray(existingData?.tokens) ? existingData.tokens : [];
        await updateDoc(userTokensRef, {
          tokens: [...existingTokens, tokenData],
          updatedAt: new Date(),
        });
      } else {
        // Criar um novo documento
        await setDoc(userTokensRef, {
          userId,
          tokens: [tokenData],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      loggingService.error('Erro ao salvar token FCM no Firestore', { error, userId });
      throw error;
    }
  }

  /**
   * Remove o token FCM do usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   */
  public async unregisterToken(userId: string): Promise<void> {
    try {
      if (!this.currentToken) {
        return;
      }

      const userTokensRef = doc(db, this.tokensCollection, userId);
      const userTokensDoc = await getDoc(userTokensRef);

      if (userTokensDoc.exists()) {
        const userData = userTokensDoc.data();
        const tokensArray = Array.isArray(userData?.tokens) ? userData.tokens : [];

        // Filtrar o token atual
        const updatedTokens = tokensArray.filter((t: any) => t.token !== this.currentToken);

        // Atualizar o documento
        await updateDoc(userTokensRef, {
          tokens: updatedTokens,
          updatedAt: new Date(),
        });
      }

      this.currentToken = null;
    } catch (error) {
      loggingService.error('Erro ao remover token FCM', { error, userId });
    }
  }

  /**
   * ObtÃ©m o token FCM atual
   * @returns Token FCM atual ou null
   */
  public getCurrentToken(): string | null {
    return this.currentToken;
  }
}

// Exportar instÃ¢ncia singleton
export const fcmService = FCMService.getInstance();
