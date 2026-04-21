import { f, db } from '../config/firebase';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from '../compat/expoDevice';
import Constants from 'expo-constants';
import { loggingService } from './LoggingService';

import { NotificationType } from '../types/Notification';
import { NotificationSettingsServiceWithCache } from './NotificationSettingsServiceWithCache';

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
  private settingsService: NotificationSettingsServiceWithCache;
  private tokensCollection = 'notificationTokens';

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.settingsService = NotificationSettingsServiceWithCache.getInstance();
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

      if (userId) {
        // Salvar token no Firestore usando o proxy f
        const deviceId = Device.osBuildId || 'unknown';
        const tokenId = `${userId}_${deviceId}`;
        const tokenData: NotificationToken = {
          id: tokenId,
          userId,
          token,
          deviceId,
          platform: Platform.OS,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await f.setDoc(f.doc(db, this.tokensCollection, tokenId), tokenData);
      }

      return token;
    } catch (error) {
      loggingService.error('Erro ao registrar para notificações push', { error });
      return null;
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
    } 
    // @ts-ignore
    else if (Constants.manifest?.extra?.eas?.projectId) {
      // @ts-ignore
      projectId = Constants.manifest.extra.eas.projectId;
    } else if ((Constants.expoConfig as any)?.projectId) {
      projectId = (Constants.expoConfig as any).projectId;
    } else if ((Constants.manifest as any)?.projectId) {
      projectId = (Constants.manifest as any).projectId;
    } else {
      // Valor fixo para desenvolvimento
      projectId = 'your-project-id';
      loggingService.info('Usando projectId fixo para desenvolvimento');
    }

    return projectId;
  }

  /**
   * Remove o registro do token de notificação
   * @param userId ID do usuário
   */
  public async unregisterFromPushNotifications(userId: string): Promise<void> {
    try {
      const deviceId = Device.osBuildId || 'unknown';
      const tokenId = `${userId}_${deviceId}`;
      
      await f.deleteDoc(f.doc(db, this.tokensCollection, tokenId));
      loggingService.info('Registro de notificação removido com sucesso');
    } catch (error) {
      loggingService.error('Erro ao remover registro de notificação', { error });
    }
  }

  /**
   * Alias para unregisterFromPushNotifications
   */
  public async unregisterToken(userId: string): Promise<void> {
    return this.unregisterFromPushNotifications(userId);
  }

  /**
   * Obtém o token registrado para o usuário
   * @param userId ID do usuário
   */
  public async getUserToken(userId: string): Promise<string | null> {
    try {
      const deviceId = Device.osBuildId || 'unknown';
      const tokenId = `${userId}_${deviceId}`;
      const tokenDoc = await f.getDoc(f.doc(db, this.tokensCollection, tokenId));
      
      if (tokenDoc.exists()) {
        return (tokenDoc.data() as NotificationToken).token;
      }
      
      return null;
    } catch (error) {
      loggingService.error('Erro ao obter token do usuário', { error });
      return null;
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
      const shouldReceive = await this.settingsService.shouldReceiveNotification(userId, type as any);

      if (!shouldReceive) {
        loggingService.info(`Usuário ${userId} optou por não receber notificações do tipo ${type}`);
        return false;
      }

      // Na implementação real, você obteria todos os tokens do usuário
      // Aqui estamos simulando para simplificar
      const token = await this.getUserToken(userId);

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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
