import { renderHook, act } from '@testing-library/react-hooks';
import { useNotificationSettingsV2 } from '../hooks/useNotificationSettingsV2';
import { notificationSettingsServiceWithCacheV2 } from '../services/NotificationSettingsServiceWithCacheV2';
import { AuthContext } from '../contexts/AuthContext';
import React from 'react';
import { secureLoggingService } from '../services/SecureLoggingService';
import { Alert } from 'react-native';

// Mock do NotificationSettingsServiceWithCacheV2
jest.mock('../services/NotificationSettingsServiceWithCacheV2', () => {
  const mockService = {
    getUserSettings: jest.fn(),
    updateSettings: jest.fn().mockResolvedValue({}),
    toggleNotificationType: jest.fn().mockResolvedValue({}),
    toggleQuietHours: jest.fn().mockResolvedValue({}),
    updateQuietHoursTime: jest.fn().mockResolvedValue({}),
    updateFrequency: jest.fn().mockResolvedValue({}),
    clearCache: jest.fn().mockResolvedValue({}),
    shouldReceiveNotification: jest.fn(),
    createDefaultSettings: jest.fn().mockResolvedValue({}),
  };

  return {
    NotificationSettingsServiceWithCacheV2: {
      getInstance: jest.fn().mockReturnValue(mockService),
    },
    notificationSettingsServiceWithCacheV2: mockService,
  };
});

// Mock do AuthContext
jest.mock('../contexts/AuthContext', () => ({
  AuthContext: {
    Consumer: ({ children }: any) => children({ user: { uid: 'testUserId' } }),
  },
  useAuth: jest.fn().mockReturnValue({ user: { uid: 'testUserId' } }),
}));

// Mock do SecureLoggingService
jest.mock('../services/SecureLoggingService', () => ({
  secureLoggingService: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock do Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  ToastAndroid: {
    show: jest.fn(),
    SHORT: 'short',
  },
  Platform: {
    OS: 'android',
    select: jest.fn((obj) => obj.android),
  },
}));

