import { NotificationSettingsServiceWithCacheV2 } from '../services/NotificationSettingsServiceWithCacheV2';
import { EnhancedCacheManager } from '../utils/EnhancedCacheManager';
import { firestore } from '../firebase/config';
import { loggingService } from '../services/loggingService';

// Mock do Firestore
jest.mock('../firebase/config', () => ({
  firestore: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn().mockResolvedValue({}),
    get: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
}));

// Mock do EnhancedCacheManager
jest.mock('../utils/EnhancedCacheManager', () => ({
  getInstance: jest.fn().mockReturnValue({
    getData: jest.fn(),
    setData: jest.fn().mockResolvedValue({}),
    removeData: jest.fn().mockResolvedValue({}),
    clearAll: jest.fn().mockResolvedValue({}),
  }),
}));

// Mock do loggingService
jest.mock('../services/loggingService', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe('NotificationSettingsServiceWithCacheV2', () => {
  let service: NotificationSettingsServiceWithCacheV2;
  let cacheManager: any;

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Obter a instância do serviço
    service = NotificationSettingsServiceWithCacheV2.getInstance();

    // Obter a instância mockada do cache manager
    cacheManager = EnhancedCacheManager.getInstance();
  });

  test('deve ser uma instância singleton', () => {
    const instance1 = NotificationSettingsServiceWithCacheV2.getInstance();
    const instance2 = NotificationSettingsServiceWithCacheV2.getInstance();

    expect(instance1).toBe(instance2);
  });

  test('deve criar configurações padrão para um novo usuário', async () => {
    const userId = 'user123';

    // Configurar mock do Firestore para simular que o documento não existe
    const mockDocSnapshot = { exists: false };
    const mockDocGet = jest.fn().mockResolvedValue(mockDocSnapshot);
    (firestore.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockDocGet,
        set: jest.fn().mockResolvedValue({}),
      }),
    });

    // Configurar mock do cache para retornar null
    cacheManager.getData.mockResolvedValue(null);

    // Chamar o método para obter as configurações
    const settings = await service.getUserSettings(userId);

    // Verificar se as configurações padrão foram criadas
    expect(settings).toEqual(
      expect.objectContaining({
        userId,
        allNotificationsEnabled: true,
        notificationTypes: expect.any(Object),
        quietHours: expect.objectContaining({
          enabled: false,
        }),
        frequency: 'immediate',
      })
    );

    // Verificar se o método set do Firestore foi chamado para salvar as configurações padrão
    expect(firestore.collection).toHaveBeenCalledWith('notificationSettings');
    expect(cacheManager.setData).toHaveBeenCalled();
  });

  test('deve obter configurações existentes do Firestore', async () => {
    const userId = 'user123';
    const mockSettings = {
      userId,
      allNotificationsEnabled: true,
      notificationTypes: {
        news: true,
        delivery: true,
        payment: false,
      },
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
      },
      frequency: 'daily',
    };

    // Configurar mock do Firestore para simular que o documento existe
    const mockDocSnapshot = {
      exists: true,
      data: () => mockSettings,
    };
    const mockDocGet = jest.fn().mockResolvedValue(mockDocSnapshot);
    (firestore.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockDocGet,
      }),
    });

    // Configurar mock do cache para retornar null (forçando busca no Firestore)
    cacheManager.getData.mockResolvedValue(null);

    // Chamar o método para obter as configurações
    const settings = await service.getUserSettings(userId);

    // Verificar se as configurações retornadas são as mesmas do mock
    expect(settings).toEqual(mockSettings);

    // Verificar se o cache foi atualizado
    expect(cacheManager.setData).toHaveBeenCalledWith(
      `notificationSettings_${userId}`,
      mockSettings,
      expect.any(Number)
    );
  });

  test('deve obter configurações do cache quando disponíveis', async () => {
    const userId = 'user123';
    const mockSettings = {
      userId,
      allNotificationsEnabled: true,
      notificationTypes: {
        news: true,
        delivery: true,
        payment: false,
      },
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
      },
      frequency: 'daily',
    };

    // Configurar mock do cache para retornar as configurações
    cacheManager.getData.mockResolvedValue(mockSettings);

    // Chamar o método para obter as configurações
    const settings = await service.getUserSettings(userId);

    // Verificar se as configurações retornadas são as mesmas do mock
    expect(settings).toEqual(mockSettings);

    // Verificar que o Firestore não foi consultado
    expect(firestore.collection).not.toHaveBeenCalled();
  });

  test('deve atualizar as configurações no Firestore e no cache', async () => {
    const userId = 'user123';
    const updatedSettings = {
      userId,
      allNotificationsEnabled: false,
      notificationTypes: {
        news: false,
        delivery: true,
        payment: true,
      },
      quietHours: {
        enabled: true,
        startTime: '23:00',
        endTime: '07:00',
      },
      frequency: 'weekly',
    };

    // Configurar mock do Firestore
    const mockUpdate = jest.fn().mockResolvedValue({});
    (firestore.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        update: mockUpdate,
      }),
    });

    // Chamar o método para atualizar as configurações
    await service.updateSettings(userId, updatedSettings);

    // Verificar se o Firestore foi atualizado
    expect(firestore.collection).toHaveBeenCalledWith('notificationSettings');
    expect(mockUpdate).toHaveBeenCalledWith(updatedSettings);

    // Verificar se o cache foi atualizado
    expect(cacheManager.setData).toHaveBeenCalledWith(
      `notificationSettings_${userId}`,
      updatedSettings,
      expect.any(Number)
    );
  });

  test('deve alternar um tipo de notificação específico', async () => {
    const userId = 'user123';
    const notificationType = 'news';
    const currentValue = true;

    // Configurar mock do Firestore
    const mockUpdate = jest.fn().mockResolvedValue({});
    (firestore.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        update: mockUpdate,
      }),
    });

    // Chamar o método para alternar o tipo de notificação
    await service.toggleNotificationType(userId, notificationType, currentValue);

    // Verificar se o Firestore foi atualizado corretamente
    expect(mockUpdate).toHaveBeenCalledWith({
      [`notificationTypes.${notificationType}`]: !currentValue,
    });

    // Verificar se o cache foi atualizado
    expect(cacheManager.setData).toHaveBeenCalled();
  });

  test('deve verificar corretamente se um usuário deve receber notificação', () => {
    const settings = {
      userId: 'user123',
      allNotificationsEnabled: true,
      notificationTypes: {
        news: true,
        delivery: false,
        payment: true,
      },
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
      },
      frequency: 'immediate',
    };

    // Mock da data atual para simular horário fora do modo silencioso
    const mockDate = new Date('2023-01-01T12:00:00');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    // Verificar tipos de notificação habilitados
    expect(service.shouldReceiveNotification(settings, 'news')).toBe(true);
    expect(service.shouldReceiveNotification(settings, 'payment')).toBe(true);

    // Verificar tipo de notificação desabilitado
    expect(service.shouldReceiveNotification(settings, 'delivery')).toBe(false);

    // Simular horário dentro do modo silencioso
    const silentHourDate = new Date('2023-01-01T23:00:00');
    jest.spyOn(global, 'Date').mockImplementation(() => silentHourDate as any);

    // Verificar que nenhuma notificação deve ser enviada durante o modo silencioso
    expect(service.shouldReceiveNotification(settings, 'news')).toBe(false);
    expect(service.shouldReceiveNotification(settings, 'payment')).toBe(false);

    // Restaurar o mock da data
    jest.restoreAllMocks();
  });

  test('deve limpar o cache corretamente', async () => {
    const userId = 'user123';

    // Chamar o método para limpar o cache
    await service.clearCache(userId);

    // Verificar se o método removeData do cache manager foi chamado com a chave correta
    expect(cacheManager.removeData).toHaveBeenCalledWith(`notificationSettings_${userId}`);
  });
});
