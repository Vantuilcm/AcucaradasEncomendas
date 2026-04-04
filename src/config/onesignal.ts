import { OneSignal } from 'react-native-onesignal';
import * as Sentry from '@sentry/react-native';
import { ENV } from './env';

// IDs do OneSignal vindos do ENV Guardian
const ONESIGNAL_APP_ID = ENV.EXPO_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = (process.env as any).EXPO_PUBLIC_ONESIGNAL_REST_API_KEY;

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
  buttons?: { id: string; text: string; url?: string }[];
  sendAfter?: Date;
  filters?: any[];
}

/**
 * Inicializa o OneSignal com as configurações apropriadas (SDK v5)
 * Safe Init: Verifica se o ID existe antes de inicializar.
 */
export const initOneSignal = (): boolean => {
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.includes('your-')) {
    console.warn('⚠️ [ONESIGNAL] App ID ausente ou inválido. Notificações desativadas.');
    return false;
  }

  try {
    console.log('🔔 [ONESIGNAL] Inicializando com ID:', ONESIGNAL_APP_ID);
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Solicitar permissão de notificação (iOS/Android 13+)
    OneSignal.Notifications.requestPermission(true).then((success: boolean) => {
      console.log('🔔 [ONESIGNAL] Permissão de notificação:', success ? 'Aceita' : 'Recusada');
    });

    return true;
  } catch (error) {
    console.error('❌ [ONESIGNAL] Erro ao inicializar:', error);
    Sentry.captureException(error);
    return false;
  }
};

/**
 * Envia uma notificação push via REST API do OneSignal
 * Nota: Em produção, isso deve ser feito preferencialmente via Backend.
 * Mas como o projeto é focado em Expo/Firebase, implementamos aqui para fluxo real.
 */
export const sendOneSignalNotification = async (
  userIds: string[],
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<boolean> => {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn('⚠️ [ONESIGNAL] App ID ou REST API Key ausentes. Notificação não enviada.');
    return false;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: userIds,
        headings: { en: title, pt: title },
        contents: { en: message, pt: message },
        data: data || {}
      })
    });

    const result = await response.json();
    return !!result.id;
  } catch (error) {
    console.error('❌ [ONESIGNAL] Erro ao enviar notificação:', error);
    return false;
  }
};
