import * as ExpoNotifications from 'expo-notifications';
import Constants from 'expo-constants';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

// Notification types
export enum NotificationType {
  NEW_ORDER = 'NEW_ORDER',
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  DELIVERY_AVAILABLE = 'DELIVERY_AVAILABLE',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  DELIVERY_STATUS_UPDATE = 'DELIVERY_STATUS_UPDATE',
  DELIVERY_NEARBY = 'DELIVERY_NEARBY',
  SECURITY_ALERT = 'SECURITY_ALERT',
}

// Function to check notification permissions without requesting them
export const checkNotificationPermission = async () => {
  try {
    const { status } = await ExpoNotifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    logger.error('Error checking notification permission:', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
};

// Function to request notification permissions
export const requestNotificationPermission = async (force: boolean = false) => {
  try {
    // Verificar se o app está sendo executado em um dispositivo físico
    const { isDevice } = Constants;
    if (!isDevice) {
      logger.info('Notificações push requerem um dispositivo físico');
      return null;
    }

    // Solicitar permissões de notificação
    const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted' && force) {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.info('Permissão para notificações não concedida');
      return null;
    }

    // Obter token do Expo para notificações push
    // Criar opções para obter o token
    const tokenOptions: ExpoNotifications.ExpoPushTokenOptions = {};

    // Verificar se o projectId está disponível e adicioná-lo às opções
    try {
      // Primeiro tenta acessar a nova estrutura do Constants (Expo SDK 48+)
      if (Constants.expoConfig?.extra?.eas?.projectId) {
        tokenOptions.projectId = Constants.expoConfig.extra.eas.projectId;
      }
      // Fallback para a estrutura antiga do Constants
      else if ((Constants.manifest as any)?.extra?.eas?.projectId) {
        tokenOptions.projectId = (Constants.manifest as any).extra.eas.projectId;
      }
      // Usar o ID do manifesto como fallback
      else if ((Constants.manifest as any)?.id) {
        // ExpoPushTokenOptions no SDKs recentes usa apenas projectId; não definir experienceId
        // Manter apenas projectId; se indisponível, será definido abaixo
      }
      // Último recurso: usar o valor definido no app.json
      else {
        tokenOptions.projectId = 'acucaradas-app';
      }
    } catch (error) {
      logger.warn('Erro ao obter projectId para notificações:', error instanceof Error ? error : new Error(String(error)));
      // Usar valor fixo como último recurso
      tokenOptions.projectId = 'acucaradas-app';
    }

    const expoPushToken = await ExpoNotifications.getExpoPushTokenAsync(tokenOptions);

    return expoPushToken.data;
  } catch (error) {
    logger.error('Error requesting notification permission:', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
};

// Function to handle incoming messages
export const onMessageListener = () => {
  return new Promise(resolve => {
    const subscription = ExpoNotifications.addNotificationReceivedListener(notification => {
      resolve(notification);
    });

    // Retornar função para remover o listener
    return () => subscription.remove();
  });
};

// Function to format notification message
export const formatNotificationMessage = (type: NotificationType, data: any) => {
  // Use order number if available, otherwise use order ID
  const orderIdentifier = data.orderNumber || data.orderId;

  switch (type) {
    case NotificationType.NEW_ORDER:
      return {
        title: 'Novo Pedido',
        body: `Você recebeu um novo pedido #${orderIdentifier}`,
      };
    case NotificationType.ORDER_STATUS_UPDATE:
      // Use custom message if provided
      if (data.message) {
        return {
          title: 'Atualização do Pedido',
          body: data.message,
        };
      }
      return {
        title: 'Atualização do Pedido',
        body: `Seu pedido #${orderIdentifier} está ${data.status}`,
      };
    case NotificationType.DELIVERY_AVAILABLE:
      return {
        title: 'Nova Entrega Disponível',
        body: `Entrega disponível para o pedido #${orderIdentifier}`,
      };
    case NotificationType.PAYMENT_CONFIRMATION:
      return {
        title: 'Pagamento Confirmado',
        body: `O pagamento do pedido #${orderIdentifier} foi confirmado`,
      };
    case NotificationType.DELIVERY_STATUS_UPDATE:
      // Use custom message if provided
      if (data.message) {
        return {
          title: 'Atualização da Entrega',
          body: data.message,
        };
      }

      // Format status message based on status
      let statusMessage = `A entrega do pedido #${orderIdentifier} está ${data.status}`;

      // Add ETA if available
      if (data.estimatedArrival) {
        statusMessage += `. Chegada estimada: ${data.estimatedArrival}`;
      }

      return {
        title: 'Atualização da Entrega',
        body: statusMessage,
      };
    case NotificationType.DELIVERY_NEARBY:
      // Use custom message if provided
      if (data.message) {
        return {
          title: 'Entrega Próxima',
          body: data.message,
        };
      }
      return {
        title: 'Entrega Próxima',
        body: `Seu pedido #${orderIdentifier} está a ${data.distance} do local de entrega!`,
      };
    default:
      return {
        title: 'Notificação',
        body: 'Você recebeu uma nova notificação',
      };
  }
};
