import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { loggingService } from './LoggingService';
import { NotificationType } from '../types/Notification';
import { NotificationSettings } from '../types/NotificationSettings';
import { NotificationSettingsService } from './NotificationSettingsService';

// Configuração para Android
const __importance = (Notifications as any)?.AndroidImportance?.MAX ?? 5;
const __setChannel = (Notifications as any)?.setNotificationChannelAsync;
if (typeof __setChannel === 'function') {
  __setChannel('default', {
    name: 'default',
    importance: __importance,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF9F9F',
  });
}

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

  // Mapeia NotificationType para chaves do NotificationSettings.types
  private mapToSettingsType(type: NotificationType): keyof NotificationSettings['types'] {
    switch (type) {
      case 'new_order':
      case 'order_status_update':
      case 'order_cancelled':
        return 'orderStatus';
      case 'order_delivered':
        return 'deliveryUpdates';
      case 'payment_received':
        return 'paymentUpdates';
      case 'promotion':
        return 'promotions';
      case 'system_update':
      default:
        return 'news';
    }
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
   * @param requestPermission Se deve solicitar permissão ativamente se não houver
   * @returns Token de notificação ou null se não for possível obter
   */
  public async registerForPushNotifications(userId: string, requestPermission: boolean = true): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        loggingService.info('Notificações push não funcionam em emulador/simulador');
        return null;
      }

      const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted' && requestPermission && canAskAgain) {
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
    } catch (error: any) {
      loggingService.error('Erro ao registrar para notificações push', error);
      throw error;
    }
  }

  /**
   * Obtém o ID do projeto Expo
   */
  private getProjectId(): string {
    let projectId = '';
    const expoConfig: any = (Constants as any).expoConfig;
    const manifest: any = (Constants as any).manifest;

    if (expoConfig?.extra?.eas?.projectId) {
      projectId = expoConfig.extra.eas.projectId;
    } else if (manifest?.extra?.eas?.projectId) {
      projectId = manifest.extra.eas.projectId;
    } else if (expoConfig?.projectId) {
      projectId = expoConfig.projectId as string;
    } else if (manifest?.projectId) {
      projectId = manifest.projectId as string;
    } else {
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
      // Usar uma combinação de userId e deviceId para o ID do documento
      // para permitir que o mesmo usuário tenha múltiplos tokens em dispositivos diferentes
      const docId = `${userId}_${deviceId.replace(/\s+/g, '_')}`;
      const tokenRef = doc(db, this.tokensCollection, docId);

      const tokenData: NotificationToken = {
        id: docId,
        userId,
        token,
        deviceId,
        platform,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(tokenRef, tokenData);
      loggingService.info(`Token de notificação registrado para usuário ${userId} no dispositivo ${deviceId}`);
    } catch (error: any) {
      loggingService.error('Erro ao salvar token de notificação', error);
      throw error;
    }
  }

  /**
   * Remove o token de notificação do Firestore
   * @param userId ID do usuário
   * @param deviceId ID do dispositivo (opcional)
   */
  public async unregisterToken(userId: string, deviceId: string = Device.deviceName || 'unknown'): Promise<void> {
    try {
      const docId = `${userId}_${deviceId.replace(/\s+/g, '_')}`;
      const tokenRef = doc(db, this.tokensCollection, docId);
      await deleteDoc(tokenRef);
      loggingService.info(`Token de notificação removido para usuário ${userId}`);
    } catch (error: any) {
      loggingService.error('Erro ao remover token de notificação', error);
      throw error;
    }
  }

  /**
   * Obtém os tokens de notificação para um usuário
   * @param userId ID do usuário
   * @returns Lista de tokens de notificação
   */
  public async getUserTokens(userId: string): Promise<string[]> {
    try {
      const tokensRef = collection(db, this.tokensCollection);
      const q = query(tokensRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => (doc.data() as NotificationToken).token);
    } catch (error: any) {
      loggingService.error('Erro ao obter tokens de notificação', error);
      return [];
    }
  }

  /**
   * Envia uma notificação push para um usuário
   * @param userId ID do usuário
   * @param title Título da notificação
   * @param message Mensagem da notificação
   * @param data Dados adicionais da notificação
   * @param type Tipo da notificação
   * @returns Verdadeiro se pelo menos uma notificação foi enviada com sucesso
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
      const shouldReceive = await this.settingsService.shouldReceiveNotification(userId, this.mapToSettingsType(type));

      if (!shouldReceive) {
        loggingService.info(`Usuário ${userId} optou por não receber notificações do tipo ${type}`);
        return false;
      }

      // Obtém todos os tokens do usuário
      const tokens = await this.getUserTokens(userId);

      if (tokens.length === 0) {
        loggingService.info(`Nenhum token encontrado para o usuário ${userId}`);
        return false;
      }

      let successCount = 0;
      const errors: Error[] = [];

      // Envia a notificação para cada token
      for (const token of tokens) {
        try {
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

          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(notification),
          });

          if (response.ok) {
            successCount++;
          } else {
            const payload = await (async () => {
              try {
                return await (response as any).json?.();
              } catch {
                return undefined;
              }
            })();
            const msg = payload?.errors ? String(payload.errors) : 'Expo push API retornou erro';
            errors.push(new Error(msg));
          }
        } catch (err: any) {
          const error = err instanceof Error ? err : new Error(String(err));
          errors.push(error);
          loggingService.error(`Erro ao enviar notificação para token ${token}`, error);
        }
      }

      loggingService.info(`Notificação push enviada para usuário ${userId} (${successCount}/${tokens.length} sucessos)`);
      if (successCount > 0) return true;
      if (errors.length > 0) throw errors[0];
      return false;
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
