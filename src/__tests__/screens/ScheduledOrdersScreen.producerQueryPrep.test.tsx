/**
 * M050 — Producer query-prep targeted tests (ScheduledOrdersScreen)
 * Cases: SO-01 .. SO-05
 */

import React from 'react';
import { act, fireEvent, render, waitFor, RenderResult } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';

// Local drain of globally mocked scheduler/unstable_mock (jest.setup.ts).
const { unstable_flushAll } = require('scheduler/unstable_mock') as {
  unstable_flushAll: () => void;
};

const AUTH_UID = 'producer-auth-uid-001';
const OTHER_UID = 'other-producer-999';
const TODAY = new Date().toISOString().split('T')[0];

const mockGetProducerOrders = jest.fn();
const mockGetOrders = jest.fn();
const mockGetOrdersByDeliveryDriver = jest.fn();
const mockGetUserOrders = jest.fn();
const mockGetDriverByUserId = jest.fn();

jest.mock('../../services/OrderService', () => ({
  OrderService: {
    getInstance: () => ({
      getProducerOrders: mockGetProducerOrders,
      getOrders: mockGetOrders,
      getOrdersByDeliveryDriver: mockGetOrdersByDeliveryDriver,
      getUserOrders: mockGetUserOrders,
    }),
  },
}));

jest.mock('../../services/DeliveryDriverService', () => ({
  DeliveryDriverService: jest.fn().mockImplementation(() => ({
    getDriverByUserId: mockGetDriverByUserId,
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

jest.mock('react-native-calendars', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    Calendar: () => React.createElement(View, { testID: 'calendar' }, React.createElement(Text, null, 'calendar')),
    LocaleConfig: { locales: {}, defaultLocale: 'pt-br' },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../compat/expoPrint', () => ({
  printAsync: jest.fn(),
  printToFileAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(),
}));

jest.mock('../../components/PrintOrderButton', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { PrintOrderButton: () => React.createElement(View, { testID: 'print-btn' }) };
});

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

jest.mock('../../utils/formatters', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
}));

import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ScheduledOrdersScreen } from '../../screens/ScheduledOrdersScreen';

/** Local harness helper: paper provider + post-await LoadingState settlement. */
function renderScheduledOrdersScreen(): RenderResult {
  return render(
    <PaperProvider>
      <ScheduledOrdersScreen />
    </PaperProvider>
  );
}

async function waitForLoadingSettled(screen: RenderResult): Promise<void> {
  await waitFor(() => {
    act(() => {
      unstable_flushAll();
    });
    expect(screen.queryByTestId('loading-state')).toBeNull();
  });
}

/** Switch calendar → list via existing SegmentedButtons label (no production change). */
function switchToListView(screen: RenderResult): void {
  fireEvent.press(screen.getByText('Lista'));
}

const makeOrder = (
  id: string,
  opts: {
    producerId?: string;
    isScheduledOrder?: boolean;
    date?: string;
  } = {}
) => ({
  id,
  producerId: opts.producerId ?? AUTH_UID,
  status: 'confirmed' as const,
  isScheduledOrder: opts.isScheduledOrder ?? true,
  scheduledDelivery:
    opts.isScheduledOrder === false
      ? undefined
      : {
          date: opts.date ?? TODAY,
          type: 'scheduled' as const,
          timeSlot: '10:00 - 12:00',
        },
  createdAt: new Date('2024-06-01T12:00:00.000Z'),
  totalAmount: 40,
  items: [{ name: 'Torta', quantity: 1, price: 40 }],
  deliveryAddress: {
    street: 'Rua B',
    neighborhood: 'Centro',
    number: '2',
    city: 'Cidade',
    state: 'ST',
    zipCode: '00000-000',
  },
});

