import { renderHook, act } from '@testing-library/react-hooks';
import { useNotificationSettingsV2 } from '../hooks/useNotificationSettingsV2';
import { NotificationSettingsServiceWithCacheV2 } from '../services/NotificationSettingsServiceWithCacheV2';
import { AuthContext } from '../contexts/AuthContext';
import React from 'react';
import { loggingService } from '../services/loggingService';
import { ToastAndroid } from 'react-native';

// Mock do NotificationSettingsServiceWithCacheV2
jest.mock('../services/NotificationSettingsServiceWithCacheV2', () => ({
  getInstance: jest.fn().mockReturnValue({
    getUserSettings: jest.fn(),
    updateSettings: jest.fn().mockResolvedValue({}),
    toggleNotificationType: jest.fn().mockResolvedValue({}),
    toggleQuietHours: jest.fn().mockResolvedValue({}),
    updateQuietHoursTime: jest.fn().mockResolvedValue({}),
    updateFrequency: jest.fn().mockResolvedValue({}),
    clearCache: jest.fn().mockResolvedValue({}),
    shouldReceiveNotification: jest.fn(),
  }),
}));

// Mock do AuthContext
jest.mock('../contexts/AuthContext', () => ({
  AuthContext: {
    Consumer: ({ children }: any) => children({ user: { uid: 'testUserId' } }),
  },
}));

// Mock do loggingService
jest.mock('../services/loggingService', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

// Mock do ToastAndroid
jest.mock('react-native', () => ({
  ToastAndroid: {
    show: jest.fn(),
    SHORT: 'short',
  },
}));

describe('useNotificationSettingsV2', () => {
  let service: any;

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Obter a instância mockada do serviço
    service = NotificationSettingsServiceWithCacheV2.getInstance();

    // Configurar mock do serviço para retornar configurações padrão
    service.getUserSettings.mockResolvedValue({
      userId: 'testUserId',
      allNotificationsEnabled: true,
      notificationTypes: {
        news: true,
        delivery: true,
        payment: true,
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '06:00',
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
        allNotificationsEnabled: true,
        notificationTypes: expect.any(Object),
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
      await result.current.toggleAllNotifications();
    });

    // Verificar se o estado foi atualizado otimisticamente
    expect(result.current.settings.allNotificationsEnabled).toBe(false);

    // Verificar se o serviço foi chamado corretamente
    expect(service.updateSettings).toHaveBeenCalledWith(
      'testUserId',
      expect.objectContaining({
        allNotificationsEnabled: false,
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
    expect(result.current.settings.notificationTypes.news).toBe(false);

    // Verificar se o serviço foi chamado corretamente
    expect(service.toggleNotificationType).toHaveBeenCalledWith(
      'testUserId',
      'news',
      true // valor anterior
    );
  });

  test('deve alternar o modo silencioso', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotificationSettingsV2());

    // Aguardar o carregamento inicial
    await waitForNextUpdate();

    // Alternar modo silencioso para ativado
    await act(async () => {
      await result.current.toggleQuietHours();
    });

    // Verificar se o estado foi atualizado otimisticamente
    expect(result.current.settings.quietHours.enabled).toBe(true);

    // Verificar se o serviço foi chamado corretamente
    expect(service.toggleQuietHours).toHaveBeenCalledWith(
      'testUserId',
      false // valor anterior
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
    expect(result.current.settings.quietHours.startTime).toBe(newStartTime);
    expect(result.current.settings.quietHours.endTime).toBe(newEndTime);

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
    expect(result.current.settings.frequency).toBe(newFrequency);

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
    expect(loggingService.logError).toHaveBeenCalled();
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
    expect(result.current.settings.notificationTypes.news).toBe(
      initialSettings.notificationTypes.news
    );

    // Verificar se o erro foi registrado
    expect(loggingService.logError).toHaveBeenCalled();

    // Verificar se uma mensagem de erro foi exibida
    expect(ToastAndroid.show).toHaveBeenCalled();
  });
});
