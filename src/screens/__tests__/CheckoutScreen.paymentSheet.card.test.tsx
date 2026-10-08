/**
 * R32_R2 — Active CheckoutScreen CARD PaymentSheet characterization matrix.
 *
 * Exercises the REAL CheckoutScreen (not mocked).
 * All Stripe / Firebase Functions / Firestore / OrderService side effects are mocked.
 *
 * CURRENT RISK tests (TEST_G / TEST_H) document proven R32_R1 unsafe retry/re-entry
 * semantics (new order identity per submission). A later R32_R3 client idempotency
 * mission is expected to update or remove those characterization assertions.
 *
 * This suite does NOT enable or exercise PIX.
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockClearCart = jest.fn().mockResolvedValue(undefined);
const mockInitPaymentSheet = jest.fn();
const mockPresentPaymentSheet = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockCreateStripeCustomer = jest.fn();
const mockCreateOrder = jest.fn();
const mockUpdateOrderStatus = jest.fn();
const mockGetOrderById = jest.fn();
const mockConsultarProduto = jest.fn();
const mockAtualizarProduto = jest.fn();
const mockLogAutomationEvent = jest.fn().mockResolvedValue(undefined);
const mockCreateNotification = jest.fn().mockResolvedValue(undefined);

let onSnapshotSuccess: ((snap: any) => void) | null = null;
let onSnapshotError: ((err: any) => void) | null = null;

jest.mock('../../config/env', () => ({
  ENV: {
    EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS: 'true',
    EXPO_PUBLIC_API_URL: 'https://example.test',
    EXPO_PUBLIC_PROJECT_ID: 'test-project',
    EXPO_PUBLIC_APP_NAME: 'test',
    EXPO_PUBLIC_FIREBASE_API_KEY: 'test-key',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1',
    EXPO_PUBLIC_FIREBASE_APP_ID: '1:1:web:1',
    EXPO_PUBLIC_ONESIGNAL_APP_ID: 'onesignal-test',
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
  },
}));

jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: (...args: any[]) => mockInitPaymentSheet(...args),
    presentPaymentSheet: (...args: any[]) => mockPresentPaymentSheet(...args),
  }),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ name: 'mock-functions' })),
  httpsCallable: jest.fn((_functions: any, name: string) => {
    if (name === 'createPaymentIntent') {
      return (...args: any[]) => mockCreatePaymentIntent(...args);
    }
    if (name === 'createStripeCustomer') {
      return (...args: any[]) => mockCreateStripeCustomer(...args);
    }
    return jest.fn();
  }),
}));

jest.mock('../../config/firebase', () => ({
  getApp: jest.fn(() => ({ name: 'mock-app' })),
  getDb: jest.fn(() => ({ name: 'mock-db' })),
  f: {
    doc: jest.fn((...segments: string[]) => ({
      path: segments.join('/'),
      id: segments[segments.length - 1],
    })),
    onSnapshot: jest.fn((_ref: any, onNext: any, onError?: any) => {
      onSnapshotSuccess = onNext;
      onSnapshotError = onError || null;
      return jest.fn();
    }),
  },
}));

jest.mock('../../utils/firestoreDebug', () => ({
  showFirestoreDebug: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({
    params: {
      scheduledDelivery: {
        type: 'scheduled',
        date: '2030-01-15',
        timeSlot: '09:00 - 11:00',
      },
    },
  }),
}));

jest.mock('../../contexts/CartContext', () => ({
  useCart: () => ({
    cart: {
      items: [
        {
          id: 'cart-1',
          productId: 'prod-1',
          producerId: 'producer-a',
          name: 'Bolo',
          price: 10,
          quantity: 1,
          image: '',
        },
      ],
      lastUpdated: new Date().toISOString(),
    },
    cartTotal: 10,
    clearCart: mockClearCart,
    isLoading: false,
    itemCount: 1,
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      uid: 'user-1',
      email: 'buyer@example.com',
      displayName: 'Buyer Test',
    },
  }),
}));

jest.mock('../../services/OrderService', () => ({
  OrderService: {
    getInstance: () => ({
      createOrder: (...args: any[]) => mockCreateOrder(...args),
      updateOrderStatus: (...args: any[]) => mockUpdateOrderStatus(...args),
      getOrderById: (...args: any[]) => mockGetOrderById(...args),
    }),
  },
}));

jest.mock('../../services/PaymentService', () => ({
  PaymentService: {
    getInstance: () => ({
      processCreditCardPayment: jest.fn(),
    }),
  },
}));

jest.mock('../../services/ProductService', () => ({
  ProductService: {
    getInstance: () => ({
      consultarProduto: (...args: any[]) => mockConsultarProduto(...args),
      atualizarProduto: (...args: any[]) => mockAtualizarProduto(...args),
    }),
  },
}));

jest.mock('../../services/StoreService', () => ({
  StoreService: jest.fn().mockImplementation(() => ({
    getStoreByProducerId: jest.fn().mockResolvedValue(null),
    getDefaultStore: jest.fn().mockResolvedValue(null),
  })),
}));

jest.mock('../../services/StoreAvailabilityService', () => ({
  StoreAvailabilityService: {
    validateOrderTiming: jest.fn(() => ({ isValid: true })),
  },
}));

jest.mock('../../services/DeliveryPricingService', () => ({
  DeliveryPricingService: {
    calculatePricingByZipCode: jest.fn().mockResolvedValue({
      distanceKm: 1,
      deliveryFee: 5,
      withinRange: true,
    }),
  },
}));

jest.mock('../../services/validationService', () => ({
  ValidationService: {
    getInstance: () => ({
      validateAddress: jest.fn(() => true),
      formatZipCode: (v: string) => v,
    }),
  },
}));

jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    getInstance: () => ({
      createNotification: (...args: any[]) => mockCreateNotification(...args),
    }),
  },
}));

jest.mock('../../services/SalesAutomationService', () => ({
  SalesAutomationService: {
    getInstance: () => ({
      logAutomationEvent: (...args: any[]) => mockLogAutomationEvent(...args),
    }),
  },
}));

jest.mock('../../services/LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../components/PaymentSummary', () => ({
  PaymentSummary: () => null,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { TouchableOpacity, Text, View } = require('react-native');
  const Card: any = ({ children }: any) => React.createElement(View, null, children);
  Card.Content = ({ children }: any) => React.createElement(View, null, children);
  Card.Title = ({ title }: any) => React.createElement(Text, null, title);
  return {
    Card,
    Divider: () => null,
    Chip: ({ children }: any) => React.createElement(Text, null, children),
    Button: ({ children, onPress, disabled, loading }: any) => {
      const label = typeof children === 'string' ? children : '';
      const isFinish =
        label === 'Finalizar Pedido' ||
        label === 'Processando...' ||
        label === 'Aguardando confirmação...';
      return React.createElement(
        TouchableOpacity,
        {
          accessibilityRole: 'button',
          accessibilityState: { disabled: !!disabled, busy: !!loading },
          disabled: !!disabled,
          onPress: disabled ? undefined : onPress,
          testID: isFinish ? 'finish-order-button' : undefined,
        },
        React.createElement(Text, null, children)
      );
    },
  };
});

import CheckoutScreen from '../CheckoutScreen';

const scheduledOrderBase = (id: string) => ({
  id,
  status: 'pending',
  totalAmount: 15,
  items: [],
});

async function settleAddressAndPricing() {
  // CheckoutScreen loads a saved address via setTimeout(500)
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
  });
}

async function pressFinalize(utils: ReturnType<typeof render>) {
  const button = await utils.findByText('Finalizar Pedido');
  await act(async () => {
    fireEvent.press(button);
  });
}

function firePaidSnapshot(orderId = 'order-1') {
  if (!onSnapshotSuccess) {
    throw new Error('onSnapshot success handler was not registered');
  }
  onSnapshotSuccess({
    data: () => ({
      status: 'paid',
      paymentStatus: 'completed',
      id: orderId,
    }),
  });
}

function fireLegacyPaymentFailedStatusSnapshot(orderId = 'order-1') {
  if (!onSnapshotSuccess) {
    throw new Error('onSnapshot success handler was not registered');
  }
  onSnapshotSuccess({
    data: () => ({
      status: 'payment_failed',
      paymentError: 'legacy payment_failed status',
      id: orderId,
    }),
  });
}

function firePaymentStatusFailedPendingSnapshot(orderId = 'order-1') {
  if (!onSnapshotSuccess) {
    throw new Error('onSnapshot success handler was not registered');
  }
  onSnapshotSuccess({
    data: () => ({
      status: 'pending',
      paymentStatus: 'failed',
      paymentError: 'canonical paymentStatus failed',
      id: orderId,
    }),
  });
}

describe('CheckoutScreen — R32_R2 active CARD PaymentSheet matrix', () => {
  beforeAll(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    onSnapshotSuccess = null;
    onSnapshotError = null;
    (Alert.alert as jest.Mock).mockImplementation(() => undefined);

    mockInitPaymentSheet.mockResolvedValue({ error: null });
    mockPresentPaymentSheet.mockResolvedValue({ error: null });
    mockCreateStripeCustomer.mockResolvedValue({ data: { customerId: 'cus_mock' } });
    mockCreatePaymentIntent.mockResolvedValue({
      data: {
        clientSecret: 'pi_mock_secret',
        customer: 'cus_mock',
        ephemeralKey: 'ek_mock',
      },
    });
    mockCreateOrder.mockResolvedValue(scheduledOrderBase('order-1'));
    mockUpdateOrderStatus.mockResolvedValue(undefined);
    mockGetOrderById.mockResolvedValue({
      ...scheduledOrderBase('order-1'),
      status: 'paid',
      paymentStatus: 'completed',
    });
    mockConsultarProduto.mockResolvedValue({
      id: 'prod-1',
      nome: 'Bolo',
      temEstoque: true,
      estoque: 10,
    });
    mockAtualizarProduto.mockResolvedValue({});
  });

  afterEach(() => {
    // Clear any in-flight Checkout webhook wait timer before unmount.
    if (onSnapshotSuccess) {
      try {
        onSnapshotSuccess({
          data: () => ({ status: 'payment_failed', paymentError: 'test-teardown' }),
        });
      } catch {
        // ignore teardown races
      }
    }
    onSnapshotSuccess = null;
    onSnapshotError = null;
    cleanup();
  });

  it('TEST_A: single submit happy path through PaymentSheet to createPaymentIntent', async () => {
    const utils = render(<CheckoutScreen />);
    await settleAddressAndPricing();
    await pressFinalize(utils);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
        amount: 1500,
        currency: 'brl',
        orderId: 'order-1',
      });
      expect(mockInitPaymentSheet).toHaveBeenCalledTimes(1);
      expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1);
    });

    // Success is gated on order snapshot (not PaymentSheet alone)
    expect(mockClearCart).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'OrderCompleted',
      expect.anything()
    );

    await act(async () => {
      firePaidSnapshot('order-1');
    });

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        'OrderCompleted',
        expect.objectContaining({
          order: expect.objectContaining({ id: 'order-1' }),
        })
      );
    });

    // CARD path only — no PIX paymentMethod on callable payload
    expect(mockCreatePaymentIntent.mock.calls[0][0].paymentMethod).toBeUndefined();
  });

  it('TEST_B: webhook/order snapshot gates success after PaymentSheet approval', async () => {
    const utils = render(<CheckoutScreen />);
    await settleAddressAndPricing();
    await pressFinalize(utils);

    await waitFor(() => expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1));

    expect(mockClearCart).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('OrderCompleted', expect.anything());

    await act(async () => {
      firePaidSnapshot('order-1');
    });

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        'OrderCompleted',
        expect.objectContaining({ order: expect.objectContaining({ id: 'order-1' }) })
      );
    });
  });

  it('TEST_C: initPaymentSheet failure cancels order and skips presentPaymentSheet', async () => {
    mockInitPaymentSheet.mockResolvedValue({
      error: { message: 'init failed' },
    });

    const utils = render(<CheckoutScreen />);
    await settleAddressAndPricing();
    await pressFinalize(utils);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
      expect(mockInitPaymentSheet).toHaveBeenCalledTimes(1);
      expect(mockPresentPaymentSheet).not.toHaveBeenCalled();
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'cancelled');
      expect(mockClearCart).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('OrderCompleted', expect.anything());
    });
  });

  it('TEST_D: presentPaymentSheet cancel/error cancels order without completion', async () => {
    mockPresentPaymentSheet.mockResolvedValue({
      error: { message: 'Canceled' },
    });

    const utils = render(<CheckoutScreen />);
    await settleAddressAndPricing();
    await pressFinalize(utils);

    await waitFor(() => {
      expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1);
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'cancelled');
      expect(mockClearCart).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('OrderCompleted', expect.anything());
    });
  });

  it('R32_R3H: paymentStatus failed with pending status takes failure path without TIMEOUT_PENDING', async () => {
    const utils = render(<CheckoutScreen />);
    await settleAddressAndPricing();
    await pressFinalize(utils);

    await waitFor(() => {
      expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1);
      expect(onSnapshotSuccess).not.toBeNull();
    });

    await act(async () => {
      firePaymentStatusFailedPendingSnapshot('order-1');
    });

    await waitFor(() => {
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'cancelled');
      expect(mockClearCart).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('OrderCompleted', expect.anything());
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'MainTabs',
        expect.objectContaining({ screen: 'Orders' })
      );
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    });
  });

  it('R32_R3H: legacy status payment_failed still takes failure path', async () => {
    const utils = render(<CheckoutScreen />);
    await settleAddressAndPricing();
    await pressFinalize(utils);

    await waitFor(() => {
      expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1);
      expect(onSnapshotSuccess).not.toBeNull();
    });

    await act(async () => {
      fireLegacyPaymentFailedStatusSnapshot('order-1');
    });

    await waitFor(() => {
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'cancelled');
      expect(mockClearCart).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('OrderCompleted', expect.anything());
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'MainTabs',
        expect.objectContaining({ screen: 'Orders' })
      );
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    });
  });

  it('TEST_E: fast double submit UI guard keeps a single in-flight createOrder', async () => {
    let resolvePresent: ((value: any) => void) | null = null;
    mockPresentPaymentSheet.mockImplementation(
      () =>
        new Promise(resolve => {
          resolvePresent = resolve;
        })
    );

    const utils = render(<CheckoutScreen />);
    await settleAddressAndPricing();

    const button = await utils.findByTestId('finish-order-button');
    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => expect(mockCreateOrder).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    // Second press while disabled/loading must not start another order
    await act(async () => {
      fireEvent.press(button);
    });
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);

    // presentPaymentSheet is still in-flight — onSnapshot registers only after it resolves
    await act(async () => {
      resolvePresent?.({ error: null });
    });

    await waitFor(() => {
      expect(onSnapshotSuccess).not.toBeNull();
    });

    await act(async () => {
      firePaidSnapshot('order-1');
    });

    await waitFor(() => expect(mockClearCart).toHaveBeenCalledTimes(1));
  });

  it('TEST_F: TIMEOUT_PENDING leaves order pending, does not clear cart, navigates Orders', async () => {
    jest.useFakeTimers({ advanceTimers: true });

    try {
      const utils = render(<CheckoutScreen />);
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      const button = await utils.findByTestId('finish-order-button');
      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1));

      await act(async () => {
        jest.advanceTimersByTime(15000);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'Orders' });
        expect(mockClearCart).not.toHaveBeenCalled();
        expect(mockUpdateOrderStatus).not.toHaveBeenCalledWith('order-1', 'cancelled');
        expect(mockNavigate).not.toHaveBeenCalledWith('OrderCompleted', expect.anything());
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('CURRENT RISK: TEST_G retry after TIMEOUT_PENDING creates a new order identity', async () => {
    // Characterizes R32_R1 defect: timeout leaves pending order; fresh submit mints new orderId.
    // Expected to change under R32_R3 client payment-session idempotency remediation.
    jest.useFakeTimers({ advanceTimers: true });

    try {
      mockCreateOrder
        .mockResolvedValueOnce(scheduledOrderBase('order-timeout-1'))
        .mockResolvedValueOnce(scheduledOrderBase('order-retry-2'));

      const utils = render(<CheckoutScreen />);
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      const button = await utils.findByTestId('finish-order-button');
      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1));

      await act(async () => {
        jest.advanceTimersByTime(15000);
      });

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'Orders' })
      );

      mockPresentPaymentSheet.mockResolvedValue({ error: null });
      mockInitPaymentSheet.mockResolvedValue({ error: null });

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledTimes(2);
      });

      const firstId = mockCreateOrder.mock.results[0].value;
      const secondId = mockCreateOrder.mock.results[1].value;
      await expect(firstId).resolves.toEqual(expect.objectContaining({ id: 'order-timeout-1' }));
      await expect(secondId).resolves.toEqual(expect.objectContaining({ id: 'order-retry-2' }));

      await waitFor(() => {
        expect(mockCreatePaymentIntent).toHaveBeenCalledWith(
          expect.objectContaining({ orderId: 'order-retry-2' })
        );
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('CURRENT RISK: TEST_H fresh screen re-entry creates a new order identity', async () => {
    // Characterizes R32_R1 defect: no persisted payment-session/request identity across remount.
    // Expected to change under R32_R3 client payment-session idempotency remediation.
    mockCreateOrder
      .mockResolvedValueOnce(scheduledOrderBase('order-mount-1'))
      .mockResolvedValueOnce(scheduledOrderBase('order-mount-2'));

    const first = render(<CheckoutScreen />);
    await settleAddressAndPricing();
    await pressFinalize(first);

    await waitFor(() => expect(mockCreateOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1));

    await act(async () => {
      firePaidSnapshot('order-mount-1');
    });
    await waitFor(() => expect(mockClearCart).toHaveBeenCalledTimes(1));

    first.unmount();

    mockClearCart.mockClear();
    mockNavigate.mockClear();
    mockInitPaymentSheet.mockClear();
    mockPresentPaymentSheet.mockClear();
    mockCreatePaymentIntent.mockClear();
    onSnapshotSuccess = null;

    const second = render(<CheckoutScreen />);
    await settleAddressAndPricing();
    await pressFinalize(second);

    await waitFor(() => expect(mockCreateOrder).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(mockCreatePaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-mount-2' })
      );
    });

    await act(async () => {
      firePaidSnapshot('order-mount-2');
    });
    await waitFor(() => expect(mockClearCart).toHaveBeenCalledTimes(1));
  });
});
