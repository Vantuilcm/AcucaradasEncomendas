import OneSignal from 'react-native-onesignal';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import OneSignal from 'onesignal-expo-plugin/build/OneSignal';

// Determinar ambiente (desenvolvimento ou produção)
const isDevelopment = __DEV__;
const ENV = isDevelopment ? 'development' : 'production';

// IDs do OneSignal para diferentes ambientes
const ONESIGNAL_APP_ID = {
  development: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 'seu_id_de_desenvolvimento_onesignal',
  production: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 'seu_id_de_producao_onesignal',
};

// Tipos de notificação suportados pelo OneSignal
export enum OneSignalNotificationType {
  NEW_ORDER = 'NEW_ORDER',
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  DELIVERY_AVAILABLE = 'DELIVERY_AVAILABLE',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  DELIVERY_STATUS_UPDATE = 'DELIVERY_STATUS_UPDATE',
  DELIVERY_NEARBY = 'DELIVERY_NEARBY',
  PROMOTION = 'PROMOTION',
  ACCOUNT_UPDATE = 'ACCOUNT_UPDATE',
  CUSTOM = 'CUSTOM',
}

// Tags para segmentação de usuários
export enum OneSignalUserTag {
  USER_TYPE = 'user_type', // cliente, entregador, admin
  LOCATION = 'location', // região/cidade
  LAST_ORDER_DATE = 'last_order_date',
  ORDER_COUNT = 'order_count',
  FAVORITE_CATEGORY = 'favorite_category',
  SUBSCRIPTION_STATUS = 'subscription_status',
}

// Interface para dados de notificação
export interface OneSignalNotificationData {
  title: string;
  message: string;
  data?: Record<string, any>;
  url?: string;
  imageUrl?: string;
  buttons?: Array<{ id: string; text: string; url?: string }>;
  sendAfter?: Date;
  filters?: Array<any>;
}

/**
 * Inicializa o OneSignal com as configurações apropriadas
 */
export const initOneSignal = (): boolean => {
  try {
    // Configurar nível de log para debug em desenvolvimento
    if (isDevelopment) {
      OneSignal.setLogLevel(6, 0); // DEBUG level
    } else {
      OneSignal.setLogLevel(0, 0); // No logs in production
    }

    // Inicializar OneSignal com o App ID
    OneSignal.setAppId(ONESIGNAL_APP_ID[ENV]);

    // Habilitar notificações in-app
    OneSignal.setInAppMessageClickHandler(event => {
      console.log('OneSignal IAM clicked:', event);
    });

    // Configurar manipulador de notificações
    OneSignal.setNotificationWillShowInForegroundHandler(notificationReceivedEvent => {
      console.log('OneSignal: notification will show in foreground:', notificationReceivedEvent);
      // Complete o evento para mostrar a notificação
      notificationReceivedEvent.complete(notificationReceivedEvent.getNotification());
    });

    // Configurar manipulador de cliques em notificações
    OneSignal.setNotificationOpenedHandler(openedEvent => {
      console.log('OneSignal: notification opened:', openedEvent);
      const { action, notification } = openedEvent;

      // Aqui você pode adicionar lógica para lidar com diferentes ações
      // Por exemplo, navegar para uma tela específica com base nos dados da notificação
    });

    console.log(`OneSignal inicializado com App ID: ${ONESIGNAL_APP_ID[ENV]}`);
    console.log(`Ambiente: ${isDevelopment ? 'Desenvolvimento' : 'Produção'}`);
    
    return true;
  } catch (error) {
    console.error('Erro ao inicializar OneSignal:', error);
    return false;
  }
};

/**
 * Solicita permissão para enviar notificações push
 */
export const requestOneSignalPermission = async () => {
  try {
    // Verificar se o app está sendo executado em um dispositivo físico
    if (Platform.OS === 'web') {
      console.log('Push notifications are not supported on web');
      return false;
    }

    // Solicitar permissão para notificações
    const deviceState = await OneSignal.getDeviceState();

    if (deviceState?.hasNotificationPermission) {
      console.log('Notification permission already granted');
      return true;
    }

    // Solicitar permissão
    OneSignal.promptForPushNotificationsWithUserResponse(response => {
      console.log('OneSignal: User response to notification permission:', response);
      return response;
    });

    return true;
  } catch (error) {
    console.error('Error requesting OneSignal permission:', error);
    return false;
  }
};

/**
 * Obtém o ID do usuário do OneSignal
 */
export const getOneSignalUserId = async () => {
  try {
    const deviceState = await OneSignal.getDeviceState();
    return deviceState?.userId || null;
  } catch (error) {
    console.error('Error getting OneSignal user ID:', error);
    return null;
  }
};

/**
 * Define tags para segmentação de usuários
 * @param tags Objeto com pares chave-valor para as tags
 */
export const setOneSignalTags = async (tags: Record<string, string | number | boolean>) => {
  try {
    await OneSignal.sendTags(tags);
    console.log('OneSignal: Tags set successfully', tags);
    return true;
  } catch (error) {
    console.error('Error setting OneSignal tags:', error);
    return false;
  }
};

/**
 * Remove tags do usuário
 * @param keys Array de chaves de tags para remover
 */
export const deleteOneSignalTags = async (keys: string[]) => {
  try {
    await OneSignal.deleteTags(keys);
    console.log('OneSignal: Tags deleted successfully', keys);
    return true;
  } catch (error) {
    console.error('Error deleting OneSignal tags:', error);
    return false;
  }
};

/**
 * Formata uma notificação com base no tipo e dados
 */