describe('useNotificationSettingsV2', () => {
  let service: any;

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Usar a instância mockada diretamente
    service = notificationSettingsServiceWithCacheV2;

    // Configurar mock do serviço para retornar configurações padrão
    service.getUserSettings.mockResolvedValue({
      userId: 'testUserId',
      enabled: true,
      types: {
        news: true,
        deliveryUpdates: true,
        paymentUpdates: true,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '06:00',
      },
      frequency: 'immediate',
    });
  });

  // Wrapper para o AuthContext
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Consumer>{context => children}</AuthContext.Consumer>
  );

  test('deve carregar as configurações de notificação na inicialização', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Inicialmente, isLoading deve ser true
    expect(result.current.isLoading).toBe(true);

    // Aguardar a atualização após o carregamento
    await waitForNextUpdate();

    // Após o carregamento, isLoading deve ser false
    expect(result.current.isLoading).toBe(false);

    // Verificar se as configurações foram carregadas corretamente
    expect(result.current.settings).toEqual(
      expect.objectContaining({
        enabled: true,
        types: expect.any(Object),
        quietHours: expect.any(Object),
        frequency: 'immediate',
      })
    );

    // Verificar se o serviço foi chamado com o ID do usuário correto
    expect(service.getUserSettings).toHaveBeenCalledWith('testUserId');
  });

  test('deve alternar todos os tipos de notificação', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Aguardar o carregamento inicial
    await waitForNextUpdate();

    // Alternar todas as notificações para desativado
    await act(async () => {
      await result.current.toggleAllNotifications(false);
    });

    // Verificar se o estado foi atualizado otimisticamente
    expect(result.current.settings?.enabled).toBe(false);

    // Verificar se o serviço foi chamado corretamente
    expect(service.updateSettings).toHaveBeenCalledWith(
      'testUserId',
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  test('deve alternar um tipo específico de notificação', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Aguardar o carregamento inicial
    await waitForNextUpdate();

    // Alternar notificações de notícias para desativado
    await act(async () => {
      await result.current.toggleNotificationType('news');
    });

    // Verificar se o estado foi atualizado otimisticamente
    expect(result.current.settings?.types.news).toBe(false);

    // Verificar se o serviço foi chamado corretamente
    expect(service.toggleNotificationType).toHaveBeenCalledWith(
      'testUserId',
      'news'
    );
  });

  test('deve alternar o modo silencioso', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Aguardar o carregamento inicial
    await waitForNextUpdate();

    // Alternar modo silencioso para ativado
    await act(async () => {
      await result.current.toggleQuietHours(true);
    });

    // Verificar se o estado foi atualizado otimisticamente
    expect(result.current.settings?.quietHours.enabled).toBe(true);

    // Verificar se o serviço foi chamado corretamente
    expect(service.toggleQuietHours).toHaveBeenCalledWith(
      'testUserId',
      true
    );
  });

  test('deve atualizar o horário do modo silencioso', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Aguardar o carregamento inicial
    await waitForNextUpdate();

    // Atualizar horário do modo silencioso
    const newStartTime = '23:00';
    const newEndTime = '07:00';

    await act(async () => {
      await result.current.updateQuietHoursTime(newStartTime, newEndTime);
    });

    // Verificar se o estado foi atualizado otimisticamente
    expect(result.current.settings?.quietHours.start).toBe(newStartTime);
    expect(result.current.settings?.quietHours.end).toBe(newEndTime);

    // Verificar se o serviço foi chamado corretamente
    expect(service.updateQuietHoursTime).toHaveBeenCalledWith(
      'testUserId',
      newStartTime,
      newEndTime
    );
  });

  test('deve atualizar a frequência de notificações', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Aguardar o carregamento inicial
    await waitForNextUpdate();

    // Atualizar frequência para diária
    const newFrequency = 'daily';

    await act(async () => {
      await result.current.updateFrequency(newFrequency);
    });

    // Verificar se o estado foi atualizado otimisticamente
    expect(result.current.settings?.frequency).toBe(newFrequency);

    // Verificar se o serviço foi chamado corretamente
    expect(service.updateFrequency).toHaveBeenCalledWith('testUserId', newFrequency);
  });

  test('deve recarregar as configurações quando solicitado', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Aguardar o carregamento inicial
    await waitForNextUpdate();

    // Limpar o mock para verificar se será chamado novamente
    service.getUserSettings.mockClear();

    // Recarregar configurações
    await act(async () => {
      await result.current.refreshSettings();
    });

    // Verificar se o serviço foi chamado novamente
    expect(service.getUserSettings).toHaveBeenCalledWith('testUserId');
  });

  test('deve lidar com erros durante o carregamento', async () => {
    // Configurar o serviço para lançar um erro
    service.getUserSettings.mockRejectedValue(new Error('Erro de teste'));

    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Aguardar a atualização após a tentativa de carregamento
    await waitForNextUpdate();

    // Verificar se o estado de erro foi atualizado
    expect(result.current.error).toBeTruthy();

    // Verificar se o erro foi registrado
    expect(secureLoggingService.error).toHaveBeenCalled();
  });

  test('deve reverter para o estado anterior em caso de erro ao atualizar', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Aguardar o carregamento inicial
    await waitForNextUpdate();

    // Salvar o estado inicial
    const initialSettings = { ...result.current.settings };

    // Configurar o serviço para lançar um erro ao atualizar
    service.toggleNotificationType.mockRejectedValue(new Error('Erro de atualização'));

    // Tentar alternar um tipo de notificação
    await act(async () => {
      await result.current.toggleNotificationType('news');
    });

    // Verificar se o estado foi revertido para o valor inicial
    // Como o hook recarrega as configurações em caso de erro, e o mock getUserSettings retorna o valor original,
    // o estado deve voltar ao original.
    expect(result.current.settings?.types.news).toBe(
      initialSettings.types?.news
    );

    // Verificar se o erro foi registrado
    expect(secureLoggingService.error).toHaveBeenCalled();

    // Verificar se uma mensagem de erro foi exibida
    expect(Alert.alert).toHaveBeenCalled();
  });
});
