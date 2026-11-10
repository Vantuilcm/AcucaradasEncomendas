import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EntregadorProfileScreen } from '../screens/EntregadorProfileScreen';

const mockNavigate = jest.fn();

jest.mock('../services/RootNavigation', () => ({
  navigate: (...args: unknown[]) => mockNavigate(...args),
  goBack: jest.fn(),
  navigationRef: { isReady: () => true },
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { nome: 'Entregador Teste', email: 'courier@test.local' },
    logout: jest.fn(),
  }),
}));

jest.mock('../utils/AppVersion', () => ({
  AppVersion: {
    getDisplayString: () => '1.1.8 (1310)',
  },
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { Text, Pressable, View } = require('react-native');
  return {
    Avatar: { Icon: () => <View testID="avatar" /> },
    Title: ({ children }: any) => <Text>{children}</Text>,
    Caption: ({ children }: any) => <Text>{children}</Text>,
    Text: ({ children }: any) => <Text>{children}</Text>,
    Button: ({ onPress, children }: any) => (
      <Pressable testID="logout-button" onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    ),
    Divider: () => <View testID="divider" />,
    List: {
      Section: ({ children }: any) => <View>{children}</View>,
      Item: ({ title, onPress, testID }: any) => (
        <Pressable testID={testID || `menu-${title}`} onPress={onPress}>
          <Text>{title}</Text>
        </Pressable>
      ),
      Icon: () => <View />,
    },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    User: {
      pushSubscription: {
        getIdAsync: jest.fn(),
        getOptedInAsync: jest.fn(),
      },
    },
  },
}));

describe('A01_017 EntregadorProfileScreen NotificationSettings access', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('shows Configurações de Notificação menu item', () => {
    const { getByText } = render(<EntregadorProfileScreen />);
    expect(getByText('Configurações de Notificação')).toBeTruthy();
  });

  test('navigates to NotificationSettings without OneSignal diagnostic call', () => {
    const onesignal = require('react-native-onesignal');
    const { getByTestId } = render(<EntregadorProfileScreen />);
    fireEvent.press(getByTestId('entregador-notification-settings'));
    expect(mockNavigate).toHaveBeenCalledWith('NotificationSettings');
    expect(onesignal.OneSignal.User.pushSubscription.getIdAsync).not.toHaveBeenCalled();
  });

  test('preserves Meu Veículo navigation to DriverVehicle', () => {
    const { getByTestId } = render(<EntregadorProfileScreen />);
    fireEvent.press(getByTestId('menu-Meu Veículo'));
    expect(mockNavigate).toHaveBeenCalledWith('DriverVehicle');
  });

  test('preserves Resumo de Ganhos navigation to DriverEarnings', () => {
    const { getByTestId } = render(<EntregadorProfileScreen />);
    fireEvent.press(getByTestId('menu-Resumo de Ganhos'));
    expect(mockNavigate).toHaveBeenCalledWith('DriverEarnings');
  });

  test('does not navigate to ContaBancaria when opening notification settings', () => {
    const { getByTestId } = render(<EntregadorProfileScreen />);
    fireEvent.press(getByTestId('entregador-notification-settings'));
    expect(mockNavigate).not.toHaveBeenCalledWith('ContaBancaria');
  });
});
