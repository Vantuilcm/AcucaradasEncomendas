import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';

const mockGetIdAsync = jest.fn();
const mockGetOptedInAsync = jest.fn();

jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    User: {
      pushSubscription: {
        getIdAsync: (...args: unknown[]) => mockGetIdAsync(...args),
        getOptedInAsync: (...args: unknown[]) => mockGetOptedInAsync(...args),
      },
    },
  },
}));

jest.mock('../hooks/useNotificationSettings', () => ({
  useNotificationSettings: jest.fn(),
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { Text, Pressable, View } = require('react-native');
  return {
    useTheme: () => ({ colors: { primary: '#9C27B0' } }),
    Switch: ({ value, onValueChange, disabled }: any) => (
      <Pressable
        testID={`switch-${String(value)}`}
        disabled={disabled}
        onPress={() => onValueChange && onValueChange(!value)}
      />
    ),
    Button: ({ onPress, children, testID, disabled }: any) => (
      <Pressable testID={testID || 'button'} disabled={disabled} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    ),
    Divider: () => <View testID="divider" />,
    List: {
      Section: ({ children }: any) => <View>{children}</View>,
      Subheader: ({ children }: any) => <Text>{children}</Text>,
      Item: ({ title, description, right }: any) => (
        <View testID={`list-item-${title}`}>
          <Text>{title}</Text>
          <Text>{description}</Text>
          {right && right()}
        </View>
      ),
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

jest.mock('../components/base/LoadingState', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    LoadingState: ({ message }: any) => <Text>{message}</Text>,
  };
});

jest.mock('../components/ErrorMessage', () => {
  const React = require('react');
  const { Text, Pressable } = require('react-native');
  return {
    ErrorMessage: ({ message, onRetry }: any) => (
      <Pressable onPress={onRetry}>
        <Text>{message}</Text>
      </Pressable>
    ),
  };
});

import { useNotificationSettings } from '../hooks/useNotificationSettings';

const baseSettings = {
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
    end: '08:00',
  },
};

describe('A01_015 NotificationSettingsScreen local push diagnostic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNotificationSettings as jest.Mock).mockReturnValue({
      settings: baseSettings,
      isLoading: false,
      error: null,
      updateSettings: jest.fn(),
      toggleNotificationType: jest.fn(),
      toggleQuietHours: jest.fn(),
      refreshSettings: jest.fn(),
    });
  });

  test('does not read subscription id on initial render', () => {
    render(<NotificationSettingsScreen />);
    expect(mockGetIdAsync).not.toHaveBeenCalled();
    expect(mockGetOptedInAsync).not.toHaveBeenCalled();
  });

  test('preserves existing preference controls', () => {
    const { getByTestId } = render(<NotificationSettingsScreen />);
    expect(getByTestId('list-item-Notificações')).toBeTruthy();
    expect(getByTestId('list-item-Status do Pedido')).toBeTruthy();
    expect(getByTestId('list-item-Ativar Modo Silencioso')).toBeTruthy();
  });

  test('reads subscription only after explicit user action', async () => {
    mockGetIdAsync.mockResolvedValue('sub-owner-exact-001');
    mockGetOptedInAsync.mockResolvedValue(true);

    const { getByTestId, queryByTestId } = render(<NotificationSettingsScreen />);
    expect(queryByTestId('push-diagnostic-result')).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId('consult-push-diagnostic'));
    });

    await waitFor(() => {
      expect(mockGetIdAsync).toHaveBeenCalledTimes(1);
      expect(mockGetOptedInAsync).toHaveBeenCalledTimes(1);
      expect(getByTestId('push-subscription-id').props.children).toBe('sub-owner-exact-001');
      expect(getByTestId('push-opted-in-status').props.children).toBe('Inscrito (opted-in)');
    });
  });

  test('handles null subscription id without crash', async () => {
    mockGetIdAsync.mockResolvedValue(null);
    mockGetOptedInAsync.mockResolvedValue(false);

    const { getByTestId } = render(<NotificationSettingsScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('consult-push-diagnostic'));
    });

    await waitFor(() => {
      expect(getByTestId('push-subscription-id').props.children).toBe(
        'Indisponível neste aparelho'
      );
      expect(getByTestId('push-opted-in-status').props.children).toBe(
        'Não inscrito (opted-out)'
      );
    });
  });

  test('handles SDK error without crash', async () => {
    mockGetIdAsync.mockRejectedValue(new Error('native unavailable'));

    const { getByTestId, queryByTestId } = render(<NotificationSettingsScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('consult-push-diagnostic'));
    });

    await waitFor(() => {
      expect(getByTestId('push-diagnostic-error').props.children).toBe(
        'Não foi possível consultar o diagnóstico local.'
      );
      expect(queryByTestId('push-diagnostic-result')).toBeNull();
    });
  });
});
