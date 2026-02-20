import { useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import { mobileNotificationService } from '../services/MobileNotificationService';
import {
  initOneSignal,
  requestOneSignalPermission,
  setOneSignalTags,
  integrateWithExistingNotifications,
} from '../config/onesignal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { loggingService } from '../services/LoggingService';
import { setPendingHref } from '../navigation/pendingNavigation';
import { NotificationType } from '../types/Notification';

// Configurar comportamento de notificações em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Campos adicionais exigidos por tipos mais recentes do Expo/Notifications
    // Garantem compatibilidade com iOS (banner/lista)
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Interface para o retorno do hook useNotifications
 */
interface UseNotificationsReturn {
  /** Token de notificação push */
  pushToken: string | null;
  /** Estado de carregamento do token */
  isLoading: boolean;
  /** Erro durante o registro de notificações */
  error: Error | null;
  /** Função para solicitar permissões de notificação */
  requestPermissions: () => Promise<boolean>;
  /** Função para obter o token Expo Push */
  getExpoPushToken: () => Promise<string | null>;
  /** Função para registrar para notificações push */
  registerForPushNotifications: () => Promise<string | null>;
  /** Função para cancelar o registro de notificações push */
  unregisterPushNotifications: () => Promise<void>;
  /** Função para enviar notificação push */
  sendPushNotification: (
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
    type?: NotificationType
  ) => Promise<boolean>;
  /** Função para agendar notificação local */
  scheduleLocalNotification: (
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ) => Promise<string>;
  /** Função para cancelar notificação local */
  cancelLocalNotification: (notificationId: string) => Promise<void>;
  /** Função para cancelar todas as notificações locais */
  cancelAllLocalNotifications: () => Promise<void>;
}

export function useNotifications(navigation?: any, isReady: boolean = true): UseNotificationsReturn {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const notificationService = NotificationService.getInstance();
  const disableBootNavFlag = (process.env.EXPO_PUBLIC_DISABLE_BOOT_NAV ?? '').toString().toLowerCase();
  const disableBootNav = disableBootNavFlag === 'true' || disableBootNavFlag === '1' || disableBootNavFlag === 'yes';

  const initializeNotifications = useCallback(async (): Promise<(() => void) | undefined> => {
    if (!user || !isReady) return undefined;

    try {
      setIsLoading(true);
      setError(null);

      // Inicializar OneSignal
      initOneSignal();
      // Permissão OneSignal removida para evitar bloqueio de UI/Race condition no startup
      // await requestOneSignalPermission();
      integrateWithExistingNotifications();

      // Configurar tags do usuário
      if (user.id) {
        setOneSignalTags({
          user_id: user.id,
          user_type: user.isAdmin ? 'admin' : 'customer',
          email: user.email || '',
          last_login: new Date().toISOString(),
        });
      }

      // Registrar para notificações push usando o novo serviço (sem forçar permissão no startup)
      const expoToken = await mobileNotificationService.registerForPushNotifications(user.id, false);
      setPushToken(expoToken);

      // Manter compatibilidade com o serviço antigo
      await notificationService.registerUserForPushNotifications(user.id);

      // Configurar listeners
      const subscription = mobileNotificationService.setupNotificationListener((notification: Notifications.Notification) => {
        loggingService.info('Notificação recebida:', notification);
      });

      const responseSubscription = mobileNotificationService.setupNotificationResponseListener(
        (response: Notifications.NotificationResponse) => {
          const data = response.notification.request.content.data;
          loggingService.info('Resposta à notificação:', { data });

          if (disableBootNav) {
            loggingService.info('Navegação no boot desativada (EXPO_PUBLIC_DISABLE_BOOT_NAV)', { data });
            return;
          }

          // Navegar para a tela apropriada com base nos dados da notificação
          if (data) {
            // Determinar o destino com base no tipo de notificação e enfileirar
            if (data.orderId) {
              setPendingHref(`/detalhes-pedido/${data.orderId}`);
            } else if (data.type === 'ORDER_STATUS_UPDATE') {
              setPendingHref('/pedidos');
            } else if (data.type === 'PROMOTION') {
              setPendingHref('/produtos');
            }
          }
        }
      );

      return () => {
        subscription();
        responseSubscription();
        notificationService.unregisterUserFromPushNotifications(user.id);
        mobileNotificationService.unregisterToken(user.id).catch(err => {
          loggingService.error(
            'Erro ao desregistrar token:',
            err instanceof Error ? err : { error: String(err) }
          );
        });
      };
    } catch (error) {
      loggingService.error(
        'Erro ao inicializar notificações:',
        error instanceof Error ? error : { error: String(error) }
      );
      setError(error instanceof Error ? error : new Error(String(error)));
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [user, isReady, navigation, disableBootNav]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      loggingService.error(
        'Erro ao solicitar permissões:',
        error instanceof Error ? error : { error: String(error) }
      );
      return false;
    }
  }, []);

  const getExpoPushToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      loggingService.error(
        'Erro ao obter token:',
        error instanceof Error ? error : { error: String(error) }
      );
      return null;
    }
  }, []);

  /**
   * Registra o dispositivo para receber notificações push
   */
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (!user) {
      setError(new Error('Usuário não autenticado'));
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = await mobileNotificationService.registerForPushNotifications(user.id);
      setPushToken(token);
      return token;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Erro ao registrar para notificações push');
      setError(error);
      loggingService.error(
        'Erro ao registrar para notificações push',
        err instanceof Error ? err : { error: String(err) }
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Cancela o registro do dispositivo para notificações push
   */
  const unregisterPushNotifications = useCallback(async (): Promise<void> => {
    if (!user) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await mobileNotificationService.unregisterToken(user.id);
      await notificationService.unregisterUserFromPushNotifications(user.id);
      setPushToken(null);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Erro ao cancelar registro de notificações push');
      setError(error);
      loggingService.error(
        'Erro ao cancelar registro de notificações push',
        err instanceof Error ? err : { error: String(err) }
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Envia uma notificação push para um usuário
   */
  const sendPushNotification = useCallback(
    async (
      userId: string,
      title: string,
      message: string,
      data: Record<string, any> = {},
      type: NotificationType = 'order_status_update'
    ): Promise<boolean> => {
      try {
        return await mobileNotificationService.sendPushNotification(
          userId,
          title,
          message,
          data,
          type
        );
      } catch (err) {
        loggingService.error(
          'Erro ao enviar notificação push',
          err instanceof Error ? err : { error: String(err) }
        );
        Alert.alert('Erro', 'Não foi possível enviar a notificação');
        return false;
      }
    },
    []
  );

  /**
   * Agenda uma notificação local
   */
  const scheduleLocalNotification = useCallback(
    async (
      title: string,
      body: string,
      data: Record<string, any> = {},
      trigger: Notifications.NotificationTriggerInput | null = null
    ): Promise<string> => {
      try {
        return await mobileNotificationService.scheduleLocalNotification(
          title,
          body,
          data,
          trigger
        );
      } catch (err) {
        loggingService.error(
          'Erro ao agendar notificação local',
          err instanceof Error ? err : { error: String(err) }
        );
        Alert.alert('Erro', 'Não foi possível agendar a notificação');
        throw err;
      }
    },
    []
  );

  /**
   * Cancela uma notificação local
   */
  const cancelLocalNotification = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await mobileNotificationService.cancelLocalNotification(notificationId);
    } catch (err) {
      loggingService.error(
        'Erro ao cancelar notificação local',
        err instanceof Error ? err : { error: String(err) }
      );
      Alert.alert('Erro', 'Não foi possível cancelar a notificação');
      throw err;
    }
  }, []);

  /**
   * Cancela todas as notificações locais
   */
  const cancelAllLocalNotifications = useCallback(async (): Promise<void> => {
    try {
      await mobileNotificationService.cancelAllLocalNotifications();
    } catch (err) {
      loggingService.error(
        'Erro ao cancelar todas as notificações locais',
        err instanceof Error ? err : { error: String(err) }
      );
      Alert.alert('Erro', 'Não foi possível cancelar as notificações');
      throw err;
    }
  }, []);

  useEffect(() => {
    const cleanup = initializeNotifications();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [initializeNotifications]);

  return {
    pushToken,
    isLoading,
    error,
    requestPermissions,
    getExpoPushToken,
    registerForPushNotifications,
    unregisterPushNotifications,
    sendPushNotification,
    scheduleLocalNotification,
    cancelLocalNotification,
    cancelAllLocalNotifications,
  };
}
