import { f } from '../config/firebase';
import { useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import { mobileNotificationService } from '../services/MobileNotificationService';
import {
  initOneSignal, requestOneSignalPermission, setOneSignalTags, integrateWithExistingNotifications, } from '../config/onesignal';
import { requestNotificationPermission } from '../config/notifications';
const { doc, updateDoc } = f;
import { db } from '../config/firebase';
import { loggingService } from '../services/LoggingService';
import { UserUtils } from '../utils/UserUtils';
import { NotificationType } from '../types/Notification';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

// Configurar comportamento de notificações em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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

type NotificationsNavigationProp = StackNavigationProp<RootStackParamList>;

export function useNotifications(navigation?: NotificationsNavigationProp): UseNotificationsReturn {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const notificationService = NotificationService.getInstance();
  const normalizeError = (err: unknown): Error | Record<string, any> =>
    err instanceof Error ? err : { error: err };

  // Função para salvar o token FCM no perfil do usuário
  const saveUserFCMToken = async (userId: string, token: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        tokenUpdatedAt: new Date().toISOString(),
        platform: Platform.OS,
      });
      loggingService.info('Token FCM salvo com sucesso');
      return true;
    } catch (error) {
      loggingService.error('Erro ao salvar token FCM:', normalizeError(error));
      return false;
    }
  };

  const initializeNotifications = useCallback(async (): Promise<(() => void) | undefined> => {
    let isMounted = true;
    const userId = UserUtils.getUserId(user);
    if (!userId) {
      return undefined;
    }

    try {
      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }

      // Inicializar OneSignal
      try {
        initOneSignal();
        await requestOneSignalPermission();
        integrateWithExistingNotifications();
      } catch (osError) {
        loggingService.error('Erro ao inicializar OneSignal:', normalizeError(osError));
      }

      // Configurar tags do usuário
      try {
        setOneSignalTags({
          user_id: userId,
          user_type: UserUtils.getUserRole(user) === 'admin' ? 'admin' : 'customer',
          email: UserUtils.getUserEmail(user) || '',
          last_login: new Date().toISOString(),
        });
      } catch (tagError) {
        loggingService.error('Erro ao configurar tags OneSignal:', normalizeError(tagError));
      }

      // Solicitar permissão para notificações FCM e obter token
      let fcmToken: string | null = null;
      try {
        fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          // Salvar o token no perfil do usuário no Firestore
          await saveUserFCMToken(userId, fcmToken);
        }
      } catch (fcmError) {
        loggingService.error('Erro ao processar token FCM:', normalizeError(fcmError));
      }

      // Registrar para notificações push usando o novo serviço
      let expoToken: string | null = null;
      try {
        expoToken = await mobileNotificationService.registerForPushNotifications(userId);
        if (isMounted) {
          setPushToken(expoToken);
        }
      } catch (expoError) {
        loggingService.error('Erro ao registrar Expo Push:', normalizeError(expoError));
      }

      // Manter compatibilidade com o serviço antigo
      try {
        await notificationService.registerUserForPushNotifications(userId);
      } catch (oldServiceError) {
        loggingService.error('Erro no serviço de notificação antigo:', normalizeError(oldServiceError));
      }

      // Configurar listeners
      const subscription = mobileNotificationService.setupNotificationListener(notification => {
        loggingService.info('Notificação recebida:', notification);
      });

      const responseSubscription = mobileNotificationService.setupNotificationResponseListener(
        response => {
          try {
            const data = response.notification.request.content.data;
            loggingService.info('Resposta à notificação:', data);

            // Navegar para a tela apropriada com base nos dados da notificação
            if (navigation && data) {
              if (data.type === 'NEW_ORDER') {
                navigation.navigate('OrderDetails', { orderId: data.orderId });
              } else if (data.type === 'ORDER_STATUS_UPDATE') {
                navigation.navigate('MainTabs', { screen: 'Orders' });
              }
            }
          } catch (navError) {
            loggingService.error('Erro ao processar clique na notificação:', normalizeError(navError));
          }
        }
      );

      return () => {
        isMounted = false;
        subscription();
        responseSubscription();
        if (userId) {
          notificationService.unregisterUserFromPushNotifications(userId).catch(err => {
            loggingService.error('Erro ao desregistrar usuário (antigo):', normalizeError(err));
          });
        }
        if (expoToken) {
          mobileNotificationService.unregisterToken(expoToken).catch(err => {
            loggingService.error('Erro ao desregistrar token:', normalizeError(err));
          });
        }
      };
    } catch (error) {
      loggingService.error('Erro ao inicializar notificações:', normalizeError(error));
      if (isMounted) {
        setError(error instanceof Error ? error : new Error('Erro ao inicializar notificações'));
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
    return undefined;
  }, [user, navigation]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      loggingService.error('Erro ao solicitar permissões:', normalizeError(error));
      return false;
    }
  }, []);

  const getExpoPushToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      loggingService.error('Erro ao obter token:', normalizeError(error));
      return null;
    }
  }, []);

  /**
   * Registra o dispositivo para receber notificações push
   */
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    const userId = UserUtils.getUserId(user);
    if (!userId) {
      setError(new Error('Usuário não autenticado'));
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = await mobileNotificationService.registerForPushNotifications(userId);
      setPushToken(token);
      return token;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Erro ao registrar para notificações push');
      setError(error);
      loggingService.error('Erro ao registrar para notificações push', normalizeError(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Cancela o registro do dispositivo para notificações push
   */
  const unregisterPushNotifications = useCallback(async (): Promise<void> => {
    const userId = UserUtils.getUserId(user);
    if (!pushToken || !userId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await mobileNotificationService.unregisterToken(pushToken);
      await notificationService.unregisterUserFromPushNotifications(userId);
      setPushToken(null);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Erro ao cancelar registro de notificações push');
      setError(error);
      loggingService.error('Erro ao cancelar registro de notificações push', normalizeError(err));
    } finally {
      setIsLoading(false);
    }
  }, [pushToken, user]);

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
        loggingService.error('Erro ao enviar notificação push', normalizeError(err));
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
      trigger: Notifications.NotificationTriggerInput = null
    ): Promise<string> => {
      try {
        return await mobileNotificationService.scheduleLocalNotification(
          title,
          body,
          data,
          trigger
        );
      } catch (err) {
        loggingService.error('Erro ao agendar notificação local', normalizeError(err));
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
      loggingService.error('Erro ao cancelar notificação local', normalizeError(err));
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
      loggingService.error('Erro ao cancelar todas as notificações locais', normalizeError(err));
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
