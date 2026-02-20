import { PaymentService } from '../../services/PaymentService';
import { NotificationService } from '../../services/NotificationService';
import { StripeService } from '../../services/StripeService';

// Mocks explícitos de firebase/firestore para capturar chamadas internas do NotificationService
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  Timestamp: { now: jest.fn() },
  deleteDoc: jest.fn(),
}));// Mock das dependências de Firebase
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

describe('Payment Notification Integration Tests', () => {
  let paymentService: PaymentService;
  let notificationService: NotificationService;

  const mockOrderId = 'ORDER_123';
  const mockCustomerId = 'CUSTOMER_123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Configure Firestore doc/getDoc/updateDoc mocks
    const firestore = require('firebase/firestore');
    firestore.doc.mockImplementation((db: any, col: string, id: string) => ({ db, col, id }));
    firestore.getDoc.mockImplementation(async (ref: any) => {
      if (ref.col === 'orders') {
        return { id: ref.id, exists: () => true, data: () => ({ totalAmount: 1000, userId: mockCustomerId }) };
      }
      if (ref.col === 'users') {
        return { id: ref.id, exists: () => true, data: () => ({ email: 'john@example.com', name: 'John Doe', stripeCustomerId: undefined }) };
      }
      return { id: ref.id, exists: () => false, data: () => ({}) };
    });
    firestore.updateDoc.mockResolvedValue(undefined);
    firestore.setDoc.mockResolvedValue(undefined);

    // Stub global fetch for Stripe payment method creation used inside PaymentService
    global.fetch = jest.fn(async (url: string, options: any) => {
      if (typeof url === 'string' && url.includes('https://api.stripe.com/v1/payment_methods')) {
        return {
          ok: true,
          json: async () => ({ id: 'pm_123456789', type: 'card' }),
        } as any;
      }
      // default mock response
      return { ok: true, json: async () => ({}) } as any;
    });

    paymentService = PaymentService.getInstance();
    notificationService = NotificationService.getInstance();

    // Mock envio de confirmação de pagamento como sucesso por padrão
    jest.spyOn(notificationService, 'sendPaymentConfirmation').mockResolvedValue(true);

    // Mock StripeService flows usados pelo PaymentService
    const stripeService = StripeService.getInstance();
    jest.spyOn(stripeService, 'createCustomer').mockResolvedValue(mockCustomerId);
    jest.spyOn(stripeService, 'createPaymentIntent').mockResolvedValue({ id: 'pi_123456789', clientSecret: 'secret_123' });
    jest.spyOn(stripeService, 'processCardPayment').mockResolvedValue({
      id: 'pi_123456789',
      status: 'succeeded',
      charges: { data: [{ receipt_url: 'https://receipt.stripe.com/123' }] },
    });
  });

  test('should send payment confirmation notification after successful payment', async () => {
    const sendNotificationSpy = jest.spyOn(notificationService, 'sendPaymentConfirmation');

    await paymentService.processCreditCardPayment(mockOrderId, {
      number: '4111111111111111',
      expMonth: 12,
      expYear: 2025,
      cvc: '123',
      holderName: 'John Doe',
    });

    expect(sendNotificationSpy).toHaveBeenCalledWith(mockCustomerId, mockOrderId);
  });

  test('should handle notification failure gracefully', async () => {
    jest
      .spyOn(notificationService, 'sendPaymentConfirmation')
      .mockRejectedValue(new Error('Failed to send notification'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(
      paymentService.processCreditCardPayment(mockOrderId, {
        number: '4111111111111111',
        expMonth: 12,
        expYear: 2025,
        cvc: '123',
        holderName: 'John Doe',
      })
    ).rejects.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error processing credit card payment:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  test('should format payment confirmation notification correctly', async () => {
    // Restaurar a implementação real de sendPaymentConfirmation
    const sendPaymentSpy = jest.spyOn(notificationService, 'sendPaymentConfirmation');
    sendPaymentSpy.mockRestore();

    const createNotificationSpy = jest.spyOn(notificationService, 'createNotification');

    await paymentService.processCreditCardPayment(mockOrderId, {
      number: '4111111111111111',
      expMonth: 12,
      expYear: 2025,
      cvc: '123',
      holderName: 'John Doe',
    });

    expect(createNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockCustomerId,
        type: 'payment_received',
        title: 'Pagamento confirmado',
        message: expect.stringContaining(mockOrderId),
        priority: 'normal',
        read: false,
        data: { orderId: mockOrderId },
      })
    );
  });
});