export const formatOneSignalNotification = (
  type: OneSignalNotificationType,
  data: any
): OneSignalNotificationData => {
  // Use order number if available, otherwise use order ID
  const orderIdentifier = data.orderNumber || data.orderId || '';

  switch (type) {
    case OneSignalNotificationType.NEW_ORDER:
      return {
        title: 'Novo Pedido',
        message: `Você recebeu um novo pedido #${orderIdentifier}`,
        data: { type, orderId: data.orderId, screen: 'OrderDetails' },
      };

    case OneSignalNotificationType.ORDER_STATUS_UPDATE:
      return {
        title: 'Atualização do Pedido',
        message: data.message || `Seu pedido #${orderIdentifier} está ${data.status}`,
        data: { type, orderId: data.orderId, status: data.status, screen: 'OrderDetails' },
      };

    case OneSignalNotificationType.DELIVERY_AVAILABLE:
      return {
        title: 'Nova Entrega Disponível',
        message: `Entrega disponível para o pedido #${orderIdentifier}`,
        data: { type, orderId: data.orderId, screen: 'DeliveryDetails' },
      };

    case OneSignalNotificationType.PAYMENT_CONFIRMATION:
      return {
        title: 'Pagamento Confirmado',
        message: `O pagamento do pedido #${orderIdentifier} foi confirmado`,
        data: { type, orderId: data.orderId, screen: 'OrderDetails' },
      };

    case OneSignalNotificationType.DELIVERY_STATUS_UPDATE:
      let statusMessage =
        data.message || `A entrega do pedido #${orderIdentifier} está ${data.status}`;

      if (data.estimatedArrival) {
        statusMessage += `. Chegada estimada: ${data.estimatedArrival}`;
      }

      return {
        title: 'Atualização da Entrega',
        message: statusMessage,
        data: {
          type,
          orderId: data.orderId,
          status: data.status,
          estimatedArrival: data.estimatedArrival,
          screen: 'DeliveryTracking',
        },
      };

    case OneSignalNotificationType.DELIVERY_NEARBY:
      return {
        title: 'Entrega Próxima',
        message: data.message || `Sua entrega do pedido #${orderIdentifier} está próxima!`,
        data: { type, orderId: data.orderId, screen: 'DeliveryTracking' },
      };

    case OneSignalNotificationType.PROMOTION:
      return {
        title: data.title || 'Promoção Especial',
        message: data.message || 'Temos uma oferta especial para você!',
        imageUrl: data.imageUrl,
        data: { type, promoId: data.promoId, screen: 'PromotionDetails' },
      };

    case OneSignalNotificationType.ACCOUNT_UPDATE:
      return {
        title: 'Atualização da Conta',
        message: data.message || 'Sua conta foi atualizada',
        data: { type, screen: 'AccountSettings' },
      };

    case OneSignalNotificationType.CUSTOM:
      return {
        title: data.title || 'Notificação',
        message: data.message || 'Você tem uma nova notificação',
        imageUrl: data.imageUrl,
        data: { ...data },
      };

    default:
      return {
        title: 'Notificação',
        message: 'Você tem uma nova notificação',
        data: { type },
      };
  }
};

/**
 * Envia uma notificação para um usuário específico
 */
export const sendOneSignalNotificationToUser = async (
  userId: string,
  notification: OneSignalNotificationData
) => {
  // Esta função seria implementada no backend
  // O OneSignal não permite enviar notificações diretamente do cliente
  console.log('Sending notification to user', userId, notification);

  // Aqui você chamaria sua API backend que usa a API REST do OneSignal
  // para enviar a notificação para o usuário específico

  return true;
};

/**
 * Envia uma notificação para um segmento de usuários
 */
export const sendOneSignalNotificationToSegment = async (
  segment: string,
  notification: OneSignalNotificationData
) => {
  // Esta função seria implementada no backend
  // O OneSignal não permite enviar notificações diretamente do cliente
  console.log('Sending notification to segment', segment, notification);

  // Aqui você chamaria sua API backend que usa a API REST do OneSignal
  // para enviar a notificação para o segmento específico

  return true;
};

/**
 * Configura o OneSignal para rastrear eventos de comércio eletrônico
 */
export const setupOneSignalEcommerce = (userId: string) => {
  // Configurar identificação do usuário para análise
  OneSignal.setExternalUserId(userId);

  // Você pode adicionar mais configurações específicas para e-commerce aqui
  console.log('OneSignal e-commerce tracking configured for user', userId);
};

/**
 * Registra um evento de compra no OneSignal
 */
export const trackOneSignalPurchase = async (
  amount: number,
  currency: string = 'BRL',
  transactionId: string
) => {
  try {
    // O OneSignal tem métodos para rastrear compras, mas eles são específicos para iOS/Android
    // Esta é uma implementação genérica
    await setOneSignalTags({
      last_purchase_date: new Date().toISOString(),
      last_purchase_amount: amount.toString(),
      last_purchase_id: transactionId,
    });

    console.log('Purchase tracked in OneSignal', { amount, currency, transactionId });
    return true;
  } catch (error) {
    console.error('Error tracking purchase in OneSignal:', error);
    return false;
  }
};

/**
 * Integra o OneSignal com o sistema de notificações existente
 */
export const integrateWithExistingNotifications = () => {
  // Aqui você pode adicionar código para integrar o OneSignal com o sistema
  // de notificações existente baseado no Expo Notifications
  console.log('OneSignal integrated with existing notification system');
};

// Exportar uma interface unificada para o sistema de notificações
export default {
  init: initOneSignal,
  requestPermission: requestOneSignalPermission,
  getUserId: getOneSignalUserId,
  setTags: setOneSignalTags,
  deleteTags: deleteOneSignalTags,
  formatNotification: formatOneSignalNotification,
  setupEcommerce: setupOneSignalEcommerce,
  trackPurchase: trackOneSignalPurchase,
  integrateWithExistingNotifications,
};
