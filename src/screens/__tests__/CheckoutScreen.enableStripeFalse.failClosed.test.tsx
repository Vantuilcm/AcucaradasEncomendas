/**
 * R32_R4F — ENABLE_STRIPE=false card path fails closed (no W1 success)
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockClearCart = jest.fn().mockResolvedValue(undefined);
const mockProcessCreditCardPayment = jest.fn();
const mockCreateOrder = jest.fn();
const mockUpdateOrderStatus = jest.fn().mockResolvedValue(undefined);
const mockGetOrderById = jest.fn();
const mockConsultarProduto = jest.fn();
const mockAtualizarProduto = jest.fn();
const mockLogAutomationEvent = jest.fn().mockResolvedValue(undefined);
const mockCreateNotification = jest.fn().mockResolvedValue(undefined);
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

jest.mock('../../config/env', () => ({
  ENV: {
    EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS: 'false',
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
    initPaymentSheet: jest.fn(),
    presentPaymentSheet: jest.fn(),
  }),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ name: 'mock-functions' })),
  httpsCallable: jest.fn(() => jest.fn()),
}));

jest.mock('../../config/firebase', () => ({
  getApp: jest.fn(() => ({ name: 'mock-app' })),
  getDb: jest.fn(() => ({ name: 'mock-db' })),
  f: {
    doc: jest.fn((...segments: string[]) => ({
      path: segments.join('/'),
      id: segments[segments.length - 1],
    })),
    onSnapshot: jest.fn(() => jest.fn()),
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
      processCreditCardPayment: (...args: any[]) => mockProcessCreditCardPayment(...args),
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

describe('CheckoutScreen R4F ENABLE_STRIPE=false fail-closed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockCreateOrder.mockResolvedValue({
      id: 'order-legacy-1',
      status: 'pending',
      totalAmount: 15,
      items: [],
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
    cleanup();
  });

  it('does not call W1, clear cart, or navigate OrderCompleted on card finalize', async () => {
    const utils = render(<CheckoutScreen />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    fireEvent.changeText(utils.getByPlaceholderText('Número do Cartão'), '4242424242424242');
    fireEvent.changeText(utils.getByPlaceholderText('Nome no Cartão'), 'Buyer Test');
    fireEvent.changeText(utils.getByPlaceholderText('MM/AA'), '12/30');
    fireEvent.changeText(utils.getByPlaceholderText('CVV'), '123');

    await act(async () => {
      fireEvent.press(await utils.findByText('Finalizar Pedido'));
    });

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalled();
    });

    expect(mockProcessCreditCardPayment).not.toHaveBeenCalled();
    expect(mockClearCart).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'OrderCompleted',
      expect.anything()
    );
    expect(mockAtualizarProduto).not.toHaveBeenCalled();
  });
});
