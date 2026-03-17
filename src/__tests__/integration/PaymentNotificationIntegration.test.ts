import { NotificationService } from '../../services/NotificationService';
import { NotificationType } from '../../config/notifications';
import { db } from '../../config/firebase';
import Stripe from 'stripe';
import { api } from '../../services/api';

// Mock api service
jest.mock('../../services/api', () => ({
  api: {
    post: jest.fn((url) => {
      if (url === '/stripe/payment-methods/create') {
        return Promise.resolve({ data: { paymentMethodId: 'pm_mock_123' } });
      }
      if (url === '/stripe/create-payment-intent') {
        return Promise.resolve({ data: { id: 'pi_mock_123', clientSecret: 'secret_mock_123' } });
      }
      if (url === '/stripe/confirm-payment') {
        return Promise.resolve({
          data: {
            status: 'succeeded',
            receiptUrl: 'http://test-receipt.com',
            charges: { data: [{ receipt_url: 'http://test-receipt.com' }] },
          },
        });
      }
      if (url === '/stripe/customers') {
        return Promise.resolve({ data: { customerId: 'cus_mock_123' } });
      }
      return Promise.resolve({ data: {} });
    }),
    get: jest.fn(),
  },
}));

// Mock NotificationService
jest.mock('../../services/NotificationService', () => {
  const mockNotificationService = {
    createNotification: jest.fn(),
    sendPaymentConfirmation: jest.fn(),
    sendPaymentFailure: jest.fn(),
    // Add other methods if needed
  };
  return {
    NotificationService: {
      getInstance: jest.fn().mockReturnValue(mockNotificationService),
    },
  };
});

// Unmock PaymentService to test real logic
jest.unmock('../../services/PaymentService');

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
  setDoc: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    commit: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { PaymentService } from '../../services/PaymentService';

// Mock das dependências
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock do Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      confirm: jest.fn(),
    },
    paymentMethods: {
      create: jest.fn(),
    },
  }));
});

describe('Payment Notification Integration Tests', () => {
  let paymentService: PaymentService;
  let notificationService: NotificationService;
  let stripeMock: jest.Mock;
  let stripeMockInstance: any; // Variável para guardar a instância

  const mockOrderId = 'ORDER_123';
  const mockCustomerId = 'CUSTOMER_123';

  beforeEach(() => {
    jest.clearAllMocks();

    paymentService = PaymentService.getInstance();
    notificationService = NotificationService.getInstance();
    stripeMock = Stripe as unknown as jest.Mock;

    // Garantir que o construtor mockado foi chamado e pegar a instância
    stripeMockInstance = new (Stripe as any)('test_key'); // Chama o construtor mockado
    // Ou, se StripeService instancia o Stripe internamente no getInstance:
    // stripeService = StripeService.getInstance(); // Chamar primeiro
    // stripeMockInstance = stripeMock.mock.results[0]?.value; // Tentar pegar depois
    // if (!stripeMockInstance) throw new Error('Stripe mock instance not found');

    // Mock do envio de notificação
    // jest.spyOn(notificationService, 'sendPaymentConfirmation').mockResolvedValue(true);

    // Mock dos métodos do Stripe usando a instância garantida
    // const stripeMockInstance = stripeMock.mock.results[0].value; // linha original removida

    // Mock do método de pagamento
    const mockPaymentMethod = {
      id: 'pm_123456789',
      type: 'card',
    };

    // Mock da intenção de pagamento
    const mockPaymentIntent = {
      id: 'pi_123456789',
      status: 'requires_confirmation',
    };

    // Mock da confirmação de pagamento
    const mockConfirmedPayment = {
      id: 'pi_123456789',
      status: 'succeeded',
      charges: {
        data: [
          {
            receipt_url: 'https://receipt.stripe.com/123',
          },
        ],
      },
    };

    stripeMockInstance.paymentMethods.create.mockResolvedValue(mockPaymentMethod);
    stripeMockInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
    stripeMockInstance.paymentIntents.confirm.mockResolvedValue(mockConfirmedPayment);

    // Mock do Firestore getDoc
    (getDoc as jest.Mock).mockImplementation((docRef) => {
      return Promise.resolve({
        exists: () => true,
        data: () => ({
          totalAmount: 100,
          userId: mockCustomerId,
          stripeCustomerId: 'cus_123',
          email: 'test@example.com',
          name: 'Test User',
        }),
      });
    });

    // Mock do Firestore updateDoc
    (updateDoc as jest.Mock).mockResolvedValue(true);

    // Reset notification service mock
    (notificationService.createNotification as jest.Mock).mockResolvedValue({ id: 'not_123' });
  });

  test('should send a notification when payment is confirmed', async () => {
    // Mock do método createNotification
    const createNotificationSpy = jest.spyOn(notificationService, 'createNotification');

    // Simular um pagamento
    await paymentService.processCreditCardPayment(mockOrderId, {
      number: '4111111111111111',
      expMonth: 12,
      expYear: 2025,
      cvc: '123',
      holderName: 'John Doe',
    });

    // Verificar se a notificação foi enviada
    expect(createNotificationSpy).toHaveBeenCalled();
  });

  test('should handle notification failure gracefully', async () => {
    // Mock do envio de notificação para simular falha
    jest
      .spyOn(notificationService, 'createNotification')
      .mockRejectedValue(new Error('Failed to send notification'));

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Simular um pagamento
    // O erro será propagado porque o serviço de pagamento o lança
    await expect(paymentService.processCreditCardPayment(mockOrderId, {
      number: '4111111111111111',
      expMonth: 12,
      expYear: 2025,
      cvc: '123',
      holderName: 'John Doe',
    })).rejects.toThrow();

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error processing credit card payment:',
      expect.any(Error)
    );

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should format payment confirmation notification correctly', async () => {
    // Mock do método createNotification para capturar os parâmetros
    const createNotificationSpy = jest.spyOn(notificationService, 'createNotification');

    // Simular um pagamento bem-sucedido
    await paymentService.processCreditCardPayment(mockOrderId, {
      number: '4111111111111111',
      expMonth: 12,
      expYear: 2025,
      cvc: '123',
      holderName: 'John Doe',
    });

    // Verificar se a notificação foi formatada corretamente
    expect(createNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockCustomerId,
        type: 'payment_received',
        title: 'Pagamento confirmado',
        data: expect.objectContaining({
          orderId: mockOrderId,
        }),
      })
    );
  });
});
