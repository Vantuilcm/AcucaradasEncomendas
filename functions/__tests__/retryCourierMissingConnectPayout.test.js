'use strict';

const mockDocuments = new Map();
const mockReadSequences = new Map();
const mockReferences = new Map();
const mockUpdateErrorPaths = new Set();
const mockWrites = [];
const mockTimestamp = Object.freeze({ __localServerTimestamp: true });

class MockHttpsError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'HttpsError';
    this.code = code;
    this.details = details;
  }
}

function mockSnapshot(path) {
  const sequence = mockReadSequences.get(path);
  const value = sequence && sequence.length
    ? sequence.shift()
    : mockDocuments.get(path);
  return {
    exists: value !== undefined,
    id: path.split('/').pop(),
    data: () => value,
  };
}

function mockQueryChain() {
  const query = {
    where: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: jest.fn(async () => ({
      empty: true,
      size: 0,
      docs: [],
      forEach: jest.fn(),
    })),
  };
  return query;
}

function mockDocumentReference(collectionPath, documentId) {
  const path = `${collectionPath}/${documentId}`;
  const reference = {
    id: documentId,
    path,
    get: jest.fn(async () => mockSnapshot(path)),
    set: jest.fn(async (payload, options) => {
      mockWrites.push({ method: 'set', path, payload, options });
    }),
    update: jest.fn(async payload => {
      if (mockUpdateErrorPaths.has(path)) throw new Error('local write failure');
      mockWrites.push({ method: 'update', path, payload });
    }),
    collection: jest.fn(name => mockCollectionReference(`${path}/${name}`)),
  };
  mockReferences.set(path, reference);
  return reference;
}

function mockCollectionReference(collectionPath) {
  const query = mockQueryChain();
  return {
    ...query,
    doc: jest.fn(id => mockDocumentReference(collectionPath, id)),
    add: jest.fn(async payload => {
      mockWrites.push({ method: 'add', path: collectionPath, payload });
      return { id: 'local-add-id' };
    }),
  };
}

const mockDb = {
  collection: jest.fn(name => mockCollectionReference(name)),
  runTransaction: jest.fn(async callback =>
    callback({
      get: jest.fn(async ref => ref.get()),
      set: jest.fn(),
      update: jest.fn(),
    })
  ),
};

const mockFirestore = jest.fn(() => mockDb);
mockFirestore.FieldValue = {
  serverTimestamp: jest.fn(() => mockTimestamp),
  increment: jest.fn(value => ({ __increment: value })),
};
mockFirestore.Timestamp = {
  fromDate: jest.fn(date => ({ __date: date })),
};

const mockAdmin = {
  apps: [],
  initializeApp: jest.fn(),
  firestore: mockFirestore,
};

function mockOnCall(handler) {
  handler.__localOnCallHandler = handler;
  return handler;
}

function mockOnRequest(handler) {
  handler.__localOnRequestHandler = handler;
  return handler;
}

function mockDocumentBuilder() {
  return {
    onCreate: jest.fn(handler => handler),
    onUpdate: jest.fn(handler => handler),
    onWrite: jest.fn(handler => handler),
  };
}

const mockFunctions = {
  config: jest.fn(() => ({
    stripe: {
      secret: 'local-placeholder',
      webhook_secret: 'local-placeholder',
    },
    onesignal: {},
  })),
  https: {
    onCall: jest.fn(mockOnCall),
    onRequest: jest.fn(mockOnRequest),
    HttpsError: MockHttpsError,
  },
  firestore: { document: jest.fn(mockDocumentBuilder) },
  auth: {
    user: jest.fn(() => ({
      onCreate: jest.fn(handler => handler),
      onDelete: jest.fn(handler => handler),
    })),
  },
  pubsub: {
    schedule: jest.fn(() => ({ onRun: jest.fn(handler => handler) })),
  },
  scheduler: {
    onSchedule: jest.fn((_options, handler) => handler),
  },
  runWith: jest.fn(() => ({
    https: {
      onCall: jest.fn(mockOnCall),
      onRequest: jest.fn(mockOnRequest),
    },
    firestore: { document: jest.fn(mockDocumentBuilder) },
  })),
};

