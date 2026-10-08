/**
 * R33_R8 — Driver earnings/history query-fallback identity contract (OrderService)
 * Updates R33_R5: nested-only orders are now visible via dual independent queries
 * (deliveryDriverId + deliveryDriver.id) with document-ID deduplication.
 * TEST_09: STATIC_ONLY — OrderManagementScreen.handleAdvanceStatus writes nested
 * deliveryDriver only (no deliveryDriverId). Proven in R33_R3; not a screen test here.
 */

jest.mock('../../config/firebase', () => ({
  dbFunctions: {
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    startAfter: jest.fn(),
    getDocs: jest.fn(),
    doc: jest.fn(),
    runTransaction: jest.fn(),
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
import { UserUtils } from '../../utils/UserUtils';

const DRIVER_UID = 'driver-auth-uid-001';
const OTHER_DRIVER_UID = 'driver-other-uid-999';

type FixtureOrder = {
  id: string;
  deliveryDriverId?: string;
  deliveryDriver?: { id: string; name?: string };
  status?: string;
  createdAt?: string;
};

function makeDoc(order: FixtureOrder) {
  const { id, ...data } = order;
  return {
    id,
    data: () => data,
  };
}

function getNestedValue(data: Record<string, unknown>, field: string): unknown {
  if (!field.includes('.')) {
    return data[field];
  }
  const [root, child] = field.split('.');
  const nested = data[root] as Record<string, unknown> | undefined;
  return nested?.[child];
}

function earningsWhereCalls(): Array<{ field: string; op: string; value: unknown }> {
  return (f.where as jest.Mock).mock.calls
    .map((args: unknown[]) => ({
      field: String(args[0]),
      op: String(args[1]),
      value: args[2],
    }))
    .filter(
      (c) =>
        (c.field === 'deliveryDriverId' || c.field === 'deliveryDriver.id') &&
        c.op === '==' &&
        c.value === DRIVER_UID
    );
}

describe('OrderService.getOrdersForDriverEarnings — R33_R8 query-fallback contract', () => {
  let service: OrderService;
  let fixtures: FixtureOrder[];

  beforeEach(() => {
    jest.clearAllMocks();
    (OrderService as any).instance = undefined;
    service = OrderService.getInstance();
    fixtures = [];

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
    (f.limit as jest.Mock).mockImplementation((n: number) => ({
      __constraint: 'limit',
      value: n,
    }));
    (f.query as jest.Mock).mockImplementation((ref: unknown, ...constraints: unknown[]) => ({
      __type: 'query',
      ref,
      constraints,
    }));

    // Constraint-aware getDocs: filters fixtures by where(field == value)
    (f.getDocs as jest.Mock).mockImplementation(async (queryObj: any) => {
      const whereConstraints = (queryObj?.constraints || []).filter(
        (c: any) => c?.__constraint === 'where'
      );
      const docs = fixtures
        .filter((order) => {
          return whereConstraints.every((c: any) => {
            const data = { ...order } as Record<string, unknown>;
            delete data.id;
            return getNestedValue(data, c.field) === c.value;
          });
        })
        .map(makeDoc);
      return { docs };
    });

    (f.doc as jest.Mock).mockImplementation((collectionName: string, id: string) => ({
      path: `${collectionName}/${id}`,
      id,
      collectionName,
    }));
  });

  it('TEST_01 / T2: flat-only order is returned exactly once via deliveryDriverId query', async () => {
    fixtures = [
      {
        id: 'order-flat-only',
        deliveryDriverId: DRIVER_UID,
        status: 'delivered',
      },
    ];

    const result = await service.getOrdersForDriverEarnings(DRIVER_UID);

    expect(f.where).toHaveBeenCalledWith('deliveryDriverId', '==', DRIVER_UID);
    expect(f.where).toHaveBeenCalledWith('deliveryDriver.id', '==', DRIVER_UID);
    expect(f.orderBy).not.toHaveBeenCalled();
    expect(f.limit).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('order-flat-only');
    expect(result[0].deliveryDriverId).toBe(DRIVER_UID);
  });

  it('TEST_02 / T1: nested-only matching order IS returned exactly once', async () => {
    fixtures = [
      {
        id: 'order-nested-only',
        deliveryDriver: { id: DRIVER_UID, name: 'Courier' },
        status: 'delivered',
      },
    ];

    const result = await service.getOrdersForDriverEarnings(DRIVER_UID);

    expect(f.where).toHaveBeenCalledWith('deliveryDriverId', '==', DRIVER_UID);
    expect(f.where).toHaveBeenCalledWith('deliveryDriver.id', '==', DRIVER_UID);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('order-nested-only');
    expect(result[0].deliveryDriver?.id).toBe(DRIVER_UID);
    expect(result[0].deliveryDriverId).toBeUndefined();
  });

  it('TEST_03 / T3: both-match same Firestore document is returned exactly once', async () => {
    fixtures = [
      {
        id: 'order-both-match',
        deliveryDriverId: DRIVER_UID,
        deliveryDriver: { id: DRIVER_UID, name: 'Courier' },
        status: 'delivered',
      },
    ];

    const result = await service.getOrdersForDriverEarnings(DRIVER_UID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('order-both-match');
  });

  it('TEST_04 / T4: other-driver order is not returned', async () => {
    fixtures = [
      {
        id: 'order-other-flat',
        deliveryDriverId: OTHER_DRIVER_UID,
        status: 'delivered',
      },
      {
        id: 'order-other-nested',
        deliveryDriver: { id: OTHER_DRIVER_UID },
        status: 'delivered',
      },
      {
        id: 'order-mine',
        deliveryDriverId: DRIVER_UID,
        status: 'delivered',
      },
    ];

    const result = await service.getOrdersForDriverEarnings(DRIVER_UID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('order-mine');
  });

  it('TEST_11 / T5+T6: dual equality queries only — no OR, orderBy, or limit', async () => {
    fixtures = [
      {
        id: 'order-flat-only',
        deliveryDriverId: DRIVER_UID,
        status: 'delivered',
      },
      {
        id: 'order-nested-only',
        deliveryDriver: { id: DRIVER_UID },
        status: 'delivered',
      },
    ];

    const result = await service.getOrdersForDriverEarnings(DRIVER_UID);

    const whereCalls = earningsWhereCalls();
    const fields = whereCalls.map((c) => c.field).sort();
    expect(fields).toEqual(['deliveryDriver.id', 'deliveryDriverId']);
    expect(whereCalls.every((c) => c.op === '==' && c.value === DRIVER_UID)).toBe(true);
    expect(f.query).toHaveBeenCalledTimes(2);
    expect(f.getDocs).toHaveBeenCalledTimes(2);
    expect(f.orderBy).not.toHaveBeenCalled();
    expect(f.limit).not.toHaveBeenCalled();
    // No OR helper on dbFunctions harness — prove neither query used multi-constraint OR payload
    for (const call of (f.query as jest.Mock).mock.calls) {
      expect(call.length).toBe(2); // ref + single where constraint
      expect(call[1]).toEqual(
        expect.objectContaining({
          __constraint: 'where',
          op: '==',
          value: DRIVER_UID,
        })
      );
    }
    expect(result.map((o) => o.id).sort()).toEqual(['order-flat-only', 'order-nested-only']);
  });

  it('TEST_10: getOrdersByDeliveryDriver remains non-equivalent (orderBy+limit) vs earnings dual query', async () => {
    fixtures = [
      {
        id: 'order-nested-only',
        deliveryDriver: { id: DRIVER_UID },
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'delivered',
      },
      {
        id: 'order-flat-only',
        deliveryDriverId: DRIVER_UID,
        createdAt: '2026-01-02T00:00:00.000Z',
        status: 'delivered',
      },
    ];

    const nestedVisible = await service.getOrdersByDeliveryDriver(DRIVER_UID);
    const earningsVisible = await service.getOrdersForDriverEarnings(DRIVER_UID);

    expect(f.where).toHaveBeenCalledWith('deliveryDriver.id', '==', DRIVER_UID);
    expect(f.where).toHaveBeenCalledWith('deliveryDriverId', '==', DRIVER_UID);
    expect(f.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(f.limit).toHaveBeenCalled();

    expect(nestedVisible.map((o) => o.id)).toEqual(['order-nested-only']);
    expect(earningsVisible.map((o) => o.id).sort()).toEqual([
      'order-flat-only',
      'order-nested-only',
    ]);
    expect(nestedVisible.map((o) => o.id)).not.toEqual(
      earningsVisible.map((o) => o.id).sort()
    );
  });
});

describe('OrderService.acceptOrderAtomic — R33_R5 flat+nested write contract', () => {
  let service: OrderService;
  let lastUpdatePayload: Record<string, unknown> | null;

  beforeEach(() => {
    jest.clearAllMocks();
    (OrderService as any).instance = undefined;
    service = OrderService.getInstance();
    lastUpdatePayload = null;

    (f.doc as jest.Mock).mockImplementation((collectionName: string, id: string) => ({
      path: `${collectionName}/${id}`,
      id,
      collectionName,
    }));

    (f.runTransaction as jest.Mock).mockImplementation(async (fn: any) => {
      const orderData = {
        status: 'ready',
        isScheduledOrder: false,
      };

      const transaction = {
        get: jest.fn(async (ref: any) => {
          if (ref.collectionName === 'orders') {
            return {
              exists: () => true,
              data: () => orderData,
            };
          }
          if (ref.collectionName === 'delivery_drivers') {
            return {
              exists: () => true,
              data: () => ({ status: 'active', userId: DRIVER_UID }),
            };
          }
          return { exists: () => false, data: () => undefined };
        }),
        update: jest.fn((_ref: unknown, payload: Record<string, unknown>) => {
          lastUpdatePayload = payload;
        }),
      };

      return fn(transaction);
    });
  });

  it('TEST_05 / T7: acceptOrderAtomic writes deliveryDriverId === driverData.userId when present', async () => {
    const driverData = {
      id: 'driver-doc-alt',
      userId: DRIVER_UID,
      name: 'Courier',
      phone: '11999999999',
      vehicle: 'moto',
      plate: 'ABC1D23',
    };

    await service.acceptOrderAtomic('order-1', driverData);

    expect(lastUpdatePayload).toEqual(
      expect.objectContaining({
        deliveryDriverId: DRIVER_UID,
        deliveryDriver: driverData,
      })
    );
    expect(lastUpdatePayload?.deliveryDriverId).toBe(driverData.userId);
  });

  it('TEST_06 / T8: acceptOrderAtomic falls back to driverData.id when userId absent', async () => {
    const driverData = {
      id: DRIVER_UID,
      name: 'Courier',
      phone: '11999999999',
      vehicle: 'moto',
      plate: 'ABC1D23',
    };

    await service.acceptOrderAtomic('order-2', driverData);

    expect(lastUpdatePayload?.deliveryDriverId).toBe(DRIVER_UID);
    expect(lastUpdatePayload?.deliveryDriverId).toBe(driverData.id);
  });

  it('TEST_07: acceptOrderAtomic update contains nested deliveryDriver and flat deliveryDriverId', async () => {
    const driverData = {
      id: DRIVER_UID,
      name: 'Courier',
      phone: '11999999999',
      vehicle: 'moto',
      plate: 'ABC1D23',
    };

    await service.acceptOrderAtomic('order-3', driverData);

    expect(lastUpdatePayload).toEqual(
      expect.objectContaining({
        deliveryDriver: driverData,
        deliveryDriverId: DRIVER_UID,
      })
    );
    expect(lastUpdatePayload).toHaveProperty('deliveryDriver');
    expect(lastUpdatePayload).toHaveProperty('deliveryDriverId');
    expect(typeof lastUpdatePayload?.deliveryDriverId).toBe('string');
  });

  it('TEST_08 / T8: createDriver convention — driver.id/auth uid matches UserUtils.getUserId consumer key', async () => {
    // createDriver stores delivery_drivers doc id = userId; DriverHome passes { id: driver.id } without userId
    const driverData = {
      id: DRIVER_UID,
      name: 'Courier',
      phone: '11999999999',
      vehicle: 'moto',
      plate: 'ABC1D23',
    };
    const consumerKey = UserUtils.getUserId({ id: DRIVER_UID, uid: DRIVER_UID });

    await service.acceptOrderAtomic('order-4', driverData);

    expect(consumerKey).toBe(DRIVER_UID);
    expect(lastUpdatePayload?.deliveryDriverId).toBe(consumerKey);
    expect(lastUpdatePayload?.deliveryDriverId).toBe(driverData.id);
  });
});
