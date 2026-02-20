import { renderHook, act } from '@testing-library/react-hooks';

// Mock de react-native apenas para Alert (antes de requerer módulos)
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

// Mocks alinhados com a implementação atual (antes de requerer módulos)
jest.mock('../services/NotificationSettingsServiceWithCacheV2', () => ({
  notificationSettingsServiceWithCacheV2: {
    getUserSettings: jest.fn(),
    createDefaultSettings: jest.fn(),
    updateSettings: jest.fn().mockResolvedValue(undefined),
    toggleNotificationType: jest.fn().mockResolvedValue(undefined),
    toggleQuietHours: jest.fn().mockResolvedValue(undefined),
    updateQuietHoursTime: jest.fn().mockResolvedValue(undefined),
    updateFrequency: jest.fn().mockResolvedValue(undefined),
    clearCache: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/LoggingService', () => ({
  __esModule: true,
  loggingService: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LoggingService: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  },
  default: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

// Requerer módulos após mocks para garantir aplicação correta
const { useNotificationSettingsV2 } = require('../hooks/useNotificationSettingsV2');
const { notificationSettingsServiceWithCacheV2 } = require('../services/NotificationSettingsServiceWithCacheV2');
const { useAuth } = require('../contexts/AuthContext');
const { loggingService } = require('../services/LoggingService');
const { Alert } = require('react-native');

// Helper para flush de microtasks/efeitos
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('useNotificationSettingsV2', () => {
  const defaultSettings = {
    id: 'testUserId',
    userId: 'testUserId',
    enabled: true,
    types: {
      orderStatus: true,
      promotions: true,
      news: true,
      deliveryUpdates: true,
      paymentUpdates: true,
    },
    frequency: 'immediate' as const,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock do usuário autenticado
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'testUserId' } });

    // Mock do serviço para retornar configurações padrão
    (notificationSettingsServiceWithCacheV2.getUserSettings as jest.Mock).mockResolvedValue(
      defaultSettings
    );
  });

  test('deve carregar as configurações de notificação na inicialização', async () => {
    const { result } = renderHook(() => useNotificationSettingsV2());

    expect(result.current.isLoading).toBe(true);

    await act(async () => { await flush(); });

    expect(result.current.isLoading).toBe(false);
    expect(notificationSettingsServiceWithCacheV2.getUserSettings).toHaveBeenCalledWith(
      'testUserId'
    );
    expect(result.current.settings).toEqual(expect.objectContaining({
      enabled: true,
      types: expect.any(Object),
      quietHours: expect.any(Object),
      frequency: 'immediate',
    }));
  });

  test('deve alternar todas as notificações', async () => {
    const { result } = renderHook(() => useNotificationSettingsV2());
    await act(async () => { await flush(); });

    await act(async () => {
      await result.current.toggleAllNotifications(false);
      await flush();
    });

    expect(result.current.settings?.enabled).toBe(false);
    expect(notificationSettingsServiceWithCacheV2.updateSettings).toHaveBeenCalledWith(
      'testUserId',
      { enabled: false }
    );
  });

  test('deve alternar um tipo específico de notificação', async () => {
    const { result } = renderHook(() => useNotificationSettingsV2());
    await act(async () => { await flush(); });

    await act(async () => {
      await result.current.toggleNotificationType('news');
      await flush();
    });

    expect(result.current.settings?.types.news).toBe(false);
    expect(notificationSettingsServiceWithCacheV2.toggleNotificationType).toHaveBeenCalledWith(
      'testUserId',
      'news'
    );
  });

  test('deve alternar o modo silencioso', async () => {
    const { result } = renderHook(() => useNotificationSettingsV2());
    await act(async () => { await flush(); });

    await act(async () => {
      await result.current.toggleQuietHours(true);
      await flush();
    });

    expect(result.current.settings?.quietHours.enabled).toBe(true);
    expect(notificationSettingsServiceWithCacheV2.toggleQuietHours).toHaveBeenCalledWith(
      'testUserId',
      true
    );
  });

  test('deve atualizar o horário do modo silencioso', async () => {
    const { result } = renderHook(() => useNotificationSettingsV2());
    await act(async () => { await flush(); });

    const newStart = '23:00';
    const newEnd = '07:00';

    await act(async () => {
      await result.current.updateQuietHoursTime(newStart, newEnd);
      await flush();
    });

    expect(result.current.settings?.quietHours.start).toBe(newStart);
    expect(result.current.settings?.quietHours.end).toBe(newEnd);
    expect(notificationSettingsServiceWithCacheV2.updateQuietHoursTime).toHaveBeenCalledWith(
      'testUserId',
      newStart,
      newEnd
    );
  });

  test('deve atualizar a frequência de notificações', async () => {
    const { result } = renderHook(() => useNotificationSettingsV2());
    await act(async () => { await flush(); });

    const newFrequency = 'daily' as const;

    await act(async () => {
      await result.current.updateFrequency(newFrequency);
      await flush();
    });

    expect(result.current.settings?.frequency).toBe(newFrequency);
    expect(notificationSettingsServiceWithCacheV2.updateFrequency).toHaveBeenCalledWith(
      'testUserId',
      newFrequency
    );
  });

  test('deve recarregar as configurações quando solicitado', async () => {
    const { result } = renderHook(() => useNotificationSettingsV2());
    await act(async () => { await flush(); });

    (notificationSettingsServiceWithCacheV2.getUserSettings as jest.Mock).mockClear();

    await act(async () => {
      await result.current.refreshSettings();
      await flush();
    });

    expect(notificationSettingsServiceWithCacheV2.clearCache).toHaveBeenCalledWith('testUserId');
    expect(notificationSettingsServiceWithCacheV2.getUserSettings).toHaveBeenCalledWith(
      'testUserId'
    );
  });

  test('deve lidar com erros durante o carregamento', async () => {
    (notificationSettingsServiceWithCacheV2.getUserSettings as jest.Mock).mockRejectedValue(
      new Error('Erro de teste')
    );

    const { result } = renderHook(() => useNotificationSettingsV2());

    await act(async () => { await flush(); });

    expect(result.current.error).toBeTruthy();
    expect(loggingService.error).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  test('deve reverter estado em caso de erro ao alternar tipo de notificação', async () => {
    const { result } = renderHook(() => useNotificationSettingsV2());
    await act(async () => { await flush(); });

    const initialSettings = { ...(result.current.settings as any) };

    (notificationSettingsServiceWithCacheV2.toggleNotificationType as jest.Mock).mockRejectedValue(
      new Error('Erro de atualização')
    );

    await act(async () => {
      await result.current.toggleNotificationType('news');
      await flush();
    });

    expect(result.current.settings?.types.news).toBe(initialSettings.types.news);
    expect(loggingService.error).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });
});
