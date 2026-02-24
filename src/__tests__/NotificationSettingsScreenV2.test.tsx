import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationSettingsScreenV2 } from '../screens/NotificationSettingsScreenV2';
import { useNotificationSettingsV2 } from '../hooks/useNotificationSettingsV2';

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
        allNotificationsEnabled: true,
        notificationTypes: {
          news: true,
          delivery: true,
          payment: false,
        },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '06:00',
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
    const { getByText, getByTestId } = render(<NotificationSettingsScreenV2 />);

    // Verificar se os títulos das seções estão presentes
    expect(getByTestId('section-Configurações Gerais')).toBeTruthy();
    expect(getByTestId('section-Tipos de Notificação')).toBeTruthy();
    expect(getByTestId('section-Modo Silencioso')).toBeTruthy();
    expect(getByTestId('section-Frequência de Notificações')).toBeTruthy();

    // Verificar se os itens de configuração estão presentes
    expect(getByTestId('list-item-Todas as Notificações')).toBeTruthy();
    expect(getByTestId('list-item-Notícias e Promoções')).toBeTruthy();
    expect(getByTestId('list-item-Atualizações de Entrega')).toBeTruthy();
    expect(getByTestId('list-item-Atualizações de Pagamento')).toBeTruthy();
    expect(getByTestId('list-item-Ativar Modo Silencioso')).toBeTruthy();
    expect(getByTestId('list-item-Imediata')).toBeTruthy();
    expect(getByTestId('list-item-Diária')).toBeTruthy();
    expect(getByTestId('list-item-Semanal')).toBeTruthy();
  });

  test('deve mostrar indicador de carregamento quando isLoading é true', () => {
    // Configurar o mock do hook para retornar isLoading como true
    (useNotificationSettingsV2 as jest.Mock).mockReturnValue({
      settings: {
        allNotificationsEnabled: true,
        notificationTypes: {},
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

    const { getByTestId } = render(<NotificationSettingsScreenV2 />);

    // Verificar se o indicador de carregamento está presente
    expect(getByTestId('loading')).toBeTruthy();
  });

  test('deve chamar toggleAllNotifications quando o switch é alternado', () => {
    const { getByTestId } = render(<NotificationSettingsScreenV2 />);

    // Encontrar o switch de todas as notificações
    const allNotificationsSwitch = getByTestId('switch');

    // Simular o evento de alternar o switch
    fireEvent(allNotificationsSwitch, 'onValueChange', false);

    // Verificar se a função foi chamada
    expect(mockToggleAllNotifications).toHaveBeenCalled();
  });

  test('deve chamar toggleNotificationType quando um switch de tipo específico é alternado', () => {
    const { getAllByTestId } = render(<NotificationSettingsScreenV2 />);

    // Encontrar todos os switches (o primeiro é para todas as notificações)
    const switches = getAllByTestId('switch');

    // Simular o evento de alternar o switch de notícias (segundo switch)
    fireEvent(switches[1], 'onValueChange', false);

    // Verificar se a função foi chamada com o tipo correto
    expect(mockToggleNotificationType).toHaveBeenCalledWith('news');
  });

  test('deve chamar toggleQuietHours quando o switch de modo silencioso é alternado', () => {
    const { getAllByTestId } = render(<NotificationSettingsScreenV2 />);

    // Encontrar todos os switches
    const switches = getAllByTestId('switch');

    // Simular o evento de alternar o switch de modo silencioso
    // (o índice depende da ordem dos switches na tela)
    const quietHoursSwitchIndex = 4; // Ajuste conforme necessário
    fireEvent(switches[quietHoursSwitchIndex], 'onValueChange', true);

    // Verificar se a função foi chamada
    expect(mockToggleQuietHours).toHaveBeenCalled();
  });

  test('deve chamar updateFrequency quando um switch de frequência é alternado', () => {
    const { getAllByTestId } = render(<NotificationSettingsScreenV2 />);

    // Encontrar todos os switches
    const switches = getAllByTestId('switch');

    // Simular o evento de alternar o switch de frequência diária
    // (o índice depende da ordem dos switches na tela)
    const dailyFrequencySwitchIndex = 6; // Ajuste conforme necessário
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
          startTime: '22:00',
          endTime: '06:00',
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

    const { getByText, getByTestId } = render(<NotificationSettingsScreenV2 />);

    // Encontrar e pressionar o item de horário de início
    const startTimeItem = getByText('Horário de Início: 22:00');
    fireEvent.press(startTimeItem);

    // Verificar se o modal está visível
    expect(getByTestId('modal')).toBeTruthy();
  });

  test('deve chamar refreshSettings quando o botão de atualizar é pressionado', () => {
    const { getAllByTestId } = render(<NotificationSettingsScreenV2 />);

    // Encontrar o botão de atualizar
    const buttons = getAllByTestId('button');
    const refreshButton = buttons.find(
      button => button.props.children === 'Atualizar Configurações'
    );

    // Simular o evento de pressionar o botão
    fireEvent.press(refreshButton);

    // Verificar se a função foi chamada
    expect(mockRefreshSettings).toHaveBeenCalled();
  });
});
