import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import { NotificationSettingsScreenV2 } from '../screens/NotificationSettingsScreenV2';
import { useNotificationSettingsV2 } from '../hooks/useNotificationSettingsV2';

// Mock do hook useNotificationSettingsV2
jest.mock('../hooks/useNotificationSettingsV2', () => ({
  useNotificationSettingsV2: jest.fn(),
}));

// Mock do react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MockIcon');

// Mock do react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock('../components/ProtectedRoute', () => {
  const React = require('react');
  return {
    __esModule: true,
    ProtectedRoute: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

describe('NotificationSettingsScreenV2', () => {
  const mockToggleAllNotifications = jest.fn();
  const mockToggleNotificationType = jest.fn();
  const mockToggleQuietHours = jest.fn();
  const mockUpdateQuietHoursTime = jest.fn();
  const mockUpdateFrequency = jest.fn();
  const mockRefreshSettings = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNotificationSettingsV2 as jest.Mock).mockReturnValue({
      settings: {
        enabled: true,
        types: {
          orderStatus: true,
          promotions: true,
          news: true,
          deliveryUpdates: true,
          paymentUpdates: false,
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '06:00',
        },
        frequency: 'immediate',
      },
      isLoading: false,
      isUpdating: false,
      error: null,
      toggleAllNotifications: mockToggleAllNotifications,
      toggleNotificationType: mockToggleNotificationType,
      toggleQuietHours: mockToggleQuietHours,
      updateQuietHoursTime: mockUpdateQuietHoursTime,
      updateFrequency: mockUpdateFrequency,
      refreshSettings: mockRefreshSettings,
    });
  });

  test('deve renderizar corretamente com as configurações carregadas', () => {
    const { getByTestId } = render(<NotificationSettingsScreenV2 />);

    expect(getByTestId('section-Configurações Gerais')).toBeTruthy();
    expect(getByTestId('section-Tipos de Notificação')).toBeTruthy();
    expect(getByTestId('section-Modo Silencioso')).toBeTruthy();
    expect(getByTestId('section-Frequência de Notificações')).toBeTruthy();

    expect(getByTestId('list-item-Ativar todas as Notificações')).toBeTruthy();
    expect(getByTestId('list-item-Status de Pedidos')).toBeTruthy();
    expect(getByTestId('list-item-Promoções')).toBeTruthy();
    expect(getByTestId('list-item-Novidades')).toBeTruthy();
    expect(getByTestId('list-item-Atualizações de Entrega')).toBeTruthy();
    expect(getByTestId('list-item-Atualizações de Pagamento')).toBeTruthy();
    expect(getByTestId('list-item-Ativar Modo Silencioso')).toBeTruthy();
    expect(getByTestId('list-item-Imediata')).toBeTruthy();
    expect(getByTestId('list-item-Diária')).toBeTruthy();
    expect(getByTestId('list-item-Semanal')).toBeTruthy();
  });

  test('deve mostrar indicador de carregamento quando isLoading é true', () => {
    (useNotificationSettingsV2 as jest.Mock).mockReturnValue({
      settings: {
        enabled: true,
        types: {
          orderStatus: false,
          promotions: false,
          news: false,
          deliveryUpdates: false,
          paymentUpdates: false,
        },
        quietHours: { enabled: false, start: '22:00', end: '06:00' },
        frequency: 'immediate',
      },
      isLoading: true,
      isUpdating: false,
      error: null,
      toggleAllNotifications: jest.fn(),
      toggleNotificationType: jest.fn(),
      toggleQuietHours: jest.fn(),
      updateQuietHoursTime: jest.fn(),
      updateFrequency: jest.fn(),
      refreshSettings: jest.fn(),
    });

    const { getByTestId } = render(<NotificationSettingsScreenV2 />);
    expect(getByTestId('loading')).toBeTruthy();
  });

  test('deve chamar toggleAllNotifications quando o switch é alternado', () => {
    const { getAllByTestId } = render(<NotificationSettingsScreenV2 />);
    const allNotificationsSwitch = getAllByTestId('switch')[0];
    fireEvent(allNotificationsSwitch, 'onValueChange', false);
    expect(mockToggleAllNotifications).toHaveBeenCalled();
  });

  test('deve chamar toggleNotificationType quando um switch de tipo específico é alternado', () => {
    const { getAllByTestId } = render(<NotificationSettingsScreenV2 />);
    const switches = getAllByTestId('switch');
    fireEvent(switches[3], 'onValueChange', false); // Novidades
    expect(mockToggleNotificationType).toHaveBeenCalledWith('news');
  });

  test('deve chamar toggleQuietHours quando o switch de modo silencioso é alternado', () => {
    const { getAllByTestId } = render(<NotificationSettingsScreenV2 />);
    const switches = getAllByTestId('switch');
    const quietHoursSwitchIndex = 6; // Ativar Modo Silencioso
    fireEvent(switches[quietHoursSwitchIndex], 'onValueChange', true);
    expect(mockToggleQuietHours).toHaveBeenCalled();
  });

  test('deve chamar updateFrequency quando um switch de frequência é alternado', () => {
    const { getAllByTestId } = render(<NotificationSettingsScreenV2 />);
    const switches = getAllByTestId('switch');
    const dailyFrequencySwitchIndex = 8; // Diária
    fireEvent(switches[dailyFrequencySwitchIndex], 'onValueChange', true);
    expect(mockUpdateFrequency).toHaveBeenCalledWith('daily');
  });

  test('deve mostrar o modal de seleção de horário quando o horário de início é pressionado', () => {
    (useNotificationSettingsV2 as jest.Mock).mockReturnValue({
      settings: {
        enabled: true,
        types: {
          orderStatus: true,
          promotions: true,
          news: true,
          deliveryUpdates: true,
          paymentUpdates: true,
        },
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '06:00',
        },
        frequency: 'immediate',
      },
      isLoading: false,
      isUpdating: false,
      error: null,
      toggleAllNotifications: jest.fn(),
      toggleNotificationType: jest.fn(),
      toggleQuietHours: jest.fn(),
      updateQuietHoursTime: jest.fn(),
      updateFrequency: jest.fn(),
      refreshSettings: jest.fn(),
    });

    const { getByTestId } = render(<NotificationSettingsScreenV2 />);
    const startTimeItem = getByTestId('list-item-Horário de Início');
    fireEvent.press(startTimeItem);
    expect(getByTestId('modal')).toBeTruthy();
  });

  test('deve chamar refreshSettings quando o botão de atualizar é pressionado', async () => {
    const { getByTestId } = render(<NotificationSettingsScreenV2 />);
    const refreshButton = getByTestId('button');
    await act(async () => {
      fireEvent.press(refreshButton);
    });
    await waitFor(() => {
      expect(mockRefreshSettings).toHaveBeenCalled();
    });
  });
});














