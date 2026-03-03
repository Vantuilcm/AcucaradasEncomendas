import { MobileNotificationService } from '../MobileNotificationService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { loggingService } from '../LoggingService';
import { NotificationSettingsService } from '../NotificationSettingsService';

// Mock das dependências
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      projectId: 'test-project-id',
    },
  },
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

jest.mock('../LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock do NotificationSettingsService
const mockShouldReceiveNotification = jest.fn();
jest.mock('../NotificationSettingsService', () => ({
  NotificationSettingsService: jest.fn().mockImplementation(() => ({
    shouldReceiveNotification: mockShouldReceiveNotification,
  })),
}));

// Mock do fetch global
global.fetch = jest.fn();

describe('MobileNotificationService', () => {
  let mobileNotificationService: MobileNotificationService;
  const userId = 'test-user-id';
  const deviceId = 'test-device';
  const token = 'ExponentPushToken[test-token]';

  beforeEach(() => {
    jest.clearAllMocks();
    mobileNotificationService = new MobileNotificationService();

    // Configuração padrão dos mocks
    (Device as any).isDevice = true;
    (Device as any).deviceName = deviceId;

    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
      canAskAgain: true,
      granted: true,
    });

    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: token,
      type: 'expo',
    });

    (doc as jest.Mock).mockReturnValue({ id: token });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        userId,
        token,
        deviceId,
        platform: 'ios',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    mockShouldReceiveNotification.mockResolvedValue(true);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { status: 'ok' } }),
    });
  });

  describe('registerForPushNotifications', () => {
    it('deve registrar o token de notificação com sucesso', async () => {
      const result = await mobileNotificationService.registerForPushNotifications(userId);

      expect(result).toBe(token);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(doc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalled();
      expect(loggingService.info).toHaveBeenCalled();
    });

    it('deve retornar null quando não estiver em um dispositivo físico', async () => {
      (Device as any).isDevice = false;

      const result = await mobileNotificationService.registerForPushNotifications(userId);

      expect(result).toBeNull();
      expect(loggingService.info).toHaveBeenCalledWith(
        'Notificações push não funcionam em emulador/simulador'
      );
    });

    it('deve solicitar permissões quando não estiverem concedidas', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      });

      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      const result = await mobileNotificationService.registerForPushNotifications(userId);

      expect(result).toBe(token);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    });

    it('deve retornar null quando as permissões forem negadas', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      });

      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        granted: false,
      });

      const result = await mobileNotificationService.registerForPushNotifications(userId);

      expect(result).toBeNull();
      expect(loggingService.info).toHaveBeenCalledWith('Permissão para notificações não concedida');
    });

    it('deve lançar erro quando ocorrer uma exceção', async () => {
      const mockError = new Error('Erro de teste');
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(mockError);

      await expect(mobileNotificationService.registerForPushNotifications(userId)).rejects.toThrow(
        mockError
      );
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('unregisterToken', () => {
    it('deve remover o token com sucesso', async () => {
      await mobileNotificationService.unregisterToken(token);

      expect(doc).toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalled();
      expect(loggingService.info).toHaveBeenCalledWith(`Token de notificação removido: ${token}`);
    });

    it('deve lançar erro quando ocorrer uma exceção', async () => {
      const mockError = new Error('Erro de teste');
      (deleteDoc as jest.Mock).mockRejectedValue(mockError);

      await expect(mobileNotificationService.unregisterToken(token)).rejects.toThrow(mockError);
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('sendPushNotification', () => {
    it('deve enviar notificação push com sucesso', async () => {
      const title = 'Título de teste';
      const message = 'Mensagem de teste';
      const data = { orderId: '123' };
      const type = 'orderStatus';

      const result = await mobileNotificationService.sendPushNotification(
        userId,
        title,
        message,
        data,
        type as any
      );

      expect(result).toBe(true);
      expect(mockShouldReceiveNotification).toHaveBeenCalledWith(userId, type);
      expect(global.fetch).toHaveBeenCalledWith('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      });
      expect(loggingService.info).toHaveBeenCalledWith(
        `Notificação push enviada para usuário ${userId}`
      );
    });

    it('deve retornar false quando o usuário optou por não receber notificações', async () => {
      mockShouldReceiveNotification.mockResolvedValue(false);

      const result = await mobileNotificationService.sendPushNotification(
        userId,
        'Título',
        'Mensagem',
        {},
        'promotions' as any
      );

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando a API do Expo retornar erro', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ errors: ['Invalid token'] }),
      });

      await expect(
        mobileNotificationService.sendPushNotification(
          userId,
          'Título',
          'Mensagem',
          {},
          'orderStatus' as any
        )
      ).rejects.toThrow();
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('scheduleLocalNotification', () => {
    it('deve agendar notificação local com sucesso', async () => {
      const notificationId = 'notification-id-123';
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(notificationId);

      const result = await mobileNotificationService.scheduleLocalNotification(
        'Título',
        'Corpo',
        { data: 'test' },
        null
      );

      expect(result).toBe(notificationId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Título',
          body: 'Corpo',
          data: { data: 'test' },
          sound: 'default',
        },
        trigger: null,
      });
      expect(loggingService.info).toHaveBeenCalledWith(
        `Notificação local agendada com ID ${notificationId}`
      );
    });

    it('deve lançar erro quando ocorrer uma exceção', async () => {
      const mockError = new Error('Erro de teste');
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(mockError);

      await expect(
        mobileNotificationService.scheduleLocalNotification('Título', 'Corpo')
      ).rejects.toThrow(mockError);
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('cancelLocalNotification', () => {
    it('deve cancelar notificação local com sucesso', async () => {
      const notificationId = 'notification-id-123';

      await mobileNotificationService.cancelLocalNotification(notificationId);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(notificationId);
      expect(loggingService.info).toHaveBeenCalledWith(
        `Notificação local cancelada: ${notificationId}`
      );
    });
  });

  describe('cancelAllLocalNotifications', () => {
    it('deve cancelar todas as notificações locais com sucesso', async () => {
      await mobileNotificationService.cancelAllLocalNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(loggingService.info).toHaveBeenCalledWith(
        'Todas as notificações locais foram canceladas'
      );
    });
  });

  describe('setupNotificationListener', () => {
    it('deve configurar listener para notificações recebidas', () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );

      const removeListener = mobileNotificationService.setupNotificationListener(mockCallback);

      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledWith(mockCallback);
      removeListener();
      expect(mockSubscription.remove).toHaveBeenCalled();
    });
  });

  describe('setupNotificationResponseListener', () => {
    it('deve configurar listener para respostas de notificações', () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );

      const removeListener =
        mobileNotificationService.setupNotificationResponseListener(mockCallback);

      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(
        mockCallback
      );
      removeListener();
      expect(mockSubscription.remove).toHaveBeenCalled();
    });
  });
});
