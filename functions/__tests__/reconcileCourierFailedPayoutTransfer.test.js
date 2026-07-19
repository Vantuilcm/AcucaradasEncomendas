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
    reverse: jest.fn(),
    update: jest.fn(),
    retrieve: jest.fn(),
  },
  paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
  customers: { create: jest.fn() },
  setupIntents: { create: jest.fn() },
  ephemeralKeys: { create: jest.fn() },
  accounts: { create: jest.fn(), retrieve: jest.fn(), update: jest.fn() },
  accountLinks: { create: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
};
const mockStripeConstructor = jest.fn(() => mockStripeInstance);

jest.mock('firebase-functions/v1', () => mockFunctions, { virtual: true });
jest.mock('firebase-admin', () => mockAdmin, { virtual: true });
jest.mock('stripe', () => mockStripeConstructor, { virtual: true });

const loadedFunctions = require('../index.js');
const reconcileHandler = loadedFunctions.reconcileCourierFailedPayoutTransfer;
const retryFailedHandler = loadedFunctions.retryCourierFailedPayout;
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
  id: 'tr_exact_abcd',
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

const invokeRaw = (data, context) => reconcileHandler(data, context);
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
  mockStripeInstance.transfers.reverse.mockReset();
  mockStripeInstance.transfers.update.mockReset();
  mockStripeInstance.transfers.retrieve.mockReset();
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

function assertNoSensitiveLeak(value) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain('acct_courier');
  expect(serialized).not.toContain('tr_exact_abcd');
  expect(serialized).not.toContain('sk_');
  expect(serialized).not.toContain('local-placeholder');
}

