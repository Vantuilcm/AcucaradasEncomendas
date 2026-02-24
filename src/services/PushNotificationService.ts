import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { loggingService } from './LoggingService';

export class PushNotificationService {
  private readonly collection = 'push_tokens';

  constructor() {
    this.configureNotifications();
  }

  private async configureNotifications() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Permissão para notificações não concedida');
      }
    } catch (error) {
      loggingService.error('Erro ao configurar notificações', { error });
      throw error;
    }
  }

  async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        throw new Error('Dispositivo físico necessário para notificações push');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID,
      });

      const token = tokenData.data;

      // Salvar token no Firestore
      const tokenRef = doc(db, this.collection, userId);
      await setDoc(tokenRef, {
        token,
        platform: Platform.OS,
        lastUpdated: new Date().toISOString(),
      });

      loggingService.info('Token de notificação registrado com sucesso', {
        userId,
        token,
      });

      return token;
    } catch (error) {
      loggingService.error('Erro ao registrar token de notificação', {
        userId,
        error,
      });
      throw error;
    }
  }

  async unregisterForPushNotifications(userId: string): Promise<void> {
    try {
      const tokenRef = doc(db, this.collection, userId);
      await tokenRef.delete();

      loggingService.info('Token de notificação removido com sucesso', {
        userId,
      });
    } catch (error) {
      loggingService.error('Erro ao remover token de notificação', {
        userId,
        error,
      });
      throw error;
    }
  }

  async getPushToken(userId: string): Promise<string | null> {
    try {
      const tokenRef = doc(db, this.collection, userId);
      const tokenDoc = await getDoc(tokenRef);

      if (!tokenDoc.exists()) {
        return null;
      }

      return tokenDoc.data().token;
    } catch (error) {
      loggingService.error('Erro ao buscar token de notificação', {
        userId,
        error,
      });
      throw error;
    }
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const token = await this.getPushToken(userId);
      if (!token) {
        throw new Error('Token de notificação não encontrado');
      }

      const message = {
        to: token,
        sound: 'default',
        title,
        body,
        data,
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      loggingService.info('Notificação push enviada com sucesso', {
        userId,
        title,
      });
    } catch (error) {
      loggingService.error('Erro ao enviar notificação push', {
        userId,
        title,
        error,
      });
      throw error;
    }
  }

  // Método para agendar uma notificação local
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger?: Notifications.NotificationTriggerInput,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger,
      });

      loggingService.info('Notificação local agendada com sucesso', {
        title,
        identifier,
      });

      return identifier;
    } catch (error) {
      loggingService.error('Erro ao agendar notificação local', {
        title,
        error,
      });
      throw error;
    }
  }

  // Método para cancelar uma notificação local
  async cancelLocalNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);

      loggingService.info('Notificação local cancelada com sucesso', {
        identifier,
      });
    } catch (error) {
      loggingService.error('Erro ao cancelar notificação local', {
        identifier,
        error,
      });
      throw error;
    }
  }

  // Método para cancelar todas as notificações locais
  async cancelAllLocalNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      loggingService.info('Todas as notificações locais canceladas com sucesso');
    } catch (error) {
      loggingService.error('Erro ao cancelar todas as notificações locais', {
        error,
      });
      throw error;
    }
  }
}
