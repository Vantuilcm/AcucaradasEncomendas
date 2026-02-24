import { Platform } from 'react-native';
import { messaging } from '../config/firebase';
import { getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { loggingService } from './LoggingService';

/**
 * Serviço para gerenciar o Firebase Cloud Messaging (FCM)
 * Responsável por registrar tokens, receber notificações e integrar com o sistema existente
 */
export class FCMService {
  private static instance: FCMService;
  private readonly tokensCollection = 'fcm_tokens';
  private currentToken: string | null = null;

  private constructor() {}

  /**
   * Obtém a instância singleton do serviço FCM
   */
  public static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Inicializa o serviço FCM
   */
  public async initialize(): Promise<boolean> {
    try {
      // Verificar se FCM é suportado na plataforma atual
      if (Platform.OS === 'web') {
        const isMessagingSupported = await isSupported();
        if (!isMessagingSupported) {
          if (__DEV__) {
            console.log('Firebase Cloud Messaging não é suportado neste navegador');
          }
          return false;
        }
      }

      if (!messaging) {
        if (__DEV__) {
          console.log('Firebase Messaging não está inicializado');
        }
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
   * Configura o listener para mensagens recebidas quando o app está em primeiro plano
   */
  private setupMessageListener(): void {
    try {
      onMessage(messaging, payload => {
        if (__DEV__) {
          console.log('Mensagem recebida em primeiro plano:', payload);
        }

        // Aqui você pode processar a notificação e exibi-la usando o sistema de notificações local
        // Por exemplo, usando Expo Notifications ou OneSignal

        // Exemplo de integração com o sistema existente:
        const { notification } = payload;
        if (notification) {
          // Processar a notificação conforme necessário
          // Você pode emitir um evento ou chamar uma função de callback
        }
      });
    } catch (error) {
      loggingService.error('Erro ao configurar listener de mensagens FCM', { error });
    }
  }

  /**
   * Registra o token FCM para o usuário atual
   * @param userId ID do usuário
   * @returns Token FCM ou null em caso de erro
   */
  public async registerToken(userId: string): Promise<string | null> {
    try {
      if (!messaging) {
        throw new Error('Firebase Messaging não está inicializado');
      }

      // Obter o token FCM
      const token = await getToken(messaging, {
        vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (!token) {
        throw new Error('Não foi possível obter o token FCM');
      }

      this.currentToken = token;

      // Salvar o token no Firestore
      await this.saveTokenToFirestore(userId, token);

      if (__DEV__) {
        console.log('Token FCM registrado com sucesso:', token);
      }
      return token;
    } catch (error) {
      loggingService.error('Erro ao registrar token FCM', { error, userId });
      return null;
    }
  }

  /**
   * Salva o token FCM no Firestore
   * @param userId ID do usuário
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
        await updateDoc(userTokensRef, {
          tokens: [...(userTokensDoc.data().tokens || []), tokenData],
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
   * Remove o token FCM do usuário
   * @param userId ID do usuário
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
        const tokens = userData.tokens || [];

        // Filtrar o token atual
        const updatedTokens = tokens.filter((t: any) => t.token !== this.currentToken);

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
   * Obtém o token FCM atual
   * @returns Token FCM atual ou null
   */
  public getCurrentToken(): string | null {
    return this.currentToken;
  }
}

// Exportar instância singleton
export const fcmService = FCMService.getInstance();
