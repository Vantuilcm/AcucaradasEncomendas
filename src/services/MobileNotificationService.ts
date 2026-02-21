import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { loggingService } from './LoggingService';
import { NotificationType } from '../types/Notification';
import { NotificationSettingsService } from './NotificationSettingsService';

// Configuração para Android
Notifications.setNotificationChannelAsync('default', {
  name: 'default',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF9F9F',
});

/**
 * Interface para o token de notificação
 */
interface NotificationToken {
  id: string;
  userId: string;
  token: string;
  deviceId: string;
  platform: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface para a notificação push
 */
interface PushNotification {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  channelId?: string;
  categoryId?: string;
}

/**
 * Serviço para gerenciar notificações móveis (push e locais)
 */
export class MobileNotificationService {
  private static instance: MobileNotificationService;
  private settingsService: NotificationSettingsService;
  private tokensCollection = 'notificationTokens';

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.settingsService = new NotificationSettingsService();
  }

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): MobileNotificationService {
    if (!MobileNotificationService.instance) {
      MobileNotificationService.instance = new MobileNotificationService();
    }
    return MobileNotificationService.instance;
  }

  /**
   * Solicita permissões de notificação e registra o token
   * @param userId ID do usuário
   * @returns Token de notificação ou null se não for possível obter
   */
  public async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        loggingService.info('Notificações push não funcionam em emulador/simulador');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        loggingService.info('Permissão para notificações não concedida');
        return null;
      }

      // Obtém o token do Expo
      const projectId = this.getProjectId();
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

      // Registra o token no Firestore
      await this.saveToken(userId, token);

      return token;
    } catch (error) {
      loggingService.error('Erro ao registrar para notificações push', error);
      throw error;
    }
  }

  /**
   * Obtém o ID do projeto Expo
   */
  private getProjectId(): string {
    // Tenta obter o projectId de diferentes fontes
    let projectId = '';

    if (Constants.expoConfig?.extra?.eas?.projectId) {
      projectId = Constants.expoConfig.extra.eas.projectId;
    } else if (Constants.manifest?.extra?.eas?.projectId) {
      projectId = Constants.manifest.extra.eas.projectId;
    } else if (Constants.expoConfig?.projectId) {
      projectId = Constants.expoConfig.projectId;
    } else if (Constants.manifest?.projectId) {
      projectId = Constants.manifest.projectId;
    } else {
      // Valor fixo para desenvolvimento
      projectId = 'your-project-id';
      loggingService.info('Usando projectId fixo para desenvolvimento');
    }

    return projectId;
  }

  /**
   * Salva o token de notificação no Firestore
   * @param userId ID do usuário
   * @param token Token de notificação
   */
  private async saveToken(userId: string, token: string): Promise<void> {
    try {
      const deviceId = Device.deviceName || 'unknown';
      const platform = Platform.OS;
      const tokenRef = doc(db, this.tokensCollection, token);

      const tokenData: Omit<NotificationToken, 'id'> = {
        userId,
        token,
        deviceId,
        platform,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(tokenRef, tokenData);
      loggingService.info(`Token de notificação registrado para usuário ${userId}`);
    } catch (error) {
      loggingService.error('Erro ao salvar token de notificação', error);
      throw error;
    }
  }

  /**
   * Remove o token de notificação do Firestore
   * @param token Token de notificação
   */
  public async unregisterToken(token: string): Promise<void> {
    try {
      const tokenRef = doc(db, this.tokensCollection, token);
      await deleteDoc(tokenRef);
      loggingService.info(`Token de notificação removido: ${token}`);
    } catch (error) {
      loggingService.error('Erro ao remover token de notificação', error);
      throw error;
    }
  }

  /**
   * Obtém o token de notificação para um usuário e dispositivo específico
   * @param userId ID do usuário
   * @param deviceId ID do dispositivo
   * @returns Token de notificação ou null se não encontrado
   */
  public async getToken(userId: string, deviceId: string): Promise<string | null> {
    try {
      // Na implementação real, você consultaria o Firestore para encontrar o token
      // Aqui estamos simulando para simplificar
      const tokenRef = doc(db, this.tokensCollection, `${userId}_${deviceId}`);
      const tokenDoc = await getDoc(tokenRef);

      if (tokenDoc.exists()) {
        const tokenData = tokenDoc.data() as NotificationToken;
        return tokenData.token;
      }

      return null;
    } catch (error) {
      loggingService.error('Erro ao obter token de notificação', error);
      throw error;
    }
  }

  /**
   * Envia uma notificação push para um usuário
   * @param userId ID do usuário
   * @param title Título da notificação
   * @param message Mensagem da notificação
   * @param data Dados adicionais da notificação
   * @param type Tipo da notificação
   * @returns Verdadeiro se a notificação foi enviada com sucesso
   */
  public async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any> = {},
    type: NotificationType
  ): Promise<boolean> {
    try {
      // Verifica se o usuário deve receber este tipo de notificação
      const shouldReceive = await this.settingsService.shouldReceiveNotification(userId, type);

      if (!shouldReceive) {
        loggingService.info(`Usuário ${userId} optou por não receber notificações do tipo ${type}`);
        return false;
      }

      // Na implementação real, você obteria todos os tokens do usuário
      // Aqui estamos simulando para simplificar
      const token = await this.getToken(userId, 'any');

      if (!token) {
        loggingService.info(`Nenhum token encontrado para o usuário ${userId}`);
        return false;
      }

      // Prepara a notificação
      const notification: PushNotification = {
        to: token,
        title,
        body: message,
        data: {
          ...data,
          type,
        },
        sound: 'default',
      };

      // Envia a notificação usando a API do Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao enviar notificação push: ${JSON.stringify(errorData)}`);
      }

      loggingService.info(`Notificação push enviada para usuário ${userId}`);
      return true;
    } catch (error) {
      loggingService.error('Erro ao enviar notificação push', error);
      throw error;
    }
  }

  /**
   * Agenda uma notificação local
   * @param title Título da notificação
   * @param body Corpo da notificação
   * @param data Dados adicionais da notificação
   * @param trigger Gatilho para a notificação (quando será exibida)
   * @returns ID da notificação agendada
   */
  public async scheduleLocalNotification(
    title: string,
    body: string,
    data: Record<string, any> = {},
    trigger: Notifications.NotificationTriggerInput = null
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger,
      });

      loggingService.info(`Notificação local agendada com ID ${identifier}`);
      return identifier;
    } catch (error) {
      loggingService.error('Erro ao agendar notificação local', error);
      throw error;
    }
  }

  /**
   * Cancela uma notificação local agendada
   * @param notificationId ID da notificação
   */
  public async cancelLocalNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      loggingService.info(`Notificação local cancelada: ${notificationId}`);
    } catch (error) {
      loggingService.error('Erro ao cancelar notificação local', error);
      throw error;
    }
  }

  /**
   * Cancela todas as notificações locais agendadas
   */
  public async cancelAllLocalNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      loggingService.info('Todas as notificações locais foram canceladas');
    } catch (error) {
      loggingService.error('Erro ao cancelar todas as notificações locais', error);
      throw error;
    }
  }

  /**
   * Configura um listener para notificações recebidas
   * @param callback Função a ser chamada quando uma notificação for recebida
   * @returns Função para remover o listener
   */
  public setupNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ): () => void {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    return () => subscription.remove();
  }

  /**
   * Configura um listener para notificações respondidas pelo usuário
   * @param callback Função a ser chamada quando uma notificação for respondida
   * @returns Função para remover o listener
   */
  public setupNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    return () => subscription.remove();
  }
}

// Exporta a instância única do serviço
export const mobileNotificationService = MobileNotificationService.getInstance();
