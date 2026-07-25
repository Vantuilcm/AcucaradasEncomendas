import { f } from '../../config/firebase';
import { PaymentService } from '../../services/PaymentService';
import { StripeService } from '../../services/StripeService';
import { NotificationService } from '../../services/NotificationService';
const { getDoc, updateDoc, doc } = f;
import { loggingService } from '../../services/LoggingService';

// Ensure we use the real PaymentService
jest.unmock('../../services/PaymentService');

// Mock das dependências
jest.mock('../../config/firebase', () => {
  const db = {};
  return {
    auth: {
      currentUser: null,
    },
    db,
    getDb: jest.fn(() => db),
    f: {
      getDoc: jest.fn(),
      updateDoc: jest.fn(),
      doc: jest.fn(),
    },
  };
});

jest.mock('firebase/firestore');
jest.mock('../../services/LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn().mockReturnThis(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  },
}));

jest.mock('../../services/NotificationService', () => {
  const instance = {
    createNotification: jest.fn().mockResolvedValue({}),
    sendPaymentConfirmation: jest.fn().mockResolvedValue({}),
  };
  return {
    NotificationService: {
      getInstance: jest.fn(() => instance),
    },
  };
});

describe('Payment Split Integration Tests', () => {
  const mockOrderId = 'ORDER_123';
  const mockAmount = 15000; // R$ 150,00 em centavos
  const mockDeliveryFee = 1000; // R$ 10,00 em centavos
  const mockUserId = 'user-123';
  const mockProducerId = 'producer-123';
  const mockDeliveryPersonId = 'delivery-123';
  const mockCardDetails = {
    number: '4111111111111111',
    expMonth: 12,
    expYear: 2025,
    cvc: '123',
    holderName: 'John Doe',
  };

  let paymentService: PaymentService;
  let stripeService: StripeService;
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Configurar mocks
    paymentService = PaymentService.getInstance();
    stripeService = StripeService.getInstance();
    notificationService = NotificationService.getInstance();

    // Mock doc to return an object with path
    (doc as any).mockImplementation((_db: any, collection: string, id: string) => ({
      path: `${collection}/${id}`,
      id: id,
    }));

    // Mock do documento de pedido
    (getDoc as any).mockImplementation((docRef: any) => {
      // Verifica se docRef e path existem antes de acessar
      const path = docRef?.path || '';
      
      if (path.includes('orders')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            userId: mockUserId,
            producerId: mockProducerId,
            deliveryPersonId: mockDeliveryPersonId,
            totalAmount: mockAmount,
            deliveryFee: mockDeliveryFee,
            status: 'aguardando_pagamento',
          }),
          id: mockOrderId,
        });
      } else if (path.includes('users')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            email: 'user@example.com',
            name: 'Test User',
            stripeCustomerId: 'cus_123456',
          }),
          id: mockUserId,
        });
      } else if (path.includes('producers')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            name: 'Test Producer',
            stripeAccountId: 'acct_producer123',
          }),
          id: mockProducerId,
        });
      } else if (path.includes('delivery_drivers')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            name: 'Test Delivery Person',
            stripeAccountId: 'acct_delivery123',
          }),
          id: mockDeliveryPersonId,
        });
      }
      return Promise.resolve({
        exists: () => false,
      });
    });

    // Mock da operação de atualização
    (updateDoc as any).mockResolvedValue({});

    // Mock do StripeService
    jest.spyOn(stripeService, 'createPaymentIntent').mockResolvedValue({
      id: 'pi_123456',
      clientSecret: 'pi_123456_secret_789',
    });

    jest.spyOn(stripeService, 'createPaymentMethod').mockResolvedValue('pm_123456');

    jest.spyOn(stripeService, 'processPaymentWithSplit').mockResolvedValue({
      paymentIntentId: 'pi_123456',
      appTransferId: 'tr_app_123',
      producerTransferId: 'tr_producer_123',
      deliveryPersonTransferId: 'tr_delivery_123',
    });

    jest.spyOn(stripeService, 'processCardPayment').mockResolvedValue({
      id: 'pi_123456',
      status: 'succeeded',
      charges: {
        data: [
          {
            receipt_url: 'https://receipt.url',
          },
        ],
      },
    });
  });

  describe('processPaymentWithSplit', () => {
    it('should hard-fail legacy split without calling StripeService or updating order', async () => {
      await expect(
        paymentService.processPaymentWithSplit(mockOrderId, mockCardDetails)
      ).rejects.toThrow('LEGACY_SPLIT_PAYMENT_DISABLED');

      expect(stripeService.processPaymentWithSplit).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should hard-fail even when StripeService would succeed', async () => {
      await expect(
        paymentService.processPaymentWithSplit(mockOrderId, mockCardDetails)
      ).rejects.toThrow('LEGACY_SPLIT_PAYMENT_DISABLED');

      expect(stripeService.processPaymentWithSplit).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should hard-fail for invalid order without StripeService call', async () => {
      (getDoc as any).mockImplementationOnce(() =>
        Promise.resolve({
          exists: () => false,
        })
      );

      await expect(
        paymentService.processPaymentWithSplit('INVALID_ORDER', mockCardDetails)
      ).rejects.toThrow('LEGACY_SPLIT_PAYMENT_DISABLED');

      expect(stripeService.processPaymentWithSplit).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should hard-fail when producer/delivery person missing without StripeService call', async () => {
      (getDoc as any).mockImplementationOnce(() =>
        Promise.resolve({
          exists: () => true,
          data: () => ({
            userId: mockUserId,
            totalAmount: mockAmount,
            deliveryFee: mockDeliveryFee,
            status: 'aguardando_pagamento',
          }),
          id: mockOrderId,
        })
      );

      await expect(
        paymentService.processPaymentWithSplit(mockOrderId, mockCardDetails)
      ).rejects.toThrow('LEGACY_SPLIT_PAYMENT_DISABLED');

      expect(stripeService.processPaymentWithSplit).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
    });
  });
});
