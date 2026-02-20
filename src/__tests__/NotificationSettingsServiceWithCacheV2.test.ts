import { NotificationSettingsServiceWithCacheV2 } from '../services/NotificationSettingsServiceWithCacheV2';
import { EnhancedCacheManager } from '../utils/EnhancedCacheManager';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
// Mock explícito do firebase/firestore para este arquivo de teste
jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn(),
  doc: jest.fn((db, collection, id) => ({ db, collection, id })),
}));
import { loggingService } from '../services/LoggingService';
import { NotificationSettings } from '../types/NotificationSettings';

// Ajuste de mocks para EnhancedCacheManager com métodos estáticos
jest.mock('../utils/EnhancedCacheManager', () => ({
  EnhancedCacheManager: {
    getData: jest.fn(),
    setData: jest.fn().mockResolvedValue(undefined),
    removeData: jest.fn().mockResolvedValue(undefined),
    clearAll: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock do LoggingService alinhado ao serviço real
jest.mock('../services/LoggingService', () => ({
  __esModule: true,
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  LoggingService: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  },
  default: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

describe('NotificationSettingsServiceWithCacheV2', () => {
  let service: NotificationSettingsServiceWithCacheV2;

  beforeEach(() => {
    jest.clearAllMocks();
    service = NotificationSettingsServiceWithCacheV2.getInstance();
  });

  test('deve ser uma instância singleton', () => {
    const instance1 = NotificationSettingsServiceWithCacheV2.getInstance();
    const instance2 = NotificationSettingsServiceWithCacheV2.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('deve criar configurações padrão para um novo usuário', async () => {
    const userId = 'user123';

    // Executar criação das configurações padrão
    const settings = await service.createDefaultSettings(userId);

    // Verificações básicas
    expect(settings).toEqual(
      expect.objectContaining({
        userId,
        enabled: true,
        types: expect.any(Object),
        quietHours: expect.objectContaining({ enabled: false }),
        frequency: 'immediate',
      })
    );

    // Verificar se o setDoc e cache foram chamados
    expect(setDoc).toHaveBeenCalled();
    expect(EnhancedCacheManager.setData).toHaveBeenCalledWith(
      `notification_settings_v2_${userId}`,
      expect.objectContaining({ userId }),
      expect.any(Number)
    );
  });

  test('deve obter configurações existentes do Firestore', async () => {
    const userId = 'user123';
    const docData: Omit<NotificationSettings, 'id'> = {
      userId,
      enabled: true,
      types: {
        orderStatus: true,
        promotions: false,
        news: true,
        deliveryUpdates: true,
        paymentUpdates: false,
      },
      frequency: 'daily',
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    // Cache vazio
    (EnhancedCacheManager.getData as jest.Mock).mockResolvedValueOnce(null);

    // Firestore retorna documento existente
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => true, id: userId, data: () => docData });

    const settings = await service.getUserSettings(userId);

    expect(settings).toEqual({ id: userId, ...docData });
    expect(EnhancedCacheManager.setData).toHaveBeenCalledWith(
      `notification_settings_v2_${userId}`,
      expect.objectContaining({ id: userId, userId }),
      expect.any(Number)
    );
  });

  test('deve obter configurações do cache quando disponíveis', async () => {
    const userId = 'user123';
    const cachedSettings: NotificationSettings = {
      id: userId,
      userId,
      enabled: true,
      types: {
        orderStatus: true,
        promotions: true,
        news: true,
        deliveryUpdates: false,
        paymentUpdates: true,
      },
      frequency: 'weekly',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    (EnhancedCacheManager.getData as jest.Mock).mockResolvedValueOnce(cachedSettings);

    const settings = await service.getUserSettings(userId);

    expect(settings).toEqual(cachedSettings);
    expect(getDoc).not.toHaveBeenCalled();
  });

  test('deve atualizar as configurações no Firestore e no cache', async () => {
    const userId = 'user123';
    const baseSettings: NotificationSettings = {
      id: userId,
      userId,
      enabled: true,
      types: {
        orderStatus: true,
        promotions: true,
        news: true,
        deliveryUpdates: true,
        paymentUpdates: true,
      },
      frequency: 'immediate',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    // getUserSettings retorna algo do cache
    (EnhancedCacheManager.getData as jest.Mock).mockResolvedValueOnce(baseSettings);

    const updates: Partial<NotificationSettings> = {
      enabled: false,
      frequency: 'weekly',
    };

    await service.updateSettings(userId, updates);

    // updateDoc chamado com dados + updatedAt
    const firstCall = (updateDoc as jest.Mock).mock.calls[0];
    const updatePayload = firstCall?.[1];
    expect(updatePayload).toEqual(
      expect.objectContaining({
        enabled: false,
        frequency: 'weekly',
        updatedAt: expect.any(String),
      })
    );

    // Cache atualizado
    expect(EnhancedCacheManager.setData).toHaveBeenCalledWith(
      `notification_settings_v2_${userId}`,
      expect.objectContaining({ enabled: false, frequency: 'weekly' }),
      expect.any(Number)
    );
  });

  test('deve alternar um tipo de notificação específico', async () => {
    const userId = 'user123';
    const settings: NotificationSettings = {
      id: userId,
      userId,
      enabled: true,
      types: {
        orderStatus: true,
        promotions: true,
        news: true,
        deliveryUpdates: true,
        paymentUpdates: true,
      },
      frequency: 'immediate',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    (EnhancedCacheManager.getData as jest.Mock).mockResolvedValueOnce(settings);

    await service.toggleNotificationType(userId, 'news');

    // updateDoc deve receber o novo valor para types.news
    const updateCall = (updateDoc as jest.Mock).mock.calls[0];
    const payload = updateCall?.[1];
    expect(payload).toEqual(
      expect.objectContaining({
        'types.news': false,
        updatedAt: expect.any(String),
      })
    );

    // Cache atualizado com o novo valor de news
    expect(EnhancedCacheManager.setData).toHaveBeenCalledWith(
      `notification_settings_v2_${userId}`,
      expect.objectContaining({
        types: expect.objectContaining({ news: false }),
      }),
      expect.any(Number)
    );
  });

  test('deve verificar corretamente se um usuário deve receber notificação', async () => {
    const userId = 'user123';
    const settings: NotificationSettings = {
      id: userId,
      userId,
      enabled: true,
      types: {
        orderStatus: true,
        promotions: true,
        news: true,
        deliveryUpdates: false,
        paymentUpdates: true,
      },
      frequency: 'immediate',
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    (EnhancedCacheManager.getData as jest.Mock).mockResolvedValue(settings);

    // Fora do modo silencioso
    (service as any).isTimeInRange = jest.fn(() => false);
    await expect(service.shouldReceiveNotification(userId, 'news')).resolves.toBe(true);
    await expect(service.shouldReceiveNotification(userId, 'paymentUpdates')).resolves.toBe(true);

    // Dentro do modo silencioso
    (service as any).isTimeInRange = jest.fn(() => true);
    await expect(service.shouldReceiveNotification(userId, 'news')).resolves.toBe(false);
    await expect(service.shouldReceiveNotification(userId, 'paymentUpdates')).resolves.toBe(false);
  });

  test('deve limpar o cache corretamente', async () => {
    const userId = 'user123';

    await service.clearCache(userId);

    expect(EnhancedCacheManager.removeData).toHaveBeenCalledWith(
      `notification_settings_v2_${userId}`
    );
  });
});




