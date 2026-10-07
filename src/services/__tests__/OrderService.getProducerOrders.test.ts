/**
 * M050 — Producer query-prep targeted tests (OrderService.getProducerOrders)
 * Cases: OS-01 .. OS-07
 */

jest.mock('../../config/firebase', () => ({
  dbFunctions: {
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    getDocs: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
  },
}));

jest.mock('../LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../NotificationService', () => ({
  NotificationService: { getInstance: jest.fn() },
}));

jest.mock('../GrowthService', () => ({
  GrowthService: { getInstance: jest.fn() },
}));

jest.mock('../StoreAvailabilityService', () => ({
  StoreAvailabilityService: {
    parseLocalDate: jest.fn((d: string) => new Date(`${d}T00:00:00`)),
  },
}));

jest.mock('crypto-js', () => ({
  SHA256: () => ({ toString: () => 'mock-hash' }),
}));

import { dbFunctions as f } from '../../config/firebase';
import { OrderService } from '../OrderService';

const AUTH_UID = 'producer-auth-uid-001';

describe('OrderService.getProducerOrders — M050 producer query-prep', () => {
  let service: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    (OrderService as any).instance = undefined;
    service = OrderService.getInstance();

    (f.collection as jest.Mock).mockReturnValue({ path: 'orders', id: 'orders' });
    (f.where as jest.Mock).mockImplementation((field: string, op: string, value: unknown) => ({
      __constraint: 'where',
      field,
      op,
      value,
    }));
    (f.orderBy as jest.Mock).mockImplementation((field: string, direction?: string) => ({
      __constraint: 'orderBy',
      field,
      direction,
    }));
    (f.query as jest.Mock).mockImplementation((ref: unknown, ...constraints: unknown[]) => ({
      __type: 'query',
      ref,
      constraints,
    }));
  });

  it('OS-01: getProducerOrders(AUTH_UID) emits where(producerId == AUTH_UID)', async () => {
    (f.getDocs as jest.Mock).mockResolvedValue({ docs: [] });

    await service.getProducerOrders(AUTH_UID);

    expect(f.where).toHaveBeenCalledWith('producerId', '==', AUTH_UID);
    expect(f.query).toHaveBeenCalled();
    const queryArgs = (f.query as jest.Mock).mock.calls[0];
    expect(queryArgs[1]).toEqual(
      expect.objectContaining({
        __constraint: 'where',
        field: 'producerId',
        op: '==',
        value: AUTH_UID,
      })
    );
  });

  it('OS-02: getProducerOrders query does not include remote orderBy', async () => {
    (f.getDocs as jest.Mock).mockResolvedValue({ docs: [] });

    await service.getProducerOrders(AUTH_UID);

    expect(f.orderBy).not.toHaveBeenCalled();
    const queryArgs = (f.query as jest.Mock).mock.calls[0];
    const constraints = queryArgs.slice(1);
    expect(constraints.every((c: any) => c?.__constraint !== 'orderBy')).toBe(true);
  });

  it('OS-03: getProducerOrders does not call getOrders or wide dump', async () => {
    (f.getDocs as jest.Mock).mockResolvedValue({ docs: [] });
    const getOrdersSpy = jest.spyOn(service, 'getOrders').mockResolvedValue([]);

    await service.getProducerOrders(AUTH_UID);

    expect(getOrdersSpy).not.toHaveBeenCalled();
    expect(f.collection).toHaveBeenCalledWith('orders');
    expect(f.where).toHaveBeenCalled();
    expect(f.getDocs).toHaveBeenCalledTimes(1);
    const getDocsArg = (f.getDocs as jest.Mock).mock.calls[0][0];
    expect(getDocsArg).toEqual(
      expect.objectContaining({
        __type: 'query',
        constraints: expect.arrayContaining([
          expect.objectContaining({ __constraint: 'where', field: 'producerId' }),
        ]),
      })
    );

    getOrdersSpy.mockRestore();
  });

  it('OS-04: results are sorted client-side by createdAt desc', async () => {
    const older = new Date('2024-01-01T10:00:00.000Z');
    const newer = new Date('2024-06-01T10:00:00.000Z');
    (f.getDocs as jest.Mock).mockResolvedValue({
      docs: [
        {
          id: 'ord-old',
          data: () => ({ producerId: AUTH_UID, createdAt: older, status: 'pending' }),
        },
        {
          id: 'ord-new',
          data: () => ({ producerId: AUTH_UID, createdAt: newer, status: 'pending' }),
        },
      ],
    });

    const result = await service.getProducerOrders(AUTH_UID);

    expect(result.map((o) => o.id)).toEqual(['ord-new', 'ord-old']);
  });

  it('OS-05: empty snapshot returns []', async () => {
    (f.getDocs as jest.Mock).mockResolvedValue({ docs: [] });

    const result = await service.getProducerOrders(AUTH_UID);

    expect(result).toEqual([]);
  });

  it('OS-06: invalid/empty producerId rejects via assertValidId and skips getDocs', async () => {
    const emptyResult = await service.getProducerOrders('');
    expect(emptyResult).toEqual([]);
    expect(f.getDocs).not.toHaveBeenCalled();
    expect(f.where).not.toHaveBeenCalled();

    jest.clearAllMocks();
    (f.collection as jest.Mock).mockReturnValue({ path: 'orders' });

    const whitespaceResult = await service.getProducerOrders('   ');
    expect(whitespaceResult).toEqual([]);
    expect(f.getDocs).not.toHaveBeenCalled();
  });

  it('OS-07: getDocs rejection is propagated (not swallowed)', async () => {
    const boom = new Error('firestore-unavailable');
    (f.getDocs as jest.Mock).mockRejectedValue(boom);

    await expect(service.getProducerOrders(AUTH_UID)).rejects.toThrow('firestore-unavailable');
  });
});
