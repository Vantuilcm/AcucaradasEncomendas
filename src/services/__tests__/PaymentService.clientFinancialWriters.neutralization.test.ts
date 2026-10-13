/**
 * R32_R4F — PaymentService W1/W2/W3 must not client-write trusted financial order fields
 */

jest.mock('../../config/firebase', () => ({
  getDb: jest.fn(() => ({})),
  dbFunctions: {
    doc: jest.fn(),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
    addDoc: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    getDocs: jest.fn(),
    serverTimestamp: jest.fn(() => 'SERVER_TS'),
  },
}));

jest.mock('../LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockCreateNotification = jest.fn().mockResolvedValue({});

jest.mock('../NotificationService', () => ({
  NotificationService: {
    getInstance: jest.fn(() => ({
      createNotification: mockCreateNotification,
    })),
  },
}));

const mockCreateCustomer = jest.fn().mockResolvedValue('cus_mock');
const mockCreatePaymentMethod = jest.fn().mockResolvedValue('pm_mock');
const mockCreatePaymentIntent = jest.fn().mockResolvedValue({ id: 'pi_mock' });
const mockProcessCardPayment = jest.fn().mockResolvedValue({
  status: 'succeeded',
  receiptUrl: 'https://receipt.test',
});
const mockProcessPaymentWithSplit = jest.fn().mockResolvedValue({
  paymentIntentId: 'pi_split',
  appTransferId: 'tr_app',
  producerTransferId: 'tr_producer',
  deliveryPersonTransferId: 'tr_courier',
});

jest.mock('../StripeService', () => ({
  StripeService: {
    getInstance: jest.fn(() => ({
      createCustomer: (...args: any[]) => mockCreateCustomer(...args),
      createPaymentMethod: (...args: any[]) => mockCreatePaymentMethod(...args),
      createPaymentIntent: (...args: any[]) => mockCreatePaymentIntent(...args),
      processCardPayment: (...args: any[]) => mockProcessCardPayment(...args),
      processPaymentWithSplit: (...args: any[]) => mockProcessPaymentWithSplit(...args),
    })),
  },
}));

import { dbFunctions as f } from '../../config/firebase';
import { PaymentService } from '../PaymentService';

const ORDER_ID = 'order-r4f-001';
const cardDetails = {
  number: '4242424242424242',
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
  holderName: 'Test User',
};

function mockOrderDoc(data: Record<string, unknown>) {
  const orderRef = { path: `orders/${ORDER_ID}`, id: ORDER_ID };
  (f.doc as jest.Mock).mockImplementation((_db: any, collection: string, id?: string) => {
    if (collection === 'orders') return orderRef;
    if (collection === 'users') return { path: `users/${id}`, id };
    return { path: `${collection}/${id}`, id };
  });
  (f.getDoc as jest.Mock).mockImplementation(async (ref: any) => {
    if (ref?.path?.startsWith('orders/')) {
      return { exists: () => true, data: () => data };
    }
    if (ref?.path?.startsWith('users/')) {
      return {
        exists: () => true,
        data: () => ({ email: 'u@test.com', name: 'User', stripeCustomerId: 'cus_existing' }),
      };
    }
    return { exists: () => false, data: () => ({}) };
  });
  (f.collection as jest.Mock).mockReturnValue({ path: 'transactions' });
  (f.addDoc as jest.Mock).mockResolvedValue({ id: 'txn_1' });
  (f.updateDoc as jest.Mock).mockResolvedValue(undefined);
  return orderRef;
}

function ordersUpdateCalls() {
  return (f.updateDoc as jest.Mock).mock.calls.filter((call: any[]) => {
    const ref = call[0];
    return ref?.path?.startsWith('orders/');
  });
}

describe('PaymentService R4F client financial order writers neutralized', () => {
  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    (PaymentService as any).instance = undefined;
    service = PaymentService.getInstance();
    (service as any).stripeService = {
      createCustomer: mockCreateCustomer,
      createPaymentMethod: mockCreatePaymentMethod,
      createPaymentIntent: mockCreatePaymentIntent,
      processCardPayment: mockProcessCardPayment,
      processPaymentWithSplit: mockProcessPaymentWithSplit,
    };
    (service as any).notificationService = {
      createNotification: mockCreateNotification,
    };
    (service as any).db = {};
  });

  it('W1 processCreditCardPayment does not updateDoc orders with paymentStatus/paymentIntentId/confirmed', async () => {
    mockOrderDoc({
      totalAmount: 1000,
      userId: 'user-1',
      customerEmail: 'a@b.com',
      customerName: 'A',
    });

    const result = await service.processCreditCardPayment(ORDER_ID, cardDetails);

    expect(result).toBe(true);
    expect(ordersUpdateCalls()).toHaveLength(0);
    expect(f.addDoc).toHaveBeenCalled();
  });

  it('W2 processPaymentWithSplit does not updateDoc orders with paymentStatus/paymentDetails/confirmed', async () => {
    mockOrderDoc({
      totalAmount: 1000,
      deliveryFee: 100,
      producerId: 'producer-1',
      deliveryPersonId: 'courier-1',
      userId: 'user-1',
    });

    const result = await service.processPaymentWithSplit(ORDER_ID, cardDetails);

    expect(result.success).toBe(true);
    expect(result.paymentIntentId).toBe('pi_split');
    expect(ordersUpdateCalls()).toHaveLength(0);
  });

  it('W3 processPaymentWithSplitAlternative does not updateDoc orders with financial/transfer/confirmed fields', async () => {
    mockOrderDoc({
      totalAmount: 1000,
      deliveryFee: 100,
      producerId: 'producer-1',
      deliveryPersonId: 'courier-1',
      userId: 'user-1',
    });

    const result = await service.processPaymentWithSplitAlternative(ORDER_ID, cardDetails);

    expect(result.success).toBe(true);
    expect(result.producerTransferId).toBe('tr_producer');
    const orderUpdates = ordersUpdateCalls();
    // users stripeCustomerId update may still occur; only orders financial writes are forbidden
    expect(orderUpdates).toHaveLength(0);
  });
});
