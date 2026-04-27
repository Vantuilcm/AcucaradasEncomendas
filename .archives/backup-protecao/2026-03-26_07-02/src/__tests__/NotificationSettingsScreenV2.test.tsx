import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NotificationSettingsScreenV2 } from '../screens/NotificationSettingsScreenV2';
import { useNotificationSettingsV2 } from '../hooks/useNotificationSettingsV2';

// Helper para renderizar com o ThemeProvider mockado
const MockThemeProvider = ({ children }) => <>{children}</>;
const renderWithTheme = (component) => {
  return render(<MockThemeProvider>{component}</MockThemeProvider>);
};

// Mock do hook useNotificationSettingsV2
jest.mock('../hooks/useNotificationSettingsV2', () => ({
  useNotificationSettingsV2: jest.fn(),
}));

// Mock do react-native-paper
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    Switch: ({ value, onValueChange }) => (
      <mock-switch testID="switch" value={value} onValueChange={onValueChange} />
    ),
    Button: ({ onPress, children }) => (
      <mock-button testID="button" onPress={onPress}>
        {children}
      </mock-button>
    ),
    ActivityIndicator: () => <mock-activity-indicator testID="loading" />,
    List: {
      Item: ({ title, description, right }) => (
        <mock-list-item testID={`list-item-${title}`} title={title} description={description}>
          {right && right()}
        </mock-list-item>
      ),
      Section: ({ title, children }) => (
        <mock-list-section testID={`section-${title}`} title={title}>
          {children}
        </mock-list-section>
      ),
    },
    Modal: ({ visible, onDismiss, children }) => (
      <mock-modal testID="modal" visible={visible} onDismiss={onDismiss}>
        {children}
      </mock-modal>
    ),
    Portal: ({ children }) => <mock-portal>{children}</mock-portal>,
  };
});

// Mock do react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MockIcon');

// Mock do react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

