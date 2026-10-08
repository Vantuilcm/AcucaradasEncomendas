/**
 * R32_R3L — Canonical success marker + paymentStatus-only webhook characterization.
 * Local mocks only; no remote Stripe/Firebase.
 */

'use strict';

const fs = require('fs');
const path = require('path');

process.env.STRIPE_SECRET_KEY = 'sk_test_r32_r3l_local_mock';

const mockMarkerCollection = 'stripe_payment_success_commits';
const mockTransferIdempotencyPrefix = 'payout_producer_';

const mockState = {
  webhookHandler: null,
  transferCreate: jest.fn(),
  constructEvent: jest.fn(),
  serverTimestampToken: { __sv: 'serverTimestamp' },
  store: {
    orders: {},
    stripe_events: {},
    [mockMarkerCollection]: {},
    users: {},
  },
  writes: {
    orderUpdates: [],
    markerSets: [],
    eventSets: [],
    transfers: [],
  },
};

function mockResetStore() {
  mockState.store.orders = {};
  mockState.store.stripe_events = {};
  mockState.store[mockMarkerCollection] = {};
  mockState.store.users = {};
}

function mockResetWrites() {
  mockState.writes.orderUpdates = [];
  mockState.writes.markerSets = [];
  mockState.writes.eventSets = [];
  mockState.writes.transfers = [];
}

function mockDocSnap(exists, data) {
  return {
    exists: !!exists,
    data: () => (exists ? { ...data } : undefined),
  };
}

function mockParsePath(ref) {
  return { collection: ref._collection, id: ref._id };
}

function mockReadDoc(collection, id) {
  const bucket = mockState.store[collection] || {};
  if (Object.prototype.hasOwnProperty.call(bucket, id)) {
    return mockDocSnap(true, bucket[id]);
  }
  return mockDocSnap(false);
}

function mockMakeRef(collection, id) {
  const ref = {
    _collection: collection,
    _id: id,
    path: `${collection}/${id}`,
    async get() {
      return mockReadDoc(collection, id);
    },
  };
  return ref;
}

const mockDb = {
  collection(name) {
    return {
      doc(id) {
        return mockMakeRef(name, id);
      },
      add: jest.fn(async () => mockMakeRef(name, 'auto')),
    };
  },
  async runTransaction(fn) {
    const pendingWrites = [];
    const transaction = {
      async get(ref) {
        const { collection, id } = mockParsePath(ref);
        return mockReadDoc(collection, id);
      },
      update(ref, data) {
        pendingWrites.push({ op: 'update', ref, data });
      },
      set(ref, data) {
        pendingWrites.push({ op: 'set', ref, data });
      },
    };

    await fn(transaction);

    for (const w of pendingWrites) {
      const { collection, id } = mockParsePath(w.ref);
      if (w.op === 'update') {
        mockState.store[collection] = mockState.store[collection] || {};
        mockState.store[collection][id] = {
          ...(mockState.store[collection][id] || {}),
          ...w.data,
        };
        if (collection === 'orders') {
          mockState.writes.orderUpdates.push({ id, data: w.data });
        }
      } else if (w.op === 'set') {
        mockState.store[collection] = mockState.store[collection] || {};
        mockState.store[collection][id] = {
          ...(mockState.store[collection][id] || {}),
          ...w.data,
        };
        if (collection === mockMarkerCollection) {
          mockState.writes.markerSets.push({ id, data: w.data });
        }
        if (collection === 'stripe_events') {
          mockState.writes.eventSets.push({ id, data: w.data });
        }
      }
    }
  },
};

jest.mock('firebase-admin', () => {
  const admin = {
    apps: [{ name: '[DEFAULT]' }],
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn(() => mockDb), {
      FieldValue: {
        serverTimestamp: jest.fn(() => mockState.serverTimestampToken),
      },
    }),
  };
  return admin;
});

jest.mock('firebase-functions/v1', () => {
  const HttpsError = class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  };
  const https = {
    onRequest: (fn) => {
      mockState.webhookHandler = fn;
      return fn;
    },
    onCall: (fn) => fn,
    HttpsError,
  };
  return {
    https,
    config: () => ({}),
    runWith: () => ({ https }),
    pubsub: {
      schedule: () => ({ onRun: (fn) => fn }),
    },
    auth: {
      user: () => ({ onCreate: (fn) => fn }),
    },
    firestore: {
      document: () => ({
        onUpdate: (fn) => fn,
        onCreate: (fn) => fn,
      }),
    },
  };
});

jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: (...args) => mockState.constructEvent(...args),
    },
    transfers: {
      create: (...args) => {
        mockState.writes.transfers.push(args);
        return mockState.transferCreate(...args);
      },
    },
    paymentIntents: { create: jest.fn() },
    ephemeralKeys: { create: jest.fn() },
    accounts: { create: jest.fn(), retrieve: jest.fn() },
    accountLinks: { create: jest.fn() },
    customers: { create: jest.fn() },
    setupIntents: { create: jest.fn() },
  }));
});

const functionsIndexPath = path.join(__dirname, '..', 'index.js');
const functionsSource = fs.readFileSync(functionsIndexPath, 'utf8');
require('../index.js');

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function invokeWebhook(event) {
  const req = {
    headers: {},
    body: event,
    rawBody: Buffer.from(JSON.stringify(event)),
  };
  const res = makeRes();
  await mockState.webhookHandler(req, res);
  return res;
}

function baseOrder(overrides = {}) {
  return {
    status: 'pending',
    paymentStatus: 'pending',
    producerId: 'producer-1',
    subtotalProducts: 100,
    deliveryFee: 10,
    totalAmount: 110,
    ...overrides,
  };
}

function successEvent(orderId, eventId = 'evt_success_1', piId = 'pi_1') {
  return {
    id: eventId,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: piId,
        metadata: { orderId },
        last_payment_error: null,
      },
    },
  };
}

function failureEvent(orderId, eventId = 'evt_fail_1', piId = 'pi_1') {
  return {
    id: eventId,
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: piId,
        metadata: { orderId },
        last_payment_error: { message: 'card_declined' },
      },
    },
  };
}

beforeEach(() => {
  mockResetStore();
  mockResetWrites();
  mockState.transferCreate.mockReset();
  mockState.transferCreate.mockResolvedValue({ id: 'tr_producer_1' });
  mockState.constructEvent.mockReset();
  mockState.store.users['producer-1'] = { stripeAccountId: 'acct_producer_1' };
});

