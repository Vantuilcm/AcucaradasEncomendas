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

const mockHttps = {
  onCall: jest.fn(mockOnCall),
  onRequest: jest.fn(mockOnRequest),
  HttpsError: MockHttpsError,
};

const mockFunctions = {
  config: jest.fn(() => ({
    stripe: {
      secret: 'local-placeholder',
      webhook_secret: 'local-placeholder',
    },
    onesignal: {},
  })),
  https: mockHttps,
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
    https: mockHttps,
    firestore: { document: jest.fn(mockDocumentBuilder) },
  })),
};

const mockStripeInstance = {
  transfers: {
    create: jest.fn(),
    list: jest.fn(),
  },
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
const retryHandler = loadedFunctions.retryCourierFailedPayout;
const missingConnectHandler = loadedFunctions.retryCourierMissingConnectPayout;
const adminContext = { auth: { uid: 'admin-1' } };
const eligibleOrder = Object.freeze({
  status: 'delivered',
  deliveryFeeHeld: true,
  courierPayoutStatus: 'failed',
  deliveryDriverId: 'courier-1',
  deliveryFee: 5,
  courierPayoutAmount: 5,
});

const exactActiveTransfer = Object.freeze({
  id: 'tr_exact',
  object: 'transfer',
  amount: 500,
  amount_reversed: 0,
  currency: 'brl',
  destination: 'acct_courier',
  livemode: false,
  reversed: false,
  transfer_group: 'order-1',
  metadata: { role: 'courier', orderId: 'order-1' },
});

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
  mockStripeInstance.transfers.list.mockReset();
  mockStripeInstance.transfers.create.mockResolvedValue({ id: 'tr_local' });
  mockStripeInstance.transfers.list.mockResolvedValue({
    data: [],
    has_more: false,
  });
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

describe('retryCourierFailedPayout', () => {
  beforeEach(resetOperationalSpies);

  test('exports an invocable onCall handler with secret binding', () => {
    expect(typeof retryHandler).toBe('function');
    expect(retryHandler.__localOnCallHandler).toBe(retryHandler);
    expect(mockFunctions.runWith).toHaveBeenCalledWith({
      secrets: ['STRIPE_SECRET_KEY'],
    });
    expect(typeof missingConnectHandler).toBe('function');
  });

  test('rejects unauthenticated context', async () => {
    await expectCode(
      invokeRaw({ orderId: 'order-1' }, undefined),
      'unauthenticated'
    );
    expect(mockStripeInstance.transfers.list).not.toHaveBeenCalled();
  });

  test('rejects authenticated non-admin user', async () => {
    mockDocuments.set('users/customer-1', { role: 'customer' });
    await expectCode(
      invokeRaw({ orderId: 'order-1' }, { auth: { uid: 'customer-1' } }),
      'permission-denied'
    );
  });

  test('rejects absent orderId', async () => {
    await expectCode(invokeRaw({}, adminContext), 'invalid-argument');
  });

  test('rejects caller-supplied amount field', async () => {
    await expectCode(
      invokeRaw({ orderId: 'order-1', amount: 500 }, adminContext),
      'invalid-argument'
    );
  });

  test('returns not-found for missing order', async () => {
    await expectCode(invokeValid(), 'not-found');
  });

  test.each([
    ['status', { status: 'ready' }],
    ['hold', { deliveryFeeHeld: false }],
    ['missing connect status', { courierPayoutStatus: 'missing_connected_account' }],
    ['transfer id', { courierTransferId: 'tr_existing' }],
  ])('rejects incompatible %s', async (_name, override) => {
    setEligibleState(override);
    await expectCode(invokeValid(), 'failed-precondition');
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('rejects missing Connect account', async () => {
    setEligibleState({}, { stripeAccountId: 'invalid' });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects amount zero', async () => {
    setEligibleState({ deliveryFee: 0, courierPayoutAmount: 0 });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('aborts when order reread diverges before reconciliation', async () => {
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder, deliveryFee: 99 },
    ]);
    mockDocuments.set('users/courier-1', { stripeAccountId: 'acct_courier' });
    await expectCode(invokeValid(), 'aborted');
    expect(mockStripeInstance.transfers.list).not.toHaveBeenCalled();
  });

  test('reconciles zero matches then creates exact transfer and paid write', async () => {
    setEligibleState();
    const result = await invokeValid();

    expect(result).toEqual({
      success: true,
      orderId: 'order-1',
      courierTransferId: 'tr_local',
      courierPayoutStatus: 'paid',
      reconciliation: {
        resultCount: 0,
        classification: 'zero_matches_created',
      },
    });
    expect(mockStripeInstance.transfers.list).toHaveBeenCalledWith({
      transfer_group: 'order-1',
      limit: 100,
    });
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledTimes(1);
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledWith(
      {
        amount: 500,
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
    // initial + concurrency reread + pre-create guard
    expect(mockReferences.get('orders/order-1').get).toHaveBeenCalledTimes(3);
  });

  test('does not create when exact active transfer already exists', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValueOnce({
      data: [exactActiveTransfer],
      has_more: false,
    });
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'failed-precondition',
      details: expect.objectContaining({
        classification: 'exact_active_match',
        transferCreated: false,
      }),
    });
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
    expect(mockWrites).toEqual([]);
  });

  test('does not create when divergent transfer exists', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValueOnce({
      data: [
        {
          ...exactActiveTransfer,
          id: 'tr_div',
          amount: 999,
        },
      ],
      has_more: false,
    });
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'failed-precondition',
      details: expect.objectContaining({
        classification: 'divergent_match',
        transferCreated: false,
      }),
    });
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('does not create when reversed transfer exists', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValueOnce({
      data: [
        {
          ...exactActiveTransfer,
          id: 'tr_rev',
          reversed: true,
          amount_reversed: 500,
        },
      ],
      has_more: false,
    });
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'failed-precondition',
      details: expect.objectContaining({
        classification: 'reversed',
      }),
    });
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('does not create when multiple transfers exist', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValueOnce({
      data: [
        exactActiveTransfer,
        { ...exactActiveTransfer, id: 'tr_exact_2' },
      ],
      has_more: false,
    });
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'failed-precondition',
      details: expect.objectContaining({
        classification: 'multiple_matches',
        resultCount: 2,
      }),
    });
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('aborts when transfer list pagination is incomplete', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockImplementation(async params => {
      const pageIndex = params.starting_after ? 2 : 1;
      return {
        data: [
          {
            ...exactActiveTransfer,
            id: `tr_page_${pageIndex}`,
            amount: 1,
            metadata: { role: 'other', orderId: 'order-1' },
          },
        ],
        has_more: true,
      };
    });
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'aborted',
      details: expect.objectContaining({
        phase: 'transfer_group_list',
        transferCreated: false,
      }),
    });
    expect(mockStripeInstance.transfers.list.mock.calls.length).toBe(10);
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('surfaces list failure without create', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockRejectedValueOnce(
      new Error('list unavailable')
    );
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'unavailable',
      details: expect.objectContaining({
        phase: 'transfer_group_list',
        transferCreated: false,
      }),
    });
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('sanitizes Stripe create failure without failed write', async () => {
    setEligibleState();
    mockStripeInstance.transfers.create.mockRejectedValueOnce(
      new Error('raw Stripe account detail')
    );
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'internal',
      message: 'Courier payout recovery failed before paid write.',
      details: expect.objectContaining({
        phase: 'transfer_create',
        transferCreated: false,
      }),
    });
    expect(mockWrites).toEqual([]);
  });

  test('marks ambiguous create without failed write and without immediate create retry', async () => {
    setEligibleState();
    const ambiguous = new Error('timeout');
    ambiguous.type = 'StripeConnectionError';
    mockStripeInstance.transfers.create.mockRejectedValueOnce(ambiguous);
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'unavailable',
      details: expect.objectContaining({
        phase: 'transfer_create_ambiguous',
        transferCreated: 'unknown',
      }),
    });
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledTimes(1);
    expect(mockWrites).toEqual([]);
  });

  test('distinguishes paid-write failure after transfer create without failed write', async () => {
    setEligibleState();
    mockUpdateErrorPaths.add('orders/order-1');
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'internal',
      message: 'Courier payout recovery paid write failed after transfer create.',
      details: expect.objectContaining({
        phase: 'paid_write',
        transferCreated: true,
        transferIdLast4: 'ocal',
      }),
    });
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledTimes(1);
    expect(mockWrites).toEqual([]);
  });

  test('aborts pre-create when payout status leaves failed after reconciliation', async () => {
    setEligibleState();
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder },
      { ...eligibleOrder, courierPayoutStatus: 'paid', courierTransferId: 'tr_other' },
    ]);
    mockDocuments.set('users/courier-1', { stripeAccountId: 'acct_courier' });
    await expectCode(invokeValid(), 'aborted');
    expect(mockStripeInstance.transfers.list).toHaveBeenCalledTimes(1);
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });
});