describe('ScheduledOrdersScreen — M050 producer query-prep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProducerOrders.mockResolvedValue([]);
    mockGetOrders.mockResolvedValue([]);
    mockGetOrdersByDeliveryDriver.mockResolvedValue([]);
    mockGetUserOrders.mockResolvedValue([]);
    mockGetDriverByUserId.mockResolvedValue({ id: 'driver-1' });
  });

  it('SO-01: isProdutor calls getProducerOrders(userId) and keeps isScheduledOrder filter', async () => {
    mockGetProducerOrders.mockResolvedValue([
      makeOrder('sched-1', { isScheduledOrder: true, date: TODAY }),
      makeOrder('not-sched', { isScheduledOrder: false }),
    ]);

    (useAuth as jest.Mock).mockReturnValue({ user: { id: AUTH_UID, uid: AUTH_UID } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: true,
      isAdmin: false,
      isEntregador: false,
    });

    const screen = renderScheduledOrdersScreen();

    await waitFor(() => {
      expect(mockGetProducerOrders).toHaveBeenCalledWith(AUTH_UID);
    });
    expect(mockGetOrders).not.toHaveBeenCalled();

    await waitForLoadingSettled(screen);
    switchToListView(screen);
    expect(screen.getByText('Pedido #ched-1')).toBeTruthy();
    expect(screen.queryByText('Pedido #-sched')).toBeNull();
  });

  it('SO-02: isAdmin uses getOrders() and keeps isScheduledOrder filter', async () => {
    mockGetOrders.mockResolvedValue([
      makeOrder('admin-sched', { producerId: 'any', isScheduledOrder: true, date: TODAY }),
      makeOrder('admin-not', { producerId: 'any', isScheduledOrder: false }),
    ]);

    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'admin-1', uid: 'admin-1' } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: false,
      isAdmin: true,
      isEntregador: false,
    });

    const screen = renderScheduledOrdersScreen();

    await waitFor(() => {
      expect(mockGetOrders).toHaveBeenCalled();
    });
    expect(mockGetProducerOrders).not.toHaveBeenCalled();

    await waitForLoadingSettled(screen);
    switchToListView(screen);
    expect(screen.getByText('Pedido #-sched')).toBeTruthy();
    expect(screen.queryByText('Pedido #in-not')).toBeNull();
  });

  it('SO-03: courier/buyer preserve getOrdersByDeliveryDriver / getUserOrders paths', async () => {
    mockGetOrdersByDeliveryDriver.mockResolvedValue([
      makeOrder('drv-sched', { isScheduledOrder: true, date: TODAY }),
    ]);

    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'courier-1', uid: 'courier-1' } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: false,
      isAdmin: false,
      isEntregador: true,
    });

    renderScheduledOrdersScreen();

    await waitFor(() => {
      expect(mockGetDriverByUserId).toHaveBeenCalledWith('courier-1');
      expect(mockGetOrdersByDeliveryDriver).toHaveBeenCalledWith('driver-1');
    });
    expect(mockGetProducerOrders).not.toHaveBeenCalled();
    expect(mockGetUserOrders).not.toHaveBeenCalled();

    jest.clearAllMocks();
    mockGetUserOrders.mockResolvedValue([
      makeOrder('buyer-sched', { producerId: 'p1', isScheduledOrder: true, date: TODAY }),
    ]);

    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'buyer-1', uid: 'buyer-1' } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: false,
      isAdmin: false,
      isEntregador: false,
    });

    renderScheduledOrdersScreen();

    await waitFor(() => {
      expect(mockGetUserOrders).toHaveBeenCalledWith('buyer-1');
    });
    expect(mockGetProducerOrders).not.toHaveBeenCalled();
    expect(mockGetOrdersByDeliveryDriver).not.toHaveBeenCalled();
  });

  it('SO-04: no scheduled orders yields empty list/state without unexpected throw', async () => {
    mockGetProducerOrders.mockResolvedValue([]);

    (useAuth as jest.Mock).mockReturnValue({ user: { id: AUTH_UID, uid: AUTH_UID } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: true,
      isAdmin: false,
      isEntregador: false,
    });

    const screen = renderScheduledOrdersScreen();

    await waitFor(() => {
      expect(mockGetProducerOrders).toHaveBeenCalledWith(AUTH_UID);
    });
    await waitForLoadingSettled(screen);
    switchToListView(screen);
    expect(screen.getByText('Nenhum pedido agendado para esta data')).toBeTruthy();
    expect(screen.queryByTestId('error-message')).toBeNull();
  });

  it('SO-05: producer result set has no other-producerId order (scoped service + scheduled filter)', async () => {
    // Service contract: getProducerOrders already scoped; mock returns only AUTH_UID rows.
    mockGetProducerOrders.mockResolvedValue([
      makeOrder('mine-sched', { producerId: AUTH_UID, isScheduledOrder: true, date: TODAY }),
    ]);

    (useAuth as jest.Mock).mockReturnValue({ user: { id: AUTH_UID, uid: AUTH_UID } });
    (usePermissions as jest.Mock).mockReturnValue({
      isProdutor: true,
      isAdmin: false,
      isEntregador: false,
    });

    const screen = renderScheduledOrdersScreen();

    await waitFor(() => {
      expect(mockGetProducerOrders).toHaveBeenCalledWith(AUTH_UID);
    });
    await waitForLoadingSettled(screen);
    switchToListView(screen);
    expect(screen.getByText('Pedido #-sched')).toBeTruthy();
    expect(screen.queryByText(new RegExp(OTHER_UID))).toBeNull();
    expect(screen.queryByText(/#other-/)).toBeNull();
  });
});
