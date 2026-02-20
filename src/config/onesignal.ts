import { Platform } from 'react-native';
import { LoggingService } from '@/services/LoggingService';
import Constants from 'expo-constants';

const logger = LoggingService.getInstance();

// Mock OneSignal para evitar erros no Expo Go ou Web
export let OneSignal: any;
const isExpoGo = Constants.executionEnvironment === 'storeClient';

try {
  if (Platform.OS !== 'web' && !isExpoGo) {
    // Só tenta carregar o módulo nativo se não for Web e não for Expo Go
    const OneSignalModule = require('react-native-onesignal');
    OneSignal = OneSignalModule.OneSignal || OneSignalModule;
  } else {
    throw new Error('Ambiente sem suporte nativo ao OneSignal');
  }
} catch (error) {
  // Mock silencioso para evitar crashes
  OneSignal = {
    setLogLevel: () => {},
    initialize: () => {},
    login: () => {},
    logout: () => {},
    Notifications: {
      requestPermission: async () => false,
      addEventListener: () => ({ remove: () => {} }),
    },
    InAppMessages: {
      addEventListener: () => ({ remove: () => {} }),
    },
    User: {
      addTag: () => {},
      addTags: () => {},
      removeTag: () => {},
    }
  };
}

// Determinar ambiente (desenvolvimento ou produção)
const isDevelopment = __DEV__;
const ENV = isDevelopment ? 'development' : 'production';

// IDs do OneSignal para diferentes ambientes
const ONESIGNAL_APP_ID = {
  development: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || Constants.expoConfig?.extra?.onesignalAppId || '2df9c7f0-6fb7-4cbe-87e9-c6fb116203f7',
  production: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || Constants.expoConfig?.extra?.onesignalAppId || '2df9c7f0-6fb7-4cbe-87e9-c6fb116203f7',
};

const rawEnableOneSignal = process.env.EXPO_PUBLIC_ENABLE_ONESIGNAL ?? Constants.expoConfig?.extra?.enableOneSignal
const ENABLE_ONESIGNAL = rawEnableOneSignal === true || rawEnableOneSignal === 1 || rawEnableOneSignal === '1' || rawEnableOneSignal === 'true' || rawEnableOneSignal === 'yes'
let oneSignalInitialized = false

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
  if (!ENABLE_ONESIGNAL) {
    console.log('[OneSignal] Inicialização desativada por EXPO_PUBLIC_ENABLE_ONESIGNAL')
    return true
  }

  if (oneSignalInitialized) return true

  try {
    const appId = ONESIGNAL_APP_ID[ENV]
    if (!appId) return false
    if (!OneSignal || typeof OneSignal.initialize !== 'function') return false

    OneSignal.initialize(appId)

    try {
      OneSignal.InAppMessages?.addEventListener?.('click', (event: any) => {
        logger.debug('OneSignal IAM clicked', { event })
      })
    } catch {}

    try {
      OneSignal.Notifications?.addEventListener?.('foregroundWillDisplay', (event: any) => {
        logger.debug('OneSignal: notification will show in foreground', {
          notification: event?.getNotification?.(),
        })
      })
    } catch {}

    try {
      OneSignal.Notifications?.addEventListener?.('click', (event: any) => {
        logger.info('OneSignal: notification opened', { event })
      })
    } catch {}

    oneSignalInitialized = true
    logger.info(`OneSignal inicializado com App ID: ${appId}`, {
      environment: ENV,
      isDevelopment,
    })
    return true
  } catch (error: any) {
    logger.error('Erro ao inicializar OneSignal', error)
    return false
  }
};

/**
 * Solicita permissão para enviar notificações push
 */
export const requestOneSignalPermission = async () => {
  try {
    // Verificar se o app está sendo executado em um dispositivo físico
    if (Platform.OS === 'web') {
      logger.info('Push notifications are not supported on web');
      return false;
    }

    // Solicitar permissão para notificações
    const hasPermission = OneSignal.Notifications.permission;

    if (hasPermission) {
      logger.debug('Notification permission already granted');
      return true;
    }

    // Solicitar permissão
    const response = await OneSignal.Notifications.requestPermission(true);
    logger.info('OneSignal: User response to notification permission', { response });

    return response;
  } catch (error: any) {
    logger.error('Error requesting OneSignal permission', error);
    return false;
  }
};

/**
 * Obtém o ID do usuário do OneSignal
 */
export const getOneSignalUserId = () => {
  try {
    return OneSignal.User.pushSubscription.getPushSubscriptionId() || null;
  } catch (error: any) {
    logger.error('Error getting OneSignal user ID', error);
    return null;
  }
};

/**
 * Define tags para segmentação de usuários
 * @param tags Objeto com pares chave-valor para as tags
 */
export const setOneSignalTags = (tags: Record<string, string | number | boolean>) => {
  try {
    // Converter todos os valores para string, conforme exigido pelo SDK v5
    const stringTags: Record<string, string> = {};
    Object.entries(tags).forEach(([key, value]) => {
      stringTags[key] = String(value);
    });
    
    OneSignal.User.addTags(stringTags);
    logger.debug('OneSignal: Tags set successfully', { tags: stringTags });
    return true;
  } catch (error: any) {
    logger.error('Error setting OneSignal tags', { tags, error });
    return false;
  }
};

/**
 * Remove tags do usuário
 * @param keys Array de chaves de tags para remover
 */
export const deleteOneSignalTags = (keys: string[]) => {
  try {
    OneSignal.User.removeTags(keys);
    logger.debug('OneSignal: Tags deleted successfully', { keys });
    return true;
  } catch (error) {
    logger.error('Error deleting OneSignal tags', { keys, error });
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
  logger.info('Sending notification to user', { userId, notification });

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
  logger.info('Sending notification to segment', { segment, notification });

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
  logger.info('OneSignal e-commerce tracking configured for user', { userId });
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

    logger.info('Purchase tracked in OneSignal', { amount, currency, transactionId });
    return true;
  } catch (error: any) {
    logger.error('Error tracking purchase in OneSignal', error);
    return false;
  }
};

/**
 * Integra o OneSignal com o sistema de notificações existente
 */
export const integrateWithExistingNotifications = () => {
  // Aqui você pode adicionar código para integrar o OneSignal com o sistema
  // de notificações existente baseado no Expo Notifications
  logger.info('OneSignal integrated with existing notification system');
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
