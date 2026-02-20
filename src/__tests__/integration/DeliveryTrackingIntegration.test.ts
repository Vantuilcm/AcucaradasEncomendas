import { NotificationService } from '../../services/NotificationService';
import { NotificationType } from '../../config/notifications';

// Mock para o módulo expo-notifications
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest
    .fn()
    .mockResolvedValue({ data: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  addNotificationReceivedListener: jest.fn().mockReturnValue({
    remove: jest.fn(),
  }),
  setNotificationHandler: jest.fn(),
}));

// Mock para o módulo firebase/firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn().mockImplementation(docRef => {
    // Simular diferentes respostas com base no caminho do documento
    if (docRef.path && docRef.path.includes('orders')) {
      return {
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue({
          userId: 'test-user-id',
          orderNumber: '123',
          status: 'em_entrega',
        }),
      };
    }

    // Resposta padrão para usuários
    return {
      exists: jest.fn().mockReturnValue(true),
      data: jest.fn().mockReturnValue({
        pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        notificationsEnabled: true,
      }),
    };
  }),
  getDocs: jest.fn().mockResolvedValue({
    forEach: jest.fn(),
  }),
  updateDoc: jest.fn().mockResolvedValue({}),
  addDoc: jest.fn().mockResolvedValue({}),
  Timestamp: {
    now: jest.fn().mockReturnValue(new Date()),
  },
  where: jest.fn(),
}));

// Mock para o módulo node-fetch
global.fetch = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    json: jest.fn().mockResolvedValue({}),
    ok: true,
    status: 200,
  });
});

// Simulação do DeliveryTrackingService
class MockDeliveryTrackingService {
  private static instance: MockDeliveryTrackingService;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): MockDeliveryTrackingService {
    if (!MockDeliveryTrackingService.instance) {
      MockDeliveryTrackingService.instance = new MockDeliveryTrackingService();
    }
    return MockDeliveryTrackingService.instance;
  }

  // Método para atualizar o status de entrega
  public async updateDeliveryStatus(
    orderId: string,
    status: string,
    estimatedArrival?: string
  ): Promise<boolean> {
    try {
      // Obter informações do pedido
      const orderRef = require('firebase/firestore').doc(
        require('../../config/firebase').db,
        'orders',
        orderId
      );
      const orderDoc = await require('firebase/firestore').getDoc(orderRef);

      if (!orderDoc.exists()) {
        console.error('Order not found');
        return false;
      }

      const orderData = orderDoc.data();
      const userId = orderData.userId;

      // Atualizar status do pedido
      await require('firebase/firestore').updateDoc(orderRef, { deliveryStatus: status });

      // Enviar notificação de atualização de status
      await this.notificationService.sendNotification(
        userId,
        NotificationType.DELIVERY_STATUS_UPDATE,
        {
          orderId: orderId,
          orderNumber: orderData.orderNumber,
          status: status,
          estimatedArrival: estimatedArrival,
        }
      );

      return true;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      return false;
    }
  }

  // Método para notificar que o entregador está próximo
  public async notifyDeliveryNearby(orderId: string, distance: string): Promise<boolean> {
    try {
      // Obter informações do pedido
      const orderRef = require('firebase/firestore').doc(
        require('../../config/firebase').db,
        'orders',
        orderId
      );
      const orderDoc = await require('firebase/firestore').getDoc(orderRef);

      if (!orderDoc.exists()) {
        console.error('Order not found');
        return false;
      }

      const orderData = orderDoc.data();
      const userId = orderData.userId;

      // Enviar notificação de entregador próximo
      await this.notificationService.sendNotification(userId, NotificationType.DELIVERY_NEARBY, {
        orderId: orderId,
        orderNumber: orderData.orderNumber,
        distance: distance,
      });

      return true;
    } catch (error) {
      console.error('Error notifying delivery nearby:', error);
      return false;
    }
  }

  // Método para notificar que há uma entrega disponível
  public async notifyDeliveryAvailable(orderId: string): Promise<boolean> {
    try {
      // Obter informações do pedido
      const orderRef = require('firebase/firestore').doc(
        require('../../config/firebase').db,
        'orders',
        orderId
      );
      const orderDoc = await require('firebase/firestore').getDoc(orderRef);

      if (!orderDoc.exists()) {
        console.error('Order not found');
        return false;
      }

      const orderData = orderDoc.data();
      const userId = orderData.userId;

      // Enviar notificação de entrega disponível
      await this.notificationService.sendNotification(userId, NotificationType.DELIVERY_AVAILABLE, {
        orderId: orderId,
        orderNumber: orderData.orderNumber,
      });

      return true;
    } catch (error) {
      console.error('Error notifying delivery available:', error);
      return false;
    }
  }
}

