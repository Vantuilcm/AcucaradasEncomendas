import { NotificationService } from '../../services/NotificationService';
import { NotificationType, formatNotificationMessage } from '../../config/notifications';
import { auth } from '../../config/firebase';

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
  getDoc: jest.fn().mockResolvedValue({
    exists: jest.fn().mockReturnValue(true),
    data: jest.fn().mockReturnValue({
      pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      notificationsEnabled: true,
    }),
  }),
  getDocs: jest.fn().mockResolvedValue({
    forEach: jest.fn(callback => {
      callback({
        id: 'notification-id',
        data: jest.fn().mockReturnValue({
          title: 'Test Notification',
          body: 'This is a test notification',
          timestamp: { toDate: jest.fn().mockReturnValue(new Date()) },
          read: false,
          type: 'TEST',
          data: {},
        }),
      });
    }),
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

describe('NotificationService Integration Tests', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = NotificationService.getInstance();
    jest.clearAllMocks();
  });

  test('getUserNotifications should return notifications for a user', async () => {
    const userId = 'test-user-id';
    const notifications = await notificationService.getUserNotifications(userId);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Test Notification');
    expect(notifications[0].read).toBe(false);
  });

  test('markNotificationAsRead should mark a notification as read', async () => {
    const userId = 'user-id';
    const notificationId = 'notification-id';

    const result = await notificationService.marcarComoLida(userId, notificationId);

    expect(result).toBe(true);
  });

  test('sendNotification should send a notification to a user', async () => {
    const userId = 'test-user-id';
    const type = NotificationType.PAYMENT_CONFIRMATION;
    const data = { orderId: 'order-123', orderNumber: '123' };

    const result = await notificationService.sendNotification(userId, type, data);

    expect(result).toBe(true);
  });

  test('sendPaymentConfirmation should send a payment confirmation notification', async () => {
    const orderId = 'order-123';
    const customerId = 'test-user-id';

    const result = await notificationService.sendPaymentConfirmation(customerId, orderId);

    expect(result).toBe(true);
  });

  test('should format notification messages correctly for different types', () => {
    // Test NEW_ORDER notification
    const newOrderData = { orderId: 'order-123', orderNumber: '123' };
    const newOrderMessage = formatNotificationMessage(NotificationType.NEW_ORDER, newOrderData);
    expect(newOrderMessage.title).toBe('Novo Pedido');
    expect(newOrderMessage.body).toContain('123');

    // Test ORDER_STATUS_UPDATE notification
    const statusUpdateData = { orderId: 'order-123', orderNumber: '123', status: 'em preparo' };
    const statusUpdateMessage = formatNotificationMessage(
      NotificationType.ORDER_STATUS_UPDATE,
      statusUpdateData
    );
    expect(statusUpdateMessage.title).toBe('Atualização do Pedido');
    expect(statusUpdateMessage.body).toContain('123');
    expect(statusUpdateMessage.body).toContain('em preparo');

    // Test with custom message
    const customMessageData = {
      orderId: 'order-123',
      orderNumber: '123',
      message: 'Seu pedido está quase pronto!',
    };
    const customMessage = formatNotificationMessage(
      NotificationType.ORDER_STATUS_UPDATE,
      customMessageData
    );
    expect(customMessage.title).toBe('Atualização do Pedido');
    expect(customMessage.body).toBe('Seu pedido está quase pronto!');
  });

  test('should handle sending push notifications correctly', async () => {
    // Acessar o método privado para teste
    const sendPushNotification = jest.spyOn(notificationService as any, 'sendPushNotification');

    // Enviar notificação
    const userId = 'test-user-id';
    const type = NotificationType.PAYMENT_CONFIRMATION;
    const data = { orderId: 'order-123', orderNumber: '123' };

    await notificationService.sendNotification(userId, type, data);

    // Verificar se o método sendPushNotification foi chamado com os parâmetros corretos
    expect(sendPushNotification).toHaveBeenCalledWith(
      'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      expect.any(String),
      expect.any(String),
      data
    );

    // Verificar se o fetch foi chamado com os parâmetros corretos
    expect(global.fetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
        body: expect.any(String),
      })
    );

    // Verificar o corpo da requisição
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const lastCallBody = JSON.parse(fetchCalls[fetchCalls.length - 1][1].body);

    expect(lastCallBody).toMatchObject({
      to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      sound: 'default',
      data: data,
    });
  });

  test('should handle errors when sending push notifications', async () => {
    // Mock fetch para simular erro
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Acessar o método privado para teste
    const sendPushNotification = jest.spyOn(notificationService as any, 'sendPushNotification');

    // Enviar notificação
    const userId = 'test-user-id';
    const type = NotificationType.DELIVERY_STATUS_UPDATE;
    const data = { orderId: 'order-123', orderNumber: '123', status: 'em rota' };

    // O método deve completar sem lançar exceção
    await notificationService.sendNotification(userId, type, data);

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error sending push notification:',
      expect.any(Error)
    );

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should handle different notification types correctly', async () => {
    // Testar diferentes tipos de notificação
    const userId = 'test-user-id';
    const testCases = [
      {
        type: NotificationType.DELIVERY_AVAILABLE,
        data: { orderId: 'order-123', orderNumber: '123' },
      },
      {
        type: NotificationType.DELIVERY_NEARBY,
        data: { orderId: 'order-123', orderNumber: '123', distance: '500m' },
      },
      {
        type: NotificationType.DELIVERY_STATUS_UPDATE,
        data: {
          orderId: 'order-123',
          orderNumber: '123',
          status: 'em rota',
          estimatedArrival: '15:30',
        },
      },
    ];

    for (const testCase of testCases) {
      // Limpar mocks antes de cada caso de teste
      jest.clearAllMocks();

      // Enviar notificação
      const result = await notificationService.sendNotification(
        userId,
        testCase.type,
        testCase.data
      );

      // Verificar resultado
      expect(result).toBe(true);

      // Verificar se addDoc foi chamado com os parâmetros corretos
      const message = formatNotificationMessage(testCase.type, testCase.data);
      expect(require('firebase/firestore').addDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          title: message.title,
          body: message.body,
          type: testCase.type,
          data: testCase.data,
        })
      );
    }
  });
});