const mockStripeInstance = {
  transfers: { create: jest.fn() },
  paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
  customers: { create: jest.fn() },
  setupIntents: { create: jest.fn() },
  ephemeralKeys: { create: jest.fn() },
  accounts: { create: jest.fn(), retrieve: jest.fn() },
  accountLinks: { create: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
};
const mockStripeConstructor = jest.fn(() => mockStripeInstance);

jest.mock('firebase-functions/v1', () => mockFunctions, { virtual: true });
jest.mock('firebase-admin', () => mockAdmin, { virtual: true });
jest.mock('stripe', () => mockStripeConstructor, { virtual: true });

const loadedFunctions = require('../index.js');
const retryHandler = loadedFunctions.retryCourierMissingConnectPayout;
const adminContext = { auth: { uid: 'admin-1' } };
const eligibleOrder = Object.freeze({
  status: 'delivered',
  deliveryFeeHeld: true,
  courierPayoutStatus: 'missing_connected_account',
  deliveryDriverId: 'courier-1',
  deliveryFee: 12.34,
});

// Raw helper has no default parameters so undefined/null stay literal.
const invokeRaw = (data, context) => retryHandler(data, context);
const invokeValid = (overrides = {}, context = adminContext) =>
  invokeRaw({ orderId: 'order-1', ...overrides }, context);

function resetOperationalSpies() {
  mockDocuments.clear();
  mockReadSequences.clear();
  mockReferences.clear();
  mockUpdateErrorPaths.clear();
  mockWrites.length = 0;
  mockDb.collection.mockClear();
  mockStripeConstructor.mockClear();
  mockStripeInstance.transfers.create.mockReset();
  mockStripeInstance.transfers.create.mockResolvedValue({ id: 'tr_local' });
  mockDocuments.set('users/admin-1', { role: 'admin' });
}

function setEligibleState(orderOverrides = {}, courierOverrides = {}) {
  mockDocuments.set('orders/order-1', {
    ...eligibleOrder,
    ...orderOverrides,
  });
  mockDocuments.set('users/courier-1', {
    stripeAccountId: 'acct_courier',
    ...courierOverrides,
  });
}

async function expectCode(promise, code) {
  await expect(promise).rejects.toMatchObject({
    name: 'HttpsError',
    code,
  });
}

describe('retryCourierMissingConnectPayout', () => {
  beforeEach(resetOperationalSpies);

  test('exports an invocable onCall handler', () => {
    expect(typeof retryHandler).toBe('function');
    expect(retryHandler.__localOnCallHandler).toBe(retryHandler);
  });

  test('forwards undefined context literally and rejects it', async () => {
    await expectCode(
      invokeRaw({ orderId: 'order-1' }, undefined),
      'unauthenticated'
    );
    expect(mockDb.collection).not.toHaveBeenCalled();
  });

  test('rejects authenticated non-admin user', async () => {
    mockDocuments.set('users/customer-1', { role: 'customer' });
    await expectCode(
      invokeRaw(
        { orderId: 'order-1' },
        { auth: { uid: 'customer-1' } }
      ),
      'permission-denied'
    );
  });

  test('forwards undefined data literally and rejects it', async () => {
    await expectCode(invokeRaw(undefined, adminContext), 'invalid-argument');
  });

  test('forwards null data literally and rejects it', async () => {
    await expectCode(invokeRaw(null, adminContext), 'invalid-argument');
  });

  test('rejects array data', async () => {
    await expectCode(invokeRaw([], adminContext), 'invalid-argument');
  });

  test('rejects absent orderId', async () => {
    await expectCode(invokeRaw({}, adminContext), 'invalid-argument');
  });

  test('rejects non-string orderId', async () => {
    await expectCode(invokeRaw({ orderId: 123 }, adminContext), 'invalid-argument');
  });

  test('rejects empty orderId', async () => {
    await expectCode(invokeRaw({ orderId: '   ' }, adminContext), 'invalid-argument');
  });

  test.each([
    ['amount', 100],
    ['deliveryFee', 10],
    ['destination', 'acct_caller'],
    ['courierId', 'caller-courier'],
    ['deliveryDriverId', 'caller-driver'],
    ['stripeAccountId', 'acct_caller'],
    ['paymentIntentId', 'pi_caller'],
    ['source_transaction', 'ch_caller'],
  ])('rejects caller field %s', async (field, value) => {
    await expectCode(
      invokeRaw({ orderId: 'order-1', [field]: value }, adminContext),
      'invalid-argument'
    );
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('returns not-found for missing order', async () => {
    await expectCode(invokeValid(), 'not-found');
  });

  test.each([
    ['status', { status: 'ready' }],
    ['hold', { deliveryFeeHeld: false }],
    ['payout status', { courierPayoutStatus: 'failed' }],
    ['transfer id', { courierTransferId: 'tr_existing' }],
  ])('rejects incompatible %s', async (_name, override) => {
    setEligibleState(override);
    await expectCode(invokeValid(), 'failed-precondition');
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('rejects missing courier identity', async () => {
    setEligibleState({ deliveryDriverId: undefined, courierId: undefined });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test.each([
    ['zero', { deliveryFee: 0, courierPayoutAmount: 0 }],
    ['negative', { deliveryFee: -1 }],
    ['non-finite', { deliveryFee: Number.POSITIVE_INFINITY }],
  ])('rejects %s payout amount', async (_name, override) => {
    setEligibleState(override);
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects missing courier user', async () => {
    mockDocuments.set('orders/order-1', { ...eligibleOrder });
    await expectCode(invokeValid(), 'failed-precondition');
    expect(mockWrites).toEqual([]);
  });

  test('rejects invalid connected account', async () => {
    setEligibleState({}, { stripeAccountId: 'invalid-account' });
    await expectCode(invokeValid(), 'failed-precondition');
    expect(mockWrites).toEqual([]);
  });

  test('aborts when order reread diverges', async () => {
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder, deliveryFee: 99 },
    ]);
    mockDocuments.set('users/courier-1', { stripeAccountId: 'acct_courier' });
    await expectCode(invokeValid(), 'aborted');
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
    expect(mockWrites).toEqual([]);
  });

  test('aborts when account reread diverges', async () => {
    mockDocuments.set('orders/order-1', { ...eligibleOrder });
    mockReadSequences.set('users/courier-1', [
      { stripeAccountId: 'acct_courier' },
      { stripeAccountId: 'acct_replaced' },
    ]);
    await expectCode(invokeValid(), 'aborted');
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
    expect(mockWrites).toEqual([]);
  });

  test('executes exact idempotent transfer and paid write', async () => {
    setEligibleState();
    const result = await invokeRaw({ orderId: '  order-1  ' }, adminContext);

    expect(result).toEqual({
      success: true,
      orderId: 'order-1',
      courierTransferId: 'tr_local',
      courierPayoutStatus: 'paid',
    });
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledTimes(1);
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledWith(
      {
        amount: 1234,
        currency: 'brl',
        destination: 'acct_courier',
        transfer_group: 'order-1',
        metadata: { role: 'courier', orderId: 'order-1' },
      },
      { idempotencyKey: 'courier_delivery_payout_order-1' }
    );
    expect(mockWrites).toEqual([
      {
        method: 'update',
        path: 'orders/order-1',
        payload: {
          courierPayoutStatus: 'paid',
          courierTransferId: 'tr_local',
          courierPayoutProcessedAt: mockTimestamp,
          deliveryFeeHeld: false,
        },
      },
    ]);
    expect(mockReferences.get('orders/order-1').get).toHaveBeenCalledTimes(2);
    expect(mockReferences.get('users/courier-1').get).toHaveBeenCalledTimes(2);
  });

  test('sanitizes Stripe error without writing order', async () => {
    setEligibleState();
    mockStripeInstance.transfers.create.mockRejectedValueOnce(
      new Error('raw Stripe account detail')
    );
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'internal',
      message: 'Courier payout retry failed.',
    });
    expect(mockWrites).toEqual([]);
  });

  test('sanitizes post-transfer Firestore failure without failed write', async () => {
    setEligibleState();
    mockUpdateErrorPaths.add('orders/order-1');
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'internal',
      message: 'Courier payout retry failed.',
    });
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledTimes(1);
    expect(mockWrites).toEqual([]);
  });
});