describe('DeliveryTracking Integration Tests', () => {
  let deliveryTrackingService: MockDeliveryTrackingService;
  let notificationService: NotificationService;

  beforeEach(() => {
    deliveryTrackingService = MockDeliveryTrackingService.getInstance();
    notificationService = NotificationService.getInstance();
    jest.clearAllMocks();
  });

  test('should send delivery status update notification', async () => {
    // Espionar o método sendNotification
    const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');

    // Atualizar status de entrega
    const orderId = 'order-123';
    const status = 'em rota';
    const estimatedArrival = '15:30';

    const result = await deliveryTrackingService.updateDeliveryStatus(
      orderId,
      status,
      estimatedArrival
    );

    // Verificar resultado
    expect(result).toBe(true);

    // Verificar se a notificação foi enviada com os parâmetros corretos
    expect(sendNotificationSpy).toHaveBeenCalledWith(
      'test-user-id',
      NotificationType.DELIVERY_STATUS_UPDATE,
      expect.objectContaining({
        orderId: orderId,
        orderNumber: '123',
        status: status,
        estimatedArrival: estimatedArrival,
      })
    );

    // Verificar se o documento foi atualizado
    expect(require('firebase/firestore').updateDoc).toHaveBeenCalledWith(expect.any(Object), {
      deliveryStatus: status,
    });
  });

  test('should send delivery nearby notification', async () => {
    // Espionar o método sendNotification
    const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');

    // Notificar entregador próximo
    const orderId = 'order-123';
    const distance = '500m';

    const result = await deliveryTrackingService.notifyDeliveryNearby(orderId, distance);

    // Verificar resultado
    expect(result).toBe(true);

    // Verificar se a notificação foi enviada com os parâmetros corretos
    expect(sendNotificationSpy).toHaveBeenCalledWith(
      'test-user-id',
      NotificationType.DELIVERY_NEARBY,
      expect.objectContaining({
        orderId: orderId,
        orderNumber: '123',
        distance: distance,
      })
    );
  });

  test('should send delivery available notification', async () => {
    // Espionar o método sendNotification
    const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');

    // Notificar entrega disponível
    const orderId = 'order-123';

    const result = await deliveryTrackingService.notifyDeliveryAvailable(orderId);

    // Verificar resultado
    expect(result).toBe(true);

    // Verificar se a notificação foi enviada com os parâmetros corretos
    expect(sendNotificationSpy).toHaveBeenCalledWith(
      'test-user-id',
      NotificationType.DELIVERY_AVAILABLE,
      expect.objectContaining({
        orderId: orderId,
        orderNumber: '123',
      })
    );
  });

  test('should handle errors when order is not found', async () => {
    // Modificar o mock para simular pedido não encontrado
    require('firebase/firestore').getDoc.mockResolvedValueOnce({
      exists: jest.fn().mockReturnValue(false),
      data: jest.fn(),
    });

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Tentar atualizar status de entrega
    const orderId = 'non-existent-order';
    const status = 'em rota';

    const result = await deliveryTrackingService.updateDeliveryStatus(orderId, status);

    // Verificar resultado
    expect(result).toBe(false);

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith('Order not found');

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should handle network errors when sending notifications', async () => {
    // Mock fetch para simular erro de rede
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Atualizar status de entrega
    const orderId = 'order-123';
    const status = 'em rota';

    // O método deve completar sem lançar exceção
    const result = await deliveryTrackingService.updateDeliveryStatus(orderId, status);

    // Verificar resultado (deve ser true mesmo com erro de rede, pois o status foi atualizado)
    expect(result).toBe(true);

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error sending push notification:',
      expect.any(Error)
    );

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should handle multiple notification types in sequence', async () => {
    // Espionar o método sendNotification
    const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');

    const orderId = 'order-123';

    // Sequência de notificações para simular o fluxo de entrega
    await deliveryTrackingService.notifyDeliveryAvailable(orderId);
    await deliveryTrackingService.updateDeliveryStatus(orderId, 'em preparação');
    await deliveryTrackingService.updateDeliveryStatus(orderId, 'em rota', '15:30');
    await deliveryTrackingService.notifyDeliveryNearby(orderId, '500m');
    await deliveryTrackingService.updateDeliveryStatus(orderId, 'entregue');

    // Verificar se todas as notificações foram enviadas
    expect(sendNotificationSpy).toHaveBeenCalledTimes(5);

    // Verificar se as notificações foram enviadas na ordem correta
    expect(sendNotificationSpy.mock.calls[0][1]).toBe(NotificationType.DELIVERY_AVAILABLE);
    expect(sendNotificationSpy.mock.calls[1][1]).toBe(NotificationType.DELIVERY_STATUS_UPDATE);
    expect(sendNotificationSpy.mock.calls[2][1]).toBe(NotificationType.DELIVERY_STATUS_UPDATE);
    expect(sendNotificationSpy.mock.calls[3][1]).toBe(NotificationType.DELIVERY_NEARBY);
    expect(sendNotificationSpy.mock.calls[4][1]).toBe(NotificationType.DELIVERY_STATUS_UPDATE);
  });
});
