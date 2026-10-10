/**
 * R32_R4C — OrderService.updateOrderStatus canonical paymentStatus fulfillment gate
 */

jest.mock('../../config/firebase', () => ({
  dbFunctions: {
    doc: jest.fn(),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    getDocs: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
    runTransaction: jest.fn(),
  },
}));

jest.mock('../LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockCreateNotification = jest.fn();

jest.mock('../NotificationService', () => ({
  NotificationService: {
    getInstance: jest.fn(() => ({
      createNotification: mockCreateNotification,
    })),
  },
}));

jest.mock('../GrowthService', () => ({
  GrowthService: { getInstance: jest.fn() },
}));

import { dbFunctions as f } from '../../config/firebase';
import { OrderService } from '../OrderService';
import { OrderStatus } from '../../types/Order';

const ORDER_ID = 'order-r4c-001';
const FULFILLMENT_ADVANCING: OrderStatus[] = [
  'confirmed',
  'preparing',
  'ready',
  'delivering',
  'delivered',
];
const GATE_ERROR =
  'Pagamento não confirmado; não é possível avançar o fulfillment';

function mockOrderDoc(data: Record<string, unknown>) {
  const orderRef = { path: `orders/${ORDER_ID}`, id: ORDER_ID };
  (f.doc as jest.Mock).mockReturnValue(orderRef);
  (f.getDoc as jest.Mock).mockResolvedValue({
    exists: () => true,
    data: () => data,
  });
  (f.updateDoc as jest.Mock).mockResolvedValue(undefined);
  mockCreateNotification.mockResolvedValue(undefined);
  return orderRef;
}

describe('OrderService.updateOrderStatus — R4C paymentStatus fulfillment gate', () => {
  let service: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    (OrderService as any).instance = undefined;
    service = OrderService.getInstance();
  });

  it('public API remains updateOrderStatus(orderId, status)', () => {
    expect(typeof service.updateOrderStatus).toBe('function');
    expect(service.updateOrderStatus.length).toBe(2);
  });

  it.each(FULFILLMENT_ADVANCING)(
    'paymentStatus=completed allows %s and writes {status,updatedAt} + notification',
    async (status) => {
      const orderRef = mockOrderDoc({
        userId: 'user-1',
        paymentStatus: 'completed',
        status: 'pending',
      });

      const result = await service.updateOrderStatus(ORDER_ID, status);

      expect(f.updateDoc).toHaveBeenCalledTimes(1);
      expect(f.updateDoc).toHaveBeenCalledWith(
        orderRef,
        expect.objectContaining({ status, updatedAt: expect.any(String) })
      );
      expect(mockCreateNotification).toHaveBeenCalledTimes(1);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'order_status',
          message: `Seu pedido agora está: ${status}`,
        })
      );
      expect(result.status).toBe(status);
      expect(result.id).toBe(ORDER_ID);
    }
  );

  it.each(FULFILLMENT_ADVANCING)(
    'missing paymentStatus blocks %s without updateDoc/notification',
    async (status) => {
      mockOrderDoc({ userId: 'user-1', status: 'pending' });

      await expect(service.updateOrderStatus(ORDER_ID, status)).rejects.toThrow(GATE_ERROR);
      expect(f.updateDoc).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    }
  );

  it.each(FULFILLMENT_ADVANCING)(
    "paymentStatus='failed' blocks %s without updateDoc/notification",
    async (status) => {
      mockOrderDoc({ userId: 'user-1', paymentStatus: 'failed', status: 'pending' });

      await expect(service.updateOrderStatus(ORDER_ID, status)).rejects.toThrow(GATE_ERROR);
      expect(f.updateDoc).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    }
  );

  it('pending allowed without completed payment', async () => {
    const orderRef = mockOrderDoc({ userId: 'user-1', status: 'pending' });

    const result = await service.updateOrderStatus(ORDER_ID, 'pending');

    expect(f.updateDoc).toHaveBeenCalledWith(
      orderRef,
      expect.objectContaining({ status: 'pending', updatedAt: expect.any(String) })
    );
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('pending');
  });

  it('cancelled allowed without completed payment', async () => {
    const orderRef = mockOrderDoc({ userId: 'user-1', status: 'pending' });

    const result = await service.updateOrderStatus(ORDER_ID, 'cancelled');

    expect(f.updateDoc).toHaveBeenCalledWith(
      orderRef,
      expect.objectContaining({ status: 'cancelled', updatedAt: expect.any(String) })
    );
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('cancelled');
  });
});
