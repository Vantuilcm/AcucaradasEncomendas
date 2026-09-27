/**
 * M050 — Producer query-prep targeted tests (OrderManagementScreen)
 * Cases: OM-01 .. OM-04
 */

import React from 'react';
import { act, render, waitFor, RenderResult } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';

// Local drain of globally mocked scheduler/unstable_mock (jest.setup.ts).
const { unstable_flushAll } = require('scheduler/unstable_mock') as {
  unstable_flushAll: () => void;
};

const AUTH_UID = 'producer-auth-uid-001';

const mockGetProducerOrders = jest.fn();
const mockGetOrders = jest.fn();

jest.mock('../../services/OrderService', () => ({
  OrderService: {
    getInstance: () => ({
      getProducerOrders: mockGetProducerOrders,
      getOrders: mockGetOrders,
      updateOrderStatus: jest.fn(),
      updateOrder: jest.fn(),
    }),
  },
}));

jest.mock('../../services/DeliveryDriverService', () => ({
  DeliveryDriverService: jest.fn().mockImplementation(() => ({
    getDriverByUserId: jest.fn(),
  })),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../hooks/usePermissions', () => ({
  usePermissions: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('../../components/ThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        primary: '#FF4FD8',
        secondary: '#9C27B0',
        tertiary: '#FFEB3B',
        warning: '#F57C00',
        info: '#2196F3',
        success: '#4CAF50',
        error: '#FF0000',
        outline: '#999999',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onSurface: '#000000',
        text: { primary: '#000000', secondary: '#666666' },
      },
      spacing: { sm: 8, md: 16 },
    },
  }),
}));

jest.mock('../../components/base/LoadingState', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    LoadingState: ({ message }: { message?: string }) =>
      React.createElement(Text, { testID: 'loading-state' }, message || 'loading'),
  };
});

jest.mock('../../components/ErrorMessage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ErrorMessage: ({ message }: { message: string }) =>
      React.createElement(Text, { testID: 'error-message' }, message),
  };
});

jest.mock('crypto-js', () => ({
  SHA256: () => ({ toString: () => 'mock-hash' }),
}));

jest.mock('../../utils/formatters', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
}));

import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { OrderManagementScreen } from '../../screens/OrderManagementScreen';

/** Local harness helper: paper provider + post-await LoadingState settlement. */
function renderOrderManagementScreen(): RenderResult {
  return render(
    <PaperProvider>
      <OrderManagementScreen />
    </PaperProvider>
  );
}

async function waitForLoadingSettled(screen: RenderResult): Promise<void> {
  act(() => {
    unstable_flushAll();
  });
  await waitFor(() => {
    expect(screen.queryByTestId('loading-state')).toBeNull();
  });
}

const baseOrder = (id: string, producerId: string) => ({
  id,
  producerId,
  status: 'pending' as const,
  createdAt: new Date('2024-06-01T12:00:00.000Z'),
  updatedAt: new Date('2024-06-01T12:00:00.000Z'),
  totalAmount: 50,
  paymentMethod: {
    type: 'pix',
    id: '',
  },
  deliveryAddress: {
    street: 'Rua A',
    neighborhood: 'Centro',
    number: '1',
    city: 'Cidade',
    state: 'ST',
    zipCode: '00000-000',
  },
  items: [{ name: 'Bolo', quantity: 1, price: 50 }],
});

describe('OrderManagementScreen — M050 producer query-prep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProducerOrders.mockResolvedValue([]);
    mockGetOrders.mockResolvedValue([]);
  });

  it('OM-01: isProdutor && !isAdmin calls getProducerOrders(userId/AUTH_UID)', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: AUTH_UID, uid: AUTH_UID } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: true,
      isAdmin: false,
      isEntregador: false,
    });

    renderOrderManagementScreen();

    await waitFor(() => {
      expect(mockGetProducerOrders).toHaveBeenCalledWith(AUTH_UID);
    });
    expect(mockGetOrders).not.toHaveBeenCalled();
  });

  it('OM-02: isAdmin uses getOrders() and not getProducerOrders', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'admin-1', uid: 'admin-1' } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: true,
      isAdmin: true,
      isEntregador: false,
    });

    renderOrderManagementScreen();

    await waitFor(() => {
      expect(mockGetOrders).toHaveBeenCalled();
    });
    expect(mockGetProducerOrders).not.toHaveBeenCalled();
  });

  it('OM-03: non-producer/non-admin branch preserves pre-existing getOrders path', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'courier-1', uid: 'courier-1' } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: false,
      isAdmin: false,
      isEntregador: true,
    });

    renderOrderManagementScreen();

    await waitFor(() => {
      expect(mockGetOrders).toHaveBeenCalled();
    });
    expect(mockGetProducerOrders).not.toHaveBeenCalled();
  });

  it('OM-04: producer branch exposes only AUTH_UID-scoped service dataset', async () => {
    const scoped = [baseOrder('ord-mine', AUTH_UID)];
    mockGetProducerOrders.mockResolvedValue(scoped);

    (useAuth as jest.Mock).mockReturnValue({ user: { id: AUTH_UID, uid: AUTH_UID } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: true,
      isAdmin: false,
      isEntregador: false,
    });

    const screen = renderOrderManagementScreen();

    await waitFor(() => {
      expect(mockGetProducerOrders).toHaveBeenCalledWith(AUTH_UID);
    });
    await waitForLoadingSettled(screen);
    expect(screen.getByText('Pedido #ord-mine')).toBeTruthy();

    expect(screen.queryByText('Pedido #ord-other')).toBeNull();
    expect(scoped.every((o) => o.producerId === AUTH_UID)).toBe(true);
  });
});
