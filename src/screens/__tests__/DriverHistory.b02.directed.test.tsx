/**
 * AE_PRODUCTION_ORIGINAL_B02_DIRECTED_REGRESSION_TESTS_MINIMAL_IMPLEMENTATION_001
 * Directed B02 contracts — local mocks only; no Firestore / Stripe / network.
 *
 * DriverHistoryScreen mixes:
 * - JSX text nodes with literal \\uXXXX sequences (loading/empty)
 * - JS string literals with decoded Unicode (errorMessage)
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, render, waitFor } from '@testing-library/react-native';

const mockGetOrdersForDriverEarnings = jest.fn();
const mockGetUserId = jest.fn();
const mockGetInstance = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/OrderService', () => ({
  OrderService: {
    getInstance: (...args: unknown[]) => mockGetInstance(...args),
  },
}));

jest.mock('../../utils/UserUtils', () => ({
  UserUtils: {
    getUserId: (...args: unknown[]) => mockGetUserId(...args),
  },
}));

jest.mock('../../utils/formatters', () => ({
  formatCurrency: (value: number) => `R$ ${Number(value).toFixed(2)}`,
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, props, children),
  };
});

jest.mock('react-native-paper', () => {
  const ReactLocal = require('react');
  const { Text: RNText, View } = require('react-native');
  return {
    ActivityIndicator: () => ReactLocal.createElement(View, { testID: 'b02-loading' }),
    Text: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(RNText, props, children),
  };
});

import { useAuth } from '../../contexts/AuthContext';
import { DriverHistoryScreen } from '../DriverHistoryScreen';

const mockUseAuth = useAuth as jest.Mock;

/** Stable auth value — new object each render would retrigger useEffect via loadOrders deps. */
const AUTH_USER = Object.freeze({ id: 'driver-uid-001' });
const AUTH_STATE = { user: AUTH_USER };

/**
 * RNTL TextMatch in this install is string | RegExp only (no TextMatchFn).
 * JSX loading/empty nodes keep literal \\uXXXX sequences in the rendered text.
 */
const MATCH_LOADING_TEXT = /Carregando hist/;
const MATCH_EMPTY_TEXT = /Nenhuma corrida conclu/;
/** Error path uses a JS string literal → real Unicode. */
const ERROR_TEXT = 'Não foi possível carregar o histórico de corridas agora.';

function readUtf8(relativeFromScreensTests: string): string {
  return fs.readFileSync(path.join(__dirname, relativeFromScreensTests), 'utf8');
}

describe('B02 profile entry + navigator contracts (static source)', () => {
  it('wires Histórico de Corridas to RootNavigation.navigate(DriverHistory)', () => {
    const source = readUtf8('../EntregadorProfileScreen.tsx');
    expect(source).toContain('title="Histórico de Corridas"');
    expect(source).toContain("RootNavigation.navigate('DriverHistory')");
    expect(source).not.toMatch(/onPress=\{\(\) => navigateTo\('DriverHistory'\)\}/);
  });

  it('preserves B01 Resumo de Ganhos live navigation', () => {
    const source = readUtf8('../EntregadorProfileScreen.tsx');
    expect(source).toContain("RootNavigation.navigate('DriverEarnings')");
  });

  it('registers DriverHistoryScreen on the isEntregador stack before non-driver Placeholder', () => {
    const source = readUtf8('../../navigation/AppNavigator.tsx');
    expect(source).toContain(
      "import { DriverHistoryScreen } from '../screens/DriverHistoryScreen'"
    );
    expect(source).toContain('DriverHistory: undefined');

    const realIdx = source.indexOf('component={DriverHistoryScreen}');
    const placeholderIdx = source.indexOf(
      'name="DriverHistory" component={PlaceholderScreen}'
    );
    expect(realIdx).toBeGreaterThan(-1);
    expect(placeholderIdx).toBeGreaterThan(-1);
    expect(realIdx).toBeLessThan(placeholderIdx);

    const entregadorArmStart = source.indexOf('isEntregador ? (');
    const entregadorArmEnd = source.indexOf(') : (', entregadorArmStart);
    expect(entregadorArmStart).toBeGreaterThan(-1);
    expect(entregadorArmEnd).toBeGreaterThan(entregadorArmStart);
    const entregadorArm = source.slice(entregadorArmStart, entregadorArmEnd);
    expect(entregadorArm).toContain('name="DriverHistory"');
    expect(entregadorArm).toContain('component={DriverHistoryScreen}');
    expect(entregadorArm).toContain("title: 'Histórico de Corridas'");
    expect(entregadorArm).toContain('name="DriverEarnings"');
    expect(entregadorArm).toContain('component={DriverEarningsScreen}');
    expect(entregadorArm).not.toContain(
      'name="DriverHistory" component={PlaceholderScreen}'
    );
  });
});

