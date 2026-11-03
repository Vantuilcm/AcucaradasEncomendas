/**
 * G06_R3 — Original acceptOrderAtomic: flat deliveryDriverId = Auth UID only.
 * No financial fallback to delivery_drivers auto-id.
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

jest.mock('../NotificationService', () => ({
  NotificationService: {
    getInstance: jest.fn(() => ({
      createNotification: jest.fn(),
    })),
  },
}));

jest.mock('../GrowthService', () => ({
  GrowthService: { getInstance: jest.fn() },
}));

import { dbFunctions as f } from '../../config/firebase';
import { OrderService } from '../OrderService';

const AUTH_UID = 'auth-uid-111';
const DRIVER_DOC_ALT = 'driver-doc-alt-999';
const ORDER_ID = 'order-g06-r3-1';

describe('OrderService.acceptOrderAtomic — G06_R3 courier UID flat contract', () => {
  let service: OrderService;
  let lastUpdatePayload: Record<string, unknown> | null;
  let orderData: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    (OrderService as any).instance = undefined;
    service = OrderService.getInstance();
    lastUpdatePayload = null;
    orderData = {
      status: 'ready',
      isScheduledOrder: false,
    };

    (f.doc as jest.Mock).mockImplementation((collectionName: string, id: string) => ({
      path: `${collectionName}/${id}`,
      id,
      collectionName,
    }));

    (f.runTransaction as jest.Mock).mockImplementation(async (fn: any) => {
      const transaction = {
        get: jest.fn(async () => ({
          exists: () => true,
          data: () => orderData,
        })),
        update: jest.fn((_ref: unknown, payload: Record<string, unknown>) => {
          lastUpdatePayload = payload;
        }),
      };
      return fn(transaction);
    });
  });

  it('public signature remains acceptOrderAtomic(orderId, driverData)', () => {
    expect(typeof service.acceptOrderAtomic).toBe('function');
    expect(service.acceptOrderAtomic.length).toBe(2);
  });

  it('cadastro id ≠ Auth UID → deliveryDriverId=UID e deliveryDriver.id preservado', async () => {
    const driverData = {
      id: DRIVER_DOC_ALT,
      userId: AUTH_UID,
      name: 'Courier',
      phone: '11999999999',
      vehicle: 'moto',
      plate: 'ABC1D23',
    };

    await service.acceptOrderAtomic(ORDER_ID, driverData);

    expect(lastUpdatePayload).toEqual(
      expect.objectContaining({
        deliveryDriverId: AUTH_UID,
        deliveryDriver: driverData,
      })
    );
    expect((lastUpdatePayload?.deliveryDriver as { id: string }).id).toBe(
      DRIVER_DOC_ALT
    );
    expect(lastUpdatePayload?.deliveryDriverId).not.toBe(DRIVER_DOC_ALT);
  });

  it('userId ausente → não grava (rejeita antes/sem update)', async () => {
    const driverData = {
      id: DRIVER_DOC_ALT,
      name: 'Courier',
      phone: '11999999999',
      vehicle: 'moto',
      plate: 'ABC1D23',
    };

    await expect(
      service.acceptOrderAtomic(ORDER_ID, driverData)
    ).rejects.toThrow(/userId|identidade|cadastro|DRIVER_USERID/i);

    expect(lastUpdatePayload).toBeNull();
    expect(f.runTransaction).not.toHaveBeenCalled();
  });

  it('userId vazio/whitespace → não grava', async () => {
    await expect(
      service.acceptOrderAtomic(ORDER_ID, {
        id: DRIVER_DOC_ALT,
        userId: '   ',
        name: 'Courier',
        phone: '1',
        vehicle: 'moto',
        plate: 'ABC1D23',
      })
    ).rejects.toThrow();

    expect(lastUpdatePayload).toBeNull();
    expect(f.runTransaction).not.toHaveBeenCalled();
  });

  it('conflito ORDER_ALREADY_ACCEPTED permanece protegido', async () => {
    orderData = {
      status: 'ready',
      deliveryDriver: { id: 'other-driver' },
    };

    await expect(
      service.acceptOrderAtomic(ORDER_ID, {
        id: DRIVER_DOC_ALT,
        userId: AUTH_UID,
        name: 'Courier',
        phone: '1',
        vehicle: 'moto',
        plate: 'ABC1D23',
      })
    ).rejects.toThrow(/aceita por outro/i);

    expect(lastUpdatePayload).toBeNull();
  });

  it('nunca usa driverData.id como deliveryDriverId quando userId válido difere', async () => {
    const driverData = {
      id: DRIVER_DOC_ALT,
      userId: AUTH_UID,
      name: 'Courier',
      phone: '1',
      vehicle: 'moto',
      plate: 'X',
    };
    await service.acceptOrderAtomic(ORDER_ID, driverData);
    expect(lastUpdatePayload?.deliveryDriverId).toBe(AUTH_UID);
    expect(lastUpdatePayload?.deliveryDriverId).not.toBe(driverData.id);
  });
});
