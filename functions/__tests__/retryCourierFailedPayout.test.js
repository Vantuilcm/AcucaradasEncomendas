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
  paymentIntentId: 'pi_order_1',
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
  mockStripeInstance.paymentIntents.retrieve.mockReset();
  mockStripeInstance.transfers.create.mockResolvedValue({ id: 'tr_local' });
  mockStripeInstance.transfers.list.mockResolvedValue({
    data: [],
    has_more: false,
  });
  mockStripeInstance.paymentIntents.retrieve.mockResolvedValue({
    latest_charge: 'ch_latest_1',
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
        source_transaction: 'ch_latest_1',
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
    expect(mockReferences.get('users/courier-1').get).toHaveBeenCalledTimes(3);
  });

  test('rejects missing paymentIntentId before transfer create', async () => {
    setEligibleState({ paymentIntentId: null });
    await expectCode(invokeValid(), 'failed-precondition');
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
    expect(mockStripeInstance.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  test('uses latest_charge string as source_transaction', async () => {
    setEligibleState();
    mockStripeInstance.paymentIntents.retrieve.mockResolvedValueOnce({
      latest_charge: 'ch_string_1',
    });
    const result = await invokeValid();
    expect(result.courierPayoutStatus).toBe('paid');
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({ source_transaction: 'ch_string_1' }),
      { idempotencyKey: 'courier_delivery_payout_order-1' }
    );
  });

  test('uses latest_charge object.id as source_transaction', async () => {
    setEligibleState();
    mockStripeInstance.paymentIntents.retrieve.mockResolvedValueOnce({
      latest_charge: { id: 'ch_object_1' },
    });
    const result = await invokeValid();
    expect(result.courierPayoutStatus).toBe('paid');
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({ source_transaction: 'ch_object_1' }),
      { idempotencyKey: 'courier_delivery_payout_order-1' }
    );
  });

  test('rejects missing latest_charge before transfer create', async () => {
    setEligibleState();
    mockStripeInstance.paymentIntents.retrieve.mockResolvedValueOnce({
      latest_charge: null,
    });
    await expectCode(invokeValid(), 'failed-precondition');
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('keeps destination stable through final courier reread before create', async () => {
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder },
      { ...eligibleOrder },
    ]);
    mockReadSequences.set('users/courier-1', [
      { stripeAccountId: 'acct_courier' },
      { stripeAccountId: 'acct_courier' },
      { stripeAccountId: 'acct_courier' },
    ]);
    const result = await invokeValid();
    expect(result.courierPayoutStatus).toBe('paid');
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledTimes(1);
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'acct_courier',
        source_transaction: 'ch_latest_1',
      }),
      expect.any(Object)
    );
    expect(mockWrites).toHaveLength(1);
    expect(mockReferences.get('users/courier-1').get).toHaveBeenCalledTimes(3);
  });

  test('aborts when stripeAccountId changes after reconciliation', async () => {
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder },
      { ...eligibleOrder },
    ]);
    mockReadSequences.set('users/courier-1', [
      { stripeAccountId: 'acct_courier' },
      { stripeAccountId: 'acct_courier' },
      { stripeAccountId: 'acct_replaced' },
    ]);
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'aborted',
      details: expect.objectContaining({
        phase: 'pre_create_guard',
        transferCreated: false,
        classification: 'destination_drift',
      }),
    });
    expect(mockStripeInstance.transfers.list).toHaveBeenCalledTimes(1);
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
    expect(mockWrites).toEqual([]);
  });

  test('aborts when stripeAccountId is removed after reconciliation', async () => {
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder },
      { ...eligibleOrder },
    ]);
    mockReadSequences.set('users/courier-1', [
      { stripeAccountId: 'acct_courier' },
      { stripeAccountId: 'acct_courier' },
      {},
    ]);
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'aborted',
      details: expect.objectContaining({
        phase: 'pre_create_guard',
        transferCreated: false,
        classification: 'destination_drift',
      }),
    });
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
    expect(mockWrites).toEqual([]);
  });

  test('aborts when stripeAccountId becomes invalid after reconciliation', async () => {
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder },
      { ...eligibleOrder },
    ]);
    mockReadSequences.set('users/courier-1', [
      { stripeAccountId: 'acct_courier' },
      { stripeAccountId: 'acct_courier' },
      { stripeAccountId: 'not_an_account' },
    ]);
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'aborted',
      details: expect.objectContaining({
        phase: 'pre_create_guard',
        transferCreated: false,
        classification: 'destination_drift',
      }),
    });
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
    expect(mockWrites).toEqual([]);
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

  test('marks idempotency_key_in_use via error.code as ambiguous without retry or write', async () => {
    setEligibleState();
    const err = new Error('idempotency key in use');
    err.code = 'idempotency_key_in_use';
    mockStripeInstance.transfers.create.mockRejectedValueOnce(err);
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

  test('marks idempotency_key_in_use via error.raw.code as ambiguous without retry or write', async () => {
    setEligibleState();
    const err = new Error('idempotency key in use');
    err.raw = { code: 'idempotency_key_in_use' };
    mockStripeInstance.transfers.create.mockRejectedValueOnce(err);
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

  test('marks StripeAPIError 409 with exact idempotency_key_in_use code as ambiguous', async () => {
    setEligibleState();
    const err = new Error('Keys for idempotent requests can only be used while in flight');
    err.type = 'StripeAPIError';
    err.rawType = 'idempotency_error';
    err.code = 'idempotency_key_in_use';
    err.statusCode = 409;
    mockStripeInstance.transfers.create.mockRejectedValueOnce(err);
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

  test('does not treat generic HTTP 409 without idempotency_key_in_use as ambiguous', async () => {
    setEligibleState();
    const err = new Error('conflict');
    err.statusCode = 409;
    mockStripeInstance.transfers.create.mockRejectedValueOnce(err);
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'internal',
      details: expect.objectContaining({
        phase: 'transfer_create',
        transferCreated: false,
      }),
    });
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledTimes(1);
    expect(mockWrites).toEqual([]);
  });

  test('does not treat StripeIdempotencyError parameter mismatch as idempotency_key_in_use ambiguous', async () => {
    setEligibleState();
    const err = new Error('Keys for idempotent requests can only be used with the same parameters');
    err.type = 'StripeIdempotencyError';
    err.rawType = 'idempotency_error';
    err.statusCode = 400;
    mockStripeInstance.transfers.create.mockRejectedValueOnce(err);
    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'internal',
      details: expect.objectContaining({
        phase: 'transfer_create',
        transferCreated: false,
      }),
    });
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledTimes(1);
    expect(mockWrites).toEqual([]);
  });

  test('keeps existing ambiguous classifications for connection, 429, 5xx and timeouts', async () => {
    const cases = [
      (() => {
        const e = new Error('conn');
        e.type = 'StripeConnectionError';
        return e;
      })(),
      (() => {
        const e = new Error('rate');
        e.statusCode = 429;
        return e;
      })(),
      (() => {
        const e = new Error('api');
        e.type = 'StripeAPIError';
        e.statusCode = 503;
        return e;
      })(),
      (() => {
        const e = new Error('timeout');
        e.code = 'ETIMEDOUT';
        return e;
      })(),
      (() => {
        const e = new Error('reset');
        e.code = 'ECONNRESET';
        return e;
      })(),
    ];

    for (const err of cases) {
      setEligibleState();
      mockStripeInstance.transfers.create.mockRejectedValueOnce(err);
      await expect(invokeValid()).rejects.toMatchObject({
        name: 'HttpsError',
        code: 'unavailable',
        details: expect.objectContaining({
          phase: 'transfer_create_ambiguous',
          transferCreated: 'unknown',
        }),
      });
      expect(mockWrites).toEqual([]);
    }
    expect(mockStripeInstance.transfers.create).toHaveBeenCalledTimes(cases.length);
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

  test('logs sanitized metadata for non-ambiguous Stripe create failure', async () => {
    setEligibleState();
    const err = new Error(
      'Insufficient funds for acct_ABCDEF123 destination tr_XYZabc pi_123 ch_456 req_789token sk_test_SECRETVALUE'
    );
    err.type = 'StripeInvalidRequestError';
    err.code = 'balance_insufficient';
    err.decline_code = 'generic_decline';
    err.param = 'amount';
    err.requestId = 'req_abcdefghijKLMN';
    err.statusCode = 400;
    mockStripeInstance.transfers.create.mockRejectedValueOnce(err);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'internal',
      message: 'Courier payout recovery failed before paid write.',
      details: expect.objectContaining({
        phase: 'transfer_create',
        transferCreated: false,
      }),
    });

    const createErrorCalls = errorSpy.mock.calls.filter(
      call => call[0] === '[COURIER_PAYOUT_RETRY_TRANSFER_CREATE_ERROR]'
    );
    expect(createErrorCalls).toHaveLength(1);
    const payload = createErrorCalls[0][1];
    expect(payload).toEqual(
      expect.objectContaining({
        phase: 'transfer_create',
        orderIdHashPrefix: expect.stringMatching(/^[a-f0-9]{12}$/),
        errorType: 'StripeInvalidRequestError',
        errorCode: 'balance_insufficient',
        declineCode: 'generic_decline',
        errorParam: 'amount',
        stripeRequestIdLast4: 'KLMN',
        httpStatusCode: 400,
        ambiguousClassification: false,
      })
    );
    expect(payload.message).toContain('acct_[REDACTED]');
    expect(payload.message).toContain('tr_[REDACTED]');
    expect(payload.message).toContain('pi_[REDACTED]');
    expect(payload.message).toContain('ch_[REDACTED]');
    expect(payload.message).toContain('req_[REDACTED]');
    expect(payload.message).toContain('[REDACTED_SECRET]');
    expect(payload.message).not.toMatch(/acct_ABCDEF123|tr_XYZabc|sk_test_SECRETVALUE/);
    expect(payload.message.length).toBeLessThanOrEqual(300);
    expect(payload).not.toHaveProperty('stack');
    expect(JSON.stringify(createErrorCalls[0])).not.toContain('sk_test_SECRETVALUE');
    expect(mockWrites).toEqual([]);
    errorSpy.mockRestore();
  });

  test('logs sanitized metadata for ambiguous Stripe create failure', async () => {
    setEligibleState();
    const ambiguous = new Error('timeout');
    ambiguous.type = 'StripeConnectionError';
    mockStripeInstance.transfers.create.mockRejectedValueOnce(ambiguous);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'unavailable',
      details: expect.objectContaining({
        phase: 'transfer_create_ambiguous',
        transferCreated: 'unknown',
      }),
    });

    const createErrorCalls = errorSpy.mock.calls.filter(
      call => call[0] === '[COURIER_PAYOUT_RETRY_TRANSFER_CREATE_ERROR]'
    );
    expect(createErrorCalls).toHaveLength(1);
    expect(createErrorCalls[0][1]).toEqual(
      expect.objectContaining({
        phase: 'transfer_create',
        ambiguousClassification: true,
        errorType: 'StripeConnectionError',
      })
    );
    expect(mockWrites).toEqual([]);
    errorSpy.mockRestore();
  });

  test('sanitizes long Stripe create error messages and never logs raw error object', async () => {
    setEligibleState();
    const longCore =
      'x'.repeat(320) +
      ' acct_SHOULDHIDE tr_SHOULDHIDE pi_SHOULDHIDE ch_SHOULDHIDE req_SHOULDHIDE sk_live_SHOULDHIDE';
    const err = new Error(longCore);
    err.type = 'StripeCardError';
    err.code = 'card_declined';
    err.requestId = 'req_ZZZZ';
    mockStripeInstance.transfers.create.mockRejectedValueOnce(err);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invokeValid()).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'internal',
    });

    const createErrorCalls = errorSpy.mock.calls.filter(
      call => call[0] === '[COURIER_PAYOUT_RETRY_TRANSFER_CREATE_ERROR]'
    );
    expect(createErrorCalls).toHaveLength(1);
    const payload = createErrorCalls[0][1];
    expect(payload.message.length).toBe(300);
    expect(payload.message).not.toContain('\n');
    expect(payload.stripeRequestIdLast4).toBe('ZZZZ');
    expect(createErrorCalls[0].length).toBe(2);
    expect(createErrorCalls[0][1]).not.toBe(err);
    expect(payload.stack).toBeUndefined();
    expect(JSON.stringify(payload)).not.toMatch(
      /acct_SHOULDHIDE|tr_SHOULDHIDE|sk_live_SHOULDHIDE/
    );
    expect(mockWrites).toEqual([]);
    errorSpy.mockRestore();
  });
});