describe('reconcileCourierFailedPayoutTransfer', () => {
  beforeEach(resetOperationalSpies);

  test('exports an invocable onCall handler', () => {
    expect(typeof reconcileHandler).toBe('function');
    expect(reconcileHandler.__localOnCallHandler).toBe(reconcileHandler);
  });

  test('binds STRIPE_SECRET_KEY via runWith', () => {
    expect(mockFunctions.runWith).toHaveBeenCalledWith({
      secrets: ['STRIPE_SECRET_KEY'],
    });
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

  test('rejects empty orderId', async () => {
    await expectCode(invokeRaw({ orderId: '   ' }, adminContext), 'invalid-argument');
  });

  test('rejects caller-supplied amount field', async () => {
    await expectCode(
      invokeRaw({ orderId: 'order-1', amount: 500 }, adminContext),
      'invalid-argument'
    );
  });

  test('rejects caller-supplied destination field', async () => {
    await expectCode(
      invokeRaw({ orderId: 'order-1', destination: 'acct_x' }, adminContext),
      'invalid-argument'
    );
  });

  test('rejects caller-supplied repair field', async () => {
    await expectCode(
      invokeRaw({ orderId: 'order-1', repair: true }, adminContext),
      'invalid-argument'
    );
  });

  test('returns not-found for missing order', async () => {
    await expectCode(invokeValid(), 'not-found');
  });

  test('rejects status different from delivered', async () => {
    setEligibleState({ status: 'ready' });
    await expectCode(invokeValid(), 'failed-precondition');
    expect(mockStripeInstance.transfers.list).not.toHaveBeenCalled();
  });

  test('rejects deliveryFeeHeld false', async () => {
    setEligibleState({ deliveryFeeHeld: false });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects payoutStatus different from failed', async () => {
    setEligibleState({ courierPayoutStatus: 'paid' });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects missing_connected_account status', async () => {
    setEligibleState({ courierPayoutStatus: 'missing_connected_account' });
    await expectCode(invokeValid(), 'failed-precondition');
    expect(mockStripeInstance.transfers.list).not.toHaveBeenCalled();
  });

  test('rejects when courierTransferId already present', async () => {
    setEligibleState({ courierTransferId: 'tr_existing' });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects when courier identity is unavailable', async () => {
    setEligibleState({ deliveryDriverId: '', courierId: '' });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects amount zero', async () => {
    setEligibleState({ deliveryFee: 0, courierPayoutAmount: 0 });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects invalid negative amount', async () => {
    setEligibleState({ deliveryFee: -1, courierPayoutAmount: -1 });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects missing courier user document', async () => {
    mockDocuments.set('orders/order-1', { ...eligibleOrder });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects missing stripeAccountId', async () => {
    setEligibleState({}, { stripeAccountId: undefined });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('rejects invalid stripeAccountId', async () => {
    setEligibleState({}, { stripeAccountId: 'not_an_account' });
    await expectCode(invokeValid(), 'failed-precondition');
  });

  test('returns zero_matches without authorizing create or repair', async () => {
    setEligibleState();
    const result = await invokeValid();
    expect(result).toEqual({
      success: true,
      orderId: 'order-1',
      reconciliation: {
        classification: 'zero_matches',
        resultCount: 0,
        exactActiveCount: 0,
        complete: true,
        manualReviewRequired: true,
        safeToCreateTransfer: false,
        safeToRepairFirestore: false,
      },
    });
    expect(result.reconciliation.safeToCreateTransfer).toBe(false);
  });

  test('zero matches keeps safeToCreateTransfer false', async () => {
    setEligibleState();
    const result = await invokeValid();
    expect(result.reconciliation.safeToCreateTransfer).toBe(false);
    expect(result.reconciliation.safeToRepairFirestore).toBe(false);
  });

  test('returns exact_active_match without authorizing repair', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [exactActiveTransfer],
      has_more: false,
    });
    const result = await invokeValid();
    expect(result.reconciliation.classification).toBe('exact_active_match');
    expect(result.reconciliation.resultCount).toBe(1);
    expect(result.reconciliation.exactActiveCount).toBe(1);
    expect(result.reconciliation.safeToRepairFirestore).toBe(false);
    expect(result.reconciliation.safeToCreateTransfer).toBe(false);
    expect(result.transferIdLast4).toBe('abcd');
  });

  test('exact match keeps safeToRepairFirestore false', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [exactActiveTransfer],
      has_more: false,
    });
    const result = await invokeValid();
    expect(result.reconciliation.safeToRepairFirestore).toBe(false);
  });

  test('classifies divergent amount', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [{ ...exactActiveTransfer, amount: 999 }],
      has_more: false,
    });
    const result = await invokeValid();
    expect(result.reconciliation.classification).toBe('divergent_match');
    expect(result.reconciliation.manualReviewRequired).toBe(true);
    expect(result.reconciliation.safeToCreateTransfer).toBe(false);
  });

  test('classifies divergent destination', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [{ ...exactActiveTransfer, destination: 'acct_other' }],
      has_more: false,
    });
    const result = await invokeValid();
    expect(result.reconciliation.classification).toBe('divergent_match');
  });

  test('classifies divergent metadata', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [{
        ...exactActiveTransfer,
        metadata: { role: 'producer', orderId: 'order-1' },
      }],
      has_more: false,
    });
    const result = await invokeValid();
    expect(result.reconciliation.classification).toBe('divergent_match');
  });

  test('classifies live mode anomaly', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [{ ...exactActiveTransfer, livemode: true }],
      has_more: false,
    });
    const result = await invokeValid();
    expect(result.reconciliation.classification).toBe('live_mode_anomaly');
    expect(result.reconciliation.manualReviewRequired).toBe(true);
  });

  test('classifies reversed match', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [{
        ...exactActiveTransfer,
        reversed: true,
        amount_reversed: 500,
      }],
      has_more: false,
    });
    const result = await invokeValid();
    expect(result.reconciliation.classification).toBe('reversed');
    expect(result.reconciliation.manualReviewRequired).toBe(true);
  });

  test('classifies partially reversed match', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [{
        ...exactActiveTransfer,
        reversed: true,
        amount_reversed: 100,
      }],
      has_more: false,
    });
    const result = await invokeValid();
    expect(result.reconciliation.classification).toBe('partially_reversed');
  });

  test('classifies multiple matches as critical', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [
        exactActiveTransfer,
        { ...exactActiveTransfer, id: 'tr_second_wxyz' },
      ],
      has_more: false,
    });
    const result = await invokeValid();
    expect(result.reconciliation.classification).toBe('multiple_matches');
    expect(result.reconciliation.resultCount).toBe(2);
    expect(result.reconciliation.manualReviewRequired).toBe(true);
    expect(result.transferIdLast4).toBeUndefined();
  });

  test('paginates across more than one page', async () => {
    setEligibleState();
    const pageOne = Array.from({ length: 100 }, (_v, i) => ({
      ...exactActiveTransfer,
      id: `tr_page1_${String(i).padStart(3, '0')}`,
      amount: 1,
    }));
    mockStripeInstance.transfers.list
      .mockResolvedValueOnce({ data: pageOne, has_more: true })
      .mockResolvedValueOnce({
        data: [{ ...exactActiveTransfer, amount: 1, id: 'tr_page2_only' }],
        has_more: false,
      });
    const result = await invokeValid();
    expect(mockStripeInstance.transfers.list).toHaveBeenCalledTimes(2);
    expect(mockStripeInstance.transfers.list.mock.calls[1][0]).toEqual({
      transfer_group: 'order-1',
      limit: 100,
      starting_after: 'tr_page1_099',
    });
    expect(result.reconciliation.resultCount).toBe(101);
    expect(result.reconciliation.classification).toBe('multiple_matches');
  });

  test('aborts on incomplete pagination', async () => {
    setEligibleState();
    const pages = Array.from({ length: 10 }, (_v, page) =>
      Array.from({ length: 100 }, (_x, i) => ({
        ...exactActiveTransfer,
        id: `tr_p${page}_${String(i).padStart(3, '0')}`,
        amount: 1,
      }))
    );
    pages.forEach((data, index) => {
      mockStripeInstance.transfers.list.mockResolvedValueOnce({
        data,
        has_more: index < 9 ? true : true,
      });
    });
    await expect(
      invokeValid()
    ).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'aborted',
      details: expect.objectContaining({
        phase: 'transfer_group_incomplete',
        classification: 'incomplete_results',
        firestoreWritten: false,
      }),
    });
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('surfaces transfers.list failure without writes or creates', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockRejectedValue(new Error('list failed'));
    await expect(
      invokeValid()
    ).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'unavailable',
      details: expect.objectContaining({
        phase: 'transfer_group_list',
        firestoreWritten: false,
      }),
    });
    expect(mockWrites).toEqual([]);
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('aborts on order payout status drift after listing', async () => {
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder, courierPayoutStatus: 'paid', courierTransferId: 'tr_x' },
    ]);
    mockDocuments.set('users/courier-1', { stripeAccountId: 'acct_courier' });
    await expect(
      invokeValid()
    ).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'aborted',
      details: expect.objectContaining({
        phase: 'post_reconciliation_guard',
        classification: 'state_drift',
        transferCreated: 'unknown',
        firestoreWritten: false,
      }),
    });
  });

  test('aborts on courierId drift after listing', async () => {
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder, deliveryDriverId: 'courier-2' },
    ]);
    mockDocuments.set('users/courier-1', { stripeAccountId: 'acct_courier' });
    mockDocuments.set('users/courier-2', { stripeAccountId: 'acct_courier' });
    await expectCode(invokeValid(), 'aborted');
  });

  test('aborts on amount drift after listing', async () => {
    mockReadSequences.set('orders/order-1', [
      { ...eligibleOrder },
      { ...eligibleOrder, deliveryFee: 9, courierPayoutAmount: 9 },
    ]);
    mockDocuments.set('users/courier-1', { stripeAccountId: 'acct_courier' });
    await expect(
      invokeValid()
    ).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'aborted',
      details: expect.objectContaining({
        phase: 'post_reconciliation_guard',
        classification: 'state_drift',
      }),
    });
  });

  test('aborts on stripeAccountId drift after listing', async () => {
    mockDocuments.set('orders/order-1', { ...eligibleOrder });
    mockReadSequences.set('users/courier-1', [
      { stripeAccountId: 'acct_courier' },
      { stripeAccountId: 'acct_drifted' },
    ]);
    await expect(
      invokeValid()
    ).rejects.toMatchObject({
      name: 'HttpsError',
      code: 'aborted',
      details: expect.objectContaining({
        phase: 'post_reconciliation_guard',
        classification: 'state_drift',
      }),
    });
  });

  test('never calls transfers.create', async () => {
    setEligibleState();
    await invokeValid();
    expect(mockStripeInstance.transfers.create).not.toHaveBeenCalled();
  });

  test('never calls transfers.reverse', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [exactActiveTransfer],
      has_more: false,
    });
    await invokeValid();
    expect(mockStripeInstance.transfers.reverse).not.toHaveBeenCalled();
  });

  test('never writes Firestore', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [exactActiveTransfer],
      has_more: false,
    });
    await invokeValid();
    expect(mockWrites).toEqual([]);
  });

  test('does not expose full transfer id or destination', async () => {
    setEligibleState();
    mockStripeInstance.transfers.list.mockResolvedValue({
      data: [exactActiveTransfer],
      has_more: false,
    });
    const result = await invokeValid();
    assertNoSensitiveLeak(result);
    expect(result.transferIdLast4).toBe('abcd');
    expect(JSON.stringify(result)).not.toContain('acct_');
  });

  test('returns only sanitized reconciliation fields', async () => {
    setEligibleState();
    const result = await invokeValid();
    expect(Object.keys(result).sort()).toEqual(['orderId', 'reconciliation', 'success']);
    expect(Object.keys(result.reconciliation).sort()).toEqual([
      'classification',
      'complete',
      'exactActiveCount',
      'manualReviewRequired',
      'resultCount',
      'safeToCreateTransfer',
      'safeToRepairFirestore',
    ]);
  });

  test('filters Stripe list only by transfer_group', async () => {
    setEligibleState();
    await invokeValid();
    expect(mockStripeInstance.transfers.list).toHaveBeenCalledWith({
      transfer_group: 'order-1',
      limit: 100,
    });
    const call = mockStripeInstance.transfers.list.mock.calls[0][0];
    expect(call.destination).toBeUndefined();
    expect(call.metadata).toBeUndefined();
  });

  test('preserves sibling recovery callables as exports', () => {
    expect(typeof retryFailedHandler).toBe('function');
    expect(typeof missingConnectHandler).toBe('function');
  });
});