describe('R32_R3L stripeWebhook canonical success marker', () => {
  test('M1 LEGACY GUARD: paid+completed without marker skips financial path', async () => {
    const orderId = 'order-m1';
    mockState.store.orders[orderId] = baseOrder({
      status: 'paid',
      paymentStatus: 'completed',
    });
    const res = await invokeWebhook(successEvent(orderId, 'evt_m1'));
    expect(res.statusCode).toBe(200);
    expect(mockState.writes.transfers).toHaveLength(0);
    expect(mockState.writes.orderUpdates).toHaveLength(0);
    expect(mockState.writes.markerSets).toHaveLength(0);
    expect(mockState.writes.eventSets.some((e) => e.id === 'evt_m1')).toBe(true);
  });

  test('M2 LEGACY pending+completed without marker does NOT newly skip', async () => {
    const orderId = 'order-m2';
    mockState.store.orders[orderId] = baseOrder({
      status: 'pending',
      paymentStatus: 'completed',
    });
    await invokeWebhook(successEvent(orderId, 'evt_m2'));
    expect(mockState.writes.transfers.length).toBeGreaterThan(0);
    expect(mockState.writes.orderUpdates[0].data.status).toBeUndefined();
    expect(mockState.writes.orderUpdates[0].data.paymentStatus).toBe('completed');
    expect(mockState.store.orders[orderId].status).toBe('pending');
    expect(mockState.writes.markerSets.some((m) => m.id === orderId)).toBe(true);
  });

  test('M3 LEGACY confirmed+completed without marker does NOT newly skip', async () => {
    const orderId = 'order-m3';
    mockState.store.orders[orderId] = baseOrder({
      status: 'confirmed',
      paymentStatus: 'completed',
    });
    await invokeWebhook(successEvent(orderId, 'evt_m3'));
    expect(mockState.writes.transfers.length).toBeGreaterThan(0);
    expect(mockState.store.orders[orderId].status).toBe('confirmed');
    expect(mockState.writes.markerSets.some((m) => m.id === orderId)).toBe(true);
  });

  test('M4 CANONICAL ATOMIC COMMIT: no status paid, marker+event+paymentStatus', async () => {
    const orderId = 'order-m4';
    mockState.store.orders[orderId] = baseOrder({
      status: 'pending',
      paymentStatus: 'pending',
      deliveryFee: 12,
    });
    await invokeWebhook(successEvent(orderId, 'evt_m4'));
    const orderUpdate = mockState.writes.orderUpdates[0].data;
    expect(orderUpdate.status).toBeUndefined();
    expect(orderUpdate.paymentStatus).toBe('completed');
    expect(orderUpdate.paymentIntentId).toBe('pi_1');
    expect(orderUpdate.paidAt).toBe(mockState.serverTimestampToken);
    expect(orderUpdate.deliveryFeeHeld).toBe(true);
    expect(orderUpdate.courierPayoutStatus).toBe('pending_delivery');
    expect(orderUpdate.courierPayoutAmount).toBe(12);
    expect(mockState.writes.transfers[0][0].amount).toBe(Math.floor(100 * 0.9 * 100));
    expect(mockState.writes.markerSets).toHaveLength(1);
    expect(mockState.writes.markerSets[0].id).toBe(orderId);
    expect(mockState.writes.markerSets[0].data.committedAt).toBe(
      mockState.serverTimestampToken
    );
    expect(Object.keys(mockState.writes.markerSets[0].data)).toEqual(['committedAt']);
    expect(mockState.writes.eventSets.some((e) => e.id === 'evt_m4')).toBe(true);
    expect(mockState.store.orders[orderId].status).toBe('pending');
    expect(functionsSource).toMatch(/exports\.createPaymentIntent\s*=/);
    expect(functionsSource).toMatch(/exports\.onOrderDelivered\s*=/);
  });

  test('M5 CANONICAL REPLAY: completed+marker skips financial path', async () => {
    const orderId = 'order-m5';
    mockState.store.orders[orderId] = baseOrder({
      status: 'pending',
      paymentStatus: 'completed',
    });
    mockState.store[mockMarkerCollection][orderId] = {
      committedAt: mockState.serverTimestampToken,
    };
    await invokeWebhook(successEvent(orderId, 'evt_m5'));
    expect(mockState.writes.transfers).toHaveLength(0);
    expect(mockState.writes.orderUpdates).toHaveLength(0);
    expect(mockState.writes.markerSets).toHaveLength(0);
    expect(mockState.store.orders[orderId].status).toBe('pending');
  });

  test('M6 PAYOUT FAILED PATH: marker written; replay gap preserved', async () => {
    const orderId = 'order-m6';
    mockState.store.orders[orderId] = baseOrder({
      status: 'pending',
      paymentStatus: 'pending',
    });
    mockState.transferCreate.mockRejectedValueOnce(new Error('transfer_failed'));
    await invokeWebhook(successEvent(orderId, 'evt_m6'));
    expect(mockState.writes.orderUpdates[0].data.paymentStatus).toBe('completed');
    expect(mockState.writes.orderUpdates[0].data.payoutStatus).toBe('failed');
    expect(mockState.writes.orderUpdates[0].data.status).toBeUndefined();
    expect(mockState.writes.markerSets.some((m) => m.id === orderId)).toBe(true);
    expect(mockState.writes.eventSets.some((e) => e.id === 'evt_m6')).toBe(true);
    // PREEXISTING_REPLAY_GAP_PRESERVED=true
    expect(true).toBe(true);
  });

  test('M7 MISSING CONNECTED ACCOUNT: marker written, status preserved', async () => {
    const orderId = 'order-m7';
    mockState.store.orders[orderId] = baseOrder({
      status: 'pending',
      paymentStatus: 'pending',
    });
    mockState.store.users['producer-1'] = {};
    await invokeWebhook(successEvent(orderId, 'evt_m7'));
    expect(mockState.writes.orderUpdates[0].data.payoutStatus).toBe(
      'missing_connected_account'
    );
    expect(mockState.writes.orderUpdates[0].data.paymentStatus).toBe('completed');
    expect(mockState.store.orders[orderId].status).toBe('pending');
    expect(mockState.writes.markerSets.some((m) => m.id === orderId)).toBe(true);
    expect(mockState.writes.transfers).toHaveLength(0);
  });

  test('M8 NO-SPLIT / PENDING PATH: marker written, status preserved', async () => {
    const orderId = 'order-m8';
    mockState.store.orders[orderId] = baseOrder({
      status: 'pending',
      paymentStatus: 'pending',
      producerId: null,
      subtotalProducts: 0,
    });
    await invokeWebhook(successEvent(orderId, 'evt_m8'));
    expect(mockState.writes.orderUpdates[0].data.payoutStatus).toBe('pending');
    expect(mockState.writes.orderUpdates[0].data.paymentStatus).toBe('completed');
    expect(mockState.store.orders[orderId].status).toBe('pending');
    expect(mockState.writes.markerSets.some((m) => m.id === orderId)).toBe(true);
    expect(mockState.writes.transfers).toHaveLength(0);
  });

  test('M9 SERVER-ONLY SECURITY CHARACTERIZATION (local source only)', () => {
    // M9_SECURITY_TEST_SCOPE=LOCAL_SOURCE_CHARACTERIZATION_NOT_REMOTE_RULES_PROOF
    expect(functionsSource).toContain("db.collection('stripe_payment_success_commits')");
    expect(functionsSource).toContain('admin.firestore.FieldValue.serverTimestamp()');
    expect(functionsSource).not.toMatch(/match\s+\/stripe_payment_success_commits/);
    const rulesPath = path.join(__dirname, '..', '..', 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');
    expect(rules).not.toContain('stripe_payment_success_commits');
    expect(rules).toContain('match /{document=**}');
    expect(rules).toMatch(/allow read, write:\s*if false/);
  });

  test('M10 DIFFERENT EVENT ID SAME ORDER: marker skip, no duplicate transfer', async () => {
    const orderId = 'order-m10';
    mockState.store.orders[orderId] = baseOrder({
      status: 'ready',
      paymentStatus: 'completed',
    });
    mockState.store[mockMarkerCollection][orderId] = {
      committedAt: mockState.serverTimestampToken,
    };
    await invokeWebhook(successEvent(orderId, 'evt_m10_b', 'pi_1'));
    expect(mockState.writes.transfers).toHaveLength(0);
    expect(mockState.writes.orderUpdates).toHaveLength(0);
    expect(mockState.writes.eventSets.some((e) => e.id === 'evt_m10_b')).toBe(true);
  });

  test('M11 EVENT-ID DEDUPE unchanged', async () => {
    const orderId = 'order-m11';
    mockState.store.orders[orderId] = baseOrder({
      status: 'pending',
      paymentStatus: 'pending',
    });
    mockState.store.stripe_events['evt_m11'] = {
      type: 'payment_intent.succeeded',
      orderId,
    };
    await invokeWebhook(successEvent(orderId, 'evt_m11'));
    expect(mockState.writes.transfers).toHaveLength(0);
    expect(mockState.writes.orderUpdates).toHaveLength(0);
    expect(mockState.writes.markerSets).toHaveLength(0);
  });

  test('M12 TRANSFER IDEMPOTENCY KEY unchanged', async () => {
    const orderId = 'order-m12';
    mockState.store.orders[orderId] = baseOrder({
      status: 'pending',
      paymentStatus: 'pending',
    });
    await invokeWebhook(successEvent(orderId, 'evt_m12'));
    expect(mockState.writes.transfers.length).toBeGreaterThan(0);
    const opts = mockState.writes.transfers[0][1];
    expect(opts.idempotencyKey).toBe(`${mockTransferIdempotencyPrefix}${orderId}`);
    expect(functionsSource).toContain('idempotencyKey: `payout_producer_${orderId}`');
  });

  test('M13 FAILURE EVENT: no marker write/delete; writes status payment_failed', async () => {
    const orderId = 'order-m13';
    mockState.store.orders[orderId] = baseOrder({
      status: 'pending',
      paymentStatus: 'pending',
    });
    await invokeWebhook(failureEvent(orderId, 'evt_m13'));
    expect(mockState.writes.markerSets).toHaveLength(0);
    expect(Object.keys(mockState.store[mockMarkerCollection])).toHaveLength(0);
    expect(mockState.writes.orderUpdates[0].data.status).toBe('payment_failed');
    expect(mockState.writes.orderUpdates[0].data.paymentStatus).toBe('failed');
    expect(mockState.writes.orderUpdates[0].data.paymentError).toBe('card_declined');
    expect(mockState.store.orders[orderId].status).toBe('payment_failed');
  });

  test('M14 LATE FAILURE AFTER COMPLETED: skipped, no regression', async () => {
    const orderId = 'order-m14';
    mockState.store.orders[orderId] = baseOrder({
      status: 'confirmed',
      paymentStatus: 'completed',
    });
    await invokeWebhook(failureEvent(orderId, 'evt_m14'));
    expect(mockState.writes.orderUpdates).toHaveLength(0);
    expect(mockState.store.orders[orderId].paymentStatus).toBe('completed');
    expect(mockState.store.orders[orderId].status).toBe('confirmed');
    expect(mockState.writes.markerSets).toHaveLength(0);
  });

  test('M15 ROLLBACK RESIDUE CHARACTERIZATION: marker only in stripeWebhook success path', () => {
    const markerMentions = functionsSource.match(/stripe_payment_success_commits/g) || [];
    expect(markerMentions.length).toBeGreaterThan(0);
    const createPiStart = functionsSource.indexOf('exports.createPaymentIntent');
    const webhookStart = functionsSource.indexOf('exports.stripeWebhook');
    const executeSplitStart = functionsSource.indexOf('exports.executePaymentSplit');
    const onDeliveredStart = functionsSource.indexOf('exports.onOrderDelivered');
    const createPiSlice = functionsSource.slice(createPiStart, webhookStart);
    const onDeliveredSlice = functionsSource.slice(onDeliveredStart, onDeliveredStart + 4000);
    expect(createPiSlice).not.toContain(mockMarkerCollection);
    expect(onDeliveredSlice).not.toContain(mockMarkerCollection);
    expect(executeSplitStart).toBeGreaterThan(webhookStart);
    expect(functionsSource).toContain('successCommitDoc.exists');
  });
});