// Mock do ThemeProvider
jest.mock('../components/ThemeProvider', () => {
  const React = require('react');
  return {
    ThemeProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    useAppTheme: () => ({
      theme: {
        colors: {
          primary: '#FF4FD8',
          background: '#FFFFFF',
          text: { primary: '#000000', secondary: '#666666' },
          card: '#F0F0F0',
          error: '#FF0000',
          surface: '#FFFFFF',
          notification: '#FF3D9A',
        },
        spacing: { md: 16 },
      },
      isDark: false,
      mode: 'light',
      setMode: jest.fn(),
      toggleTheme: jest.fn(),
    }),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock reactNativePaperDates
jest.mock('../compat/reactNativePaperDates', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    TimePickerModal: ({ visible }) => visible ? <View testID="modal" /> : null,
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    List: {
      Section: ({ children }) => <View>{children}</View>,
      Subheader: ({ children }) => <Text>{children}</Text>,
      Item: ({ title, description, right, onPress }) => (
        <TouchableOpacity onPress={onPress} testID="list-item">
          <Text>{title}</Text>
          {description && <Text>{description}</Text>}
          {right && right({})}
        </TouchableOpacity>
      ),
      Accordion: ({ title, children }) => <View><Text>{title}</Text>{children}</View>,
    },
    Switch: (props) => (
      <View testID="switch" {...props} />
    ),
    Text: ({ children }) => <Text>{children}</Text>,
    Divider: () => <View />,
    Button: ({ children, onPress }) => (
      <TouchableOpacity onPress={onPress} testID="button">
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    ActivityIndicator: () => <View testID="loading" />,
    useTheme: () => ({ colors: {} }),
  };
});

describe('NotificationSettingsScreenV2', () => {
  // Configuração padrão do mock do hook
  const mockToggleAllNotifications = jest.fn();
  const mockToggleNotificationType = jest.fn();
  const mockToggleQuietHours = jest.fn();
  const mockUpdateQuietHoursTime = jest.fn();
  const mockUpdateFrequency = jest.fn();
  const mockRefreshSettings = jest.fn();

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Configurar o mock do hook useNotificationSettingsV2
    (useNotificationSettingsV2 as jest.Mock).mockReturnValue({
      settings: {
        enabled: true,
        types: {
          orderStatus: true,
          promotions: false,
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
    const { getByText } = renderWithTheme(<NotificationSettingsScreenV2 />);

    // Verificar se os títulos das seções estão presentes
    expect(getByText('Configurações Gerais')).toBeTruthy();
    expect(getByText('Tipos de Notificação')).toBeTruthy();
    expect(getByText('Modo Silencioso')).toBeTruthy();
    expect(getByText('Frequência de Notificações')).toBeTruthy();

    // Verificar se os itens de configuração estão presentes
    expect(getByText('Ativar todas as notificações')).toBeTruthy();
    expect(getByText('Status de Pedidos')).toBeTruthy();
    expect(getByText('Promoções')).toBeTruthy();
    expect(getByText('Novidades')).toBeTruthy();
    expect(getByText('Atualizações de Entrega')).toBeTruthy();
    expect(getByText('Atualizações de Pagamento')).toBeTruthy();
    expect(getByText('Ativar Modo Silencioso')).toBeTruthy();
    expect(getByText('Imediata')).toBeTruthy();
    expect(getByText('Diária')).toBeTruthy();
    expect(getByText('Semanal')).toBeTruthy();
  });

  test('deve mostrar indicador de carregamento quando isLoading é true', () => {
    // Configurar o mock do hook para retornar isLoading como true
    (useNotificationSettingsV2 as jest.Mock).mockReturnValue({
      settings: {
        enabled: true,
        types: {},
        quietHours: { enabled: false },
        frequency: 'immediate',
      },
      isLoading: true,
      error: null,
      toggleAllNotifications: jest.fn(),
      toggleNotificationType: jest.fn(),
      toggleQuietHours: jest.fn(),
      updateQuietHoursTime: jest.fn(),
      updateFrequency: jest.fn(),
      refreshSettings: jest.fn(),
    });

    const { getByTestId } = renderWithTheme(<NotificationSettingsScreenV2 />);

    // Verificar se o indicador de carregamento está presente
    expect(getByTestId('loading')).toBeTruthy();
  });

  test('deve chamar toggleAllNotifications quando o switch é alternado', () => {
    const { getAllByTestId } = renderWithTheme(<NotificationSettingsScreenV2 />);

    // Encontrar o switch de todas as notificações (primeiro switch)
    const allNotificationsSwitch = getAllByTestId('switch')[0];

    // Simular o evento de alternar o switch
    fireEvent(allNotificationsSwitch, 'onValueChange', false);

    // Verificar se a função foi chamada
    expect(mockToggleAllNotifications).toHaveBeenCalled();
  });

  test('deve chamar toggleNotificationType quando um switch de tipo específico é alternado', () => {
    const { getAllByTestId } = renderWithTheme(<NotificationSettingsScreenV2 />);

    // Encontrar todos os switches
    const switches = getAllByTestId('switch');

    // Simular o evento de alternar o switch de Status de Pedidos (segundo switch, índice 1)
    fireEvent(switches[1], 'onValueChange', false);

    // Verificar se a função foi chamada com o tipo correto
    expect(mockToggleNotificationType).toHaveBeenCalledWith('orderStatus');
  });

  test('deve chamar toggleQuietHours quando o switch de modo silencioso é alternado', () => {
    const { getAllByTestId } = renderWithTheme(<NotificationSettingsScreenV2 />);

    // Encontrar todos os switches
    const switches = getAllByTestId('switch');

    // Simular o evento de alternar o switch de modo silencioso (índice 6)
    // 0: All, 1: Order, 2: Promo, 3: News, 4: Delivery, 5: Payment, 6: Quiet
    const quietHoursSwitchIndex = 6;
    fireEvent(switches[quietHoursSwitchIndex], 'onValueChange', true);

    // Verificar se a função foi chamada
    expect(mockToggleQuietHours).toHaveBeenCalled();
  });

  test('deve chamar updateFrequency quando um switch de frequência é alternado', () => {
    const { getAllByTestId } = renderWithTheme(<NotificationSettingsScreenV2 />);

    // Encontrar todos os switches
    const switches = getAllByTestId('switch');

    // Simular o evento de alternar o switch de frequência diária (índice 8)
    // 6: Quiet, 7: Immediate, 8: Daily
    const dailyFrequencySwitchIndex = 8;
    fireEvent(switches[dailyFrequencySwitchIndex], 'onValueChange', true);

    // Verificar se a função foi chamada com a frequência correta
    expect(mockUpdateFrequency).toHaveBeenCalledWith('daily');
  });

  test('deve mostrar o modal de seleção de horário quando o horário de início é pressionado', () => {
    // Configurar o mock do hook para retornar modo silencioso ativado
    (useNotificationSettingsV2 as jest.Mock).mockReturnValue({
      settings: {
        allNotificationsEnabled: true,
        notificationTypes: {},
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '06:00',
        },
        frequency: 'immediate',
      },
      isLoading: false,
      error: null,
      toggleAllNotifications: jest.fn(),
      toggleNotificationType: jest.fn(),
      toggleQuietHours: jest.fn(),
      updateQuietHoursTime: jest.fn(),
      updateFrequency: jest.fn(),
      refreshSettings: jest.fn(),
    });

    const { getByText, getByTestId } = renderWithTheme(<NotificationSettingsScreenV2 />);

    // Encontrar e pressionar o item de horário de início
    const startTimeItem = getByText('Horário de Início');
    fireEvent.press(startTimeItem);

    // Verificar se o modal está visível
    expect(getByTestId('modal')).toBeTruthy();
  });

  test('deve chamar refreshSettings quando o botão de atualizar é pressionado', async () => {
    const { getByText } = renderWithTheme(<NotificationSettingsScreenV2 />);

    // Encontrar o botão de atualizar
    const refreshButton = getByText('Atualizar Configurações');

    // Simular o evento de pressionar o botão
    await act(async () => {
      fireEvent.press(refreshButton);
    });

    // Verificar se a função foi chamada
    expect(mockRefreshSettings).toHaveBeenCalled();
  });
});