describe('B02 DriverHistoryScreen mocked behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInstance.mockReturnValue({
      getOrdersForDriverEarnings: mockGetOrdersForDriverEarnings,
    });
    mockUseAuth.mockReturnValue(AUTH_STATE);
    mockGetUserId.mockImplementation(
      (user: { id?: string; uid?: string } | null | undefined) =>
        user?.id || user?.uid || undefined
    );
  });

  it('shows loading state then empty delivered message', async () => {
    let resolveOrders!: (value: unknown[]) => void;
    mockGetOrdersForDriverEarnings.mockImplementation(
      () =>
        new Promise<unknown[]>(resolve => {
          resolveOrders = resolve;
        })
    );

    const screen = render(<DriverHistoryScreen />);
    expect(screen.getByTestId('b02-loading')).toBeTruthy();
    expect(screen.getByText(MATCH_LOADING_TEXT)).toBeTruthy();

    await act(async () => {
      resolveOrders([]);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('b02-loading')).toBeNull();
      expect(screen.getByText(MATCH_EMPTY_TEXT)).toBeTruthy();
    });
    expect(mockGetOrdersForDriverEarnings).toHaveBeenCalledWith('driver-uid-001');
  });

  it('renders delivered orders and hides non-delivered', async () => {
    const orders = [
      {
        id: 'abcdef123456',
        status: 'delivered',
        deliveryFee: 12.5,
        updatedAt: '2026-11-01T12:00:00.000Z',
      },
      {
        id: 'pending999999',
        status: 'out_for_delivery',
        deliveryFee: 9,
        updatedAt: '2026-11-02T12:00:00.000Z',
      },
    ];
    // Same act-bounded resolve as empty-loading test: scheduler/unstable_mock
    // does not commit mockResolvedValue updates without an explicit act().
    let resolveOrders!: (value: unknown[]) => void;
    mockGetOrdersForDriverEarnings.mockImplementation(
      () =>
        new Promise<unknown[]>(resolve => {
          resolveOrders = resolve;
        })
    );

    const screen = render(<DriverHistoryScreen />);
    expect(screen.getByTestId('b02-loading')).toBeTruthy();

    await act(async () => {
      resolveOrders(orders);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('b02-loading')).toBeNull();
      expect(screen.getByText('Pedido #abcdef')).toBeTruthy();
      expect(screen.getByText('R$ 12.50')).toBeTruthy();
    });
    expect(mockGetOrdersForDriverEarnings).toHaveBeenCalledWith('driver-uid-001');
    expect(screen.queryByText('Pedido #pendin')).toBeNull();
  });

  it('shows error when driver id is unavailable', async () => {
    mockGetUserId.mockReturnValue(undefined);
    mockGetOrdersForDriverEarnings.mockResolvedValue([]);

    const screen = render(<DriverHistoryScreen />);
    await waitFor(() => {
      expect(screen.getByText(ERROR_TEXT)).toBeTruthy();
    });
    expect(mockGetOrdersForDriverEarnings).not.toHaveBeenCalled();
  });
});
