import { NotificationSettingsServiceWithCache } from '../NotificationSettingsServiceWithCache';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { loggingService } from '../LoggingService';
import { CacheManager } from '../../utils/cache';

// Mock do Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date().toISOString()),
}));

// Mock do Firebase Config
jest.mock('../../config/firebase', () => ({
  db: {},
}));

// Mock do LoggingService
jest.mock('../LoggingService', () => ({
  loggingService: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock do CacheManager
jest.mock('../../utils/cache', () => ({
  CacheManager: {
    getData: jest.fn(),
    setData: jest.fn(),
    removeData: jest.fn(),
    clearAll: jest.fn(),
  },
}));

describe('NotificationSettingsServiceWithCache', () => {
  let notificationSettingsService: NotificationSettingsServiceWithCache;
  const userId = 'test-user-id';

  beforeEach(() => {
    notificationSettingsService = NotificationSettingsServiceWithCache.getInstance();
    jest.clearAllMocks();
  });

  describe('getUserSettings', () => {
    it('deve retornar as configurações do usuário quando existirem (Firestore)', async () => {
      // Configurar mock
      const mockSettingsData = {
        userId,
        enabled: true,
        types: {
          orderStatus: true,
          promotions: false,
          news: true,
          deliveryUpdates: true,
          paymentUpdates: false,
        },
        frequency: 'immediate',
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '06:00',
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };

      (CacheManager.getData as jest.Mock).mockResolvedValue(null); // Cache miss
      (doc as jest.Mock).mockReturnValue({ id: userId });
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: userId,
        data: () => mockSettingsData,
      });

      // Executar método
      const result = await notificationSettingsService.getUserSettings(userId);

      // Verificar resultado
      expect(result).toEqual({
        id: userId,
        ...mockSettingsData,
      });
      expect(CacheManager.getData).toHaveBeenCalled();
      expect(doc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
      expect(CacheManager.setData).toHaveBeenCalled(); // Should cache after fetch
    });

    it('deve retornar as configurações do usuário quando existirem (Cache)', async () => {
      // Configurar mock
      const mockSettingsData = {
        id: userId,
        userId,
        enabled: true,
        types: {
          orderStatus: true,
          promotions: false,
          news: true,
          deliveryUpdates: true,
          paymentUpdates: false,
        },
        frequency: 'immediate',
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '06:00',
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };

      (CacheManager.getData as jest.Mock).mockResolvedValue(mockSettingsData); // Cache hit

      // Executar método
      const result = await notificationSettingsService.getUserSettings(userId);

      // Verificar resultado
      expect(result).toEqual(mockSettingsData);
      expect(CacheManager.getData).toHaveBeenCalled();
      expect(getDoc).not.toHaveBeenCalled(); // Should NOT hit Firestore
    });

    it('deve retornar null quando as configurações não existirem', async () => {
      // Configurar mock
      (CacheManager.getData as jest.Mock).mockResolvedValue(null);
      (doc as jest.Mock).mockReturnValue({ id: userId });
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      // Executar método
      const result = await notificationSettingsService.getUserSettings(userId);

      // Verificar resultado
      expect(result).toBeNull();
      expect(doc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
    });

    it('deve lançar erro quando ocorrer uma exceção', async () => {
      // Configurar mock
      const mockError = new Error('Erro de teste');
      (CacheManager.getData as jest.Mock).mockResolvedValue(null);
      (doc as jest.Mock).mockReturnValue({ id: userId });
      (getDoc as jest.Mock).mockRejectedValue(mockError);

      // Executar método e verificar erro
      await expect(notificationSettingsService.getUserSettings(userId)).rejects.toThrow(mockError);
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('createDefaultSettings', () => {
    it('deve criar configurações padrão para o usuário', async () => {
      // Configurar mock
      (doc as jest.Mock).mockReturnValue({ id: userId });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      // Executar método
      const result = await notificationSettingsService.createDefaultSettings(userId);

      // Verificar resultado
      expect(result).toHaveProperty('id', userId);
      expect(result).toHaveProperty('enabled', true);
      expect(result.types).toEqual({
        orderStatus: true,
        promotions: true,
        news: true,
        deliveryUpdates: true,
        paymentUpdates: true,
      });
      expect(result).toHaveProperty('frequency', 'immediate');
      expect(result.quietHours).toEqual({
        enabled: false,
        start: '22:00',
        end: '08:00',
      });
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(doc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalled();
      expect(CacheManager.setData).toHaveBeenCalled(); // Should cache
      expect(loggingService.info).toHaveBeenCalled();
    });

    it('deve lançar erro quando ocorrer uma exceção', async () => {
      // Configurar mock
      const mockError = new Error('Erro de teste');
      (doc as jest.Mock).mockReturnValue({ id: userId });
      (setDoc as jest.Mock).mockRejectedValue(mockError);

      // Executar método e verificar erro
      await expect(notificationSettingsService.createDefaultSettings(userId)).rejects.toThrow(
        mockError
      );
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('deve atualizar as configurações do usuário', async () => {
      // Configurar mock
      (doc as jest.Mock).mockReturnValue({ id: userId });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      
      // Mock getUserSettings for internal call
      const mockSettingsData = {
        id: userId,
        userId,
        enabled: true,
        types: {
            orderStatus: true,
            promotions: false,
            news: true,
            deliveryUpdates: true,
            paymentUpdates: false,
        },
        frequency: 'immediate',
        quietHours: {
            enabled: true,
            start: '22:00',
            end: '06:00',
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };
      (CacheManager.getData as jest.Mock).mockResolvedValue(mockSettingsData);

      const updates = {
        enabled: false,
        'types.promotions': true,
      };

      // Executar método
      await notificationSettingsService.updateSettings(userId, updates);

      // Verificar resultado
      expect(doc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();
      expect(CacheManager.setData).toHaveBeenCalled(); // Should update cache
      expect(loggingService.info).toHaveBeenCalled();
    });

    it('deve lançar erro quando ocorrer uma exceção', async () => {
      // Configurar mock
      const mockError = new Error('Erro de teste');
      (doc as jest.Mock).mockReturnValue({ id: userId });
      (updateDoc as jest.Mock).mockRejectedValue(mockError);

      const updates = {
        enabled: false,
      };

      // Executar método e verificar erro
      await expect(notificationSettingsService.updateSettings(userId, updates)).rejects.toThrow(
        mockError
      );
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('shouldReceiveNotification', () => {
    it('deve retornar true quando as notificações estiverem habilitadas', async () => {
      // Configurar mock
      const mockSettingsData = {
        id: userId,
        userId,
        enabled: true,
        types: {
          orderStatus: true,
          promotions: false,
          news: true,
          deliveryUpdates: true,
          paymentUpdates: false,
        },
        frequency: 'immediate',
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '06:00',
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };

      (CacheManager.getData as jest.Mock).mockResolvedValue(mockSettingsData);

      // Executar método para um tipo habilitado
      const result = await notificationSettingsService.shouldReceiveNotification(
        userId,
        'orderStatus'
      );

      // Verificar resultado
      expect(result).toBe(true);
    });

    it('deve retornar false quando as notificações estiverem desabilitadas globalmente', async () => {
      // Configurar mock
      const mockSettingsData = {
        id: userId,
        userId,
        enabled: false, // Desabilitado globalmente
        types: {
          orderStatus: true,
          promotions: false,
          news: true,
          deliveryUpdates: true,
          paymentUpdates: false,
        },
        frequency: 'immediate',
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '06:00',
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };

      (CacheManager.getData as jest.Mock).mockResolvedValue(mockSettingsData);

      // Executar método
      const result = await notificationSettingsService.shouldReceiveNotification(
        userId,
        'orderStatus'
      );

      // Verificar resultado
      expect(result).toBe(false);
    });

    it('deve retornar false quando o tipo específico estiver desabilitado', async () => {
      // Configurar mock
      const mockSettingsData = {
        id: userId,
        userId,
        enabled: true,
        types: {
          orderStatus: true,
          promotions: false, // Tipo específico desabilitado
          news: true,
          deliveryUpdates: true,
          paymentUpdates: false,
        },
        frequency: 'immediate',
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '06:00',
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };

      (CacheManager.getData as jest.Mock).mockResolvedValue(mockSettingsData);

      // Executar método para um tipo desabilitado
      const result = await notificationSettingsService.shouldReceiveNotification(
        userId,
        'promotions'
      );

      // Verificar resultado
      expect(result).toBe(false);
    });
  });
});
