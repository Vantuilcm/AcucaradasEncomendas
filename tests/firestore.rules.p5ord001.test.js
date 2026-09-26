/**
 * P5-ORD-001 Firestore Rules harness (M042).
 * Dual-mode:
 *   EXPECT_HARDENED=0 — baseline current rules (insecure protected writes succeed)
 *   EXPECT_HARDENED=1 — future hardened rules (protected writes denied; ops still allowed)
 * Local emulator only. projectId: demo-ae-p5ord001
 */
'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-ae-p5ord001';
const EXPECT_HARDENED = process.env.EXPECT_HARDENED === '1';
const RULES_PATH = path.join(__dirname, '..', 'firestore.rules');

const BUYER = 'buyer_uid_p5ord001';
const PRODUCER = 'producer_uid_p5ord001';
const COURIER = 'courier_uid_p5ord001';
const PRODUCER_DOC = 'producer_doc_p5ord001';
const ORDER_ID = 'order_p5ord001';

/** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
let testEnv;

function baseOrder(overrides = {}) {
  return {
    userId: BUYER,
    producerId: PRODUCER_DOC,
    status: 'pending',
    paymentStatus: 'pending',
    paymentIntentId: 'pi_seed',
    producerTransferId: null,
    payoutStatus: null,
    producerPayoutAmount: null,
    courierTransferId: null,
    courierPayoutStatus: null,
    courierPayoutAmount: null,
    subtotalProducts: 100,
    totalAmount: 120,
    deliveryFee: 20,
    deliveryDriver: null,
    deliveryDriverId: null,
    cancellationReason: null,
    watchdogAlertSent: false,
    watchdogAlertTimestamp: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function seed(orderOverrides = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', BUYER), { role: 'customer', status: 'active' });
    await setDoc(doc(db, 'users', PRODUCER), { role: 'producer', status: 'active' });
    await setDoc(doc(db, 'users', COURIER), { role: 'courier', status: 'active' });
    await setDoc(doc(db, 'producers', PRODUCER_DOC), { userId: PRODUCER });
    await setDoc(doc(db, 'orders', ORDER_ID), baseOrder(orderOverrides));
  });
}

/**
 * Vulnerability cases: baseline expects ALLOW (hole proven); hardened expects DENY.
 * Legitimate cases: both modes expect ALLOW.
 */
async function expectWrite(promise, { vulnerability }) {
  if (vulnerability) {
    if (EXPECT_HARDENED) {
      await assertFails(promise);
    } else {
      await assertSucceeds(promise);
    }
  } else {
    await assertSucceeds(promise);
  }
}

function authedDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

describe('P5-ORD-001 orders/{orderId} update rules (15 M038 cases)', () => {
  before(async () => {
    assert.notEqual(
      PROJECT_ID,
      'acucaradas-encomendas',
      'harness must not target real project id'
    );
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync(RULES_PATH, 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seed();
  });

  it('1 buyer_cannot_change_paymentStatus', async () => {
    const db = authedDb(BUYER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        paymentStatus: 'paid',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: true }
    );
  });

  it('2 buyer_cannot_change_paymentIntentId', async () => {
    const db = authedDb(BUYER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        paymentIntentId: 'pi_attacker',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: true }
    );
  });

  it('3 buyer_cannot_change_producerTransferId', async () => {
    const db = authedDb(BUYER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        producerTransferId: 'tr_attacker',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: true }
    );
  });

  it('4 buyer_cannot_change_payout_or_courier_payout_fields', async () => {
    const db = authedDb(BUYER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        payoutStatus: 'paid',
        courierPayoutStatus: 'paid',
        courierPayoutAmount: 99,
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: true }
    );
  });

  it('5 buyer_cannot_change_totals_or_deliveryFee', async () => {
    const db = authedDb(BUYER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        totalAmount: 1,
        deliveryFee: 0,
        subtotalProducts: 1,
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: true }
    );
  });

  it('6 buyer_cannot_change_producerId_or_userId', async () => {
    const db = authedDb(BUYER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        producerId: 'hijacked_producer',
        userId: 'hijacked_user',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: true }
    );
  });

  it('7 buyer_can_cancel_own_order_with_cancellationReason', async () => {
    const db = authedDb(BUYER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        status: 'cancelled',
        cancellationReason: 'changed_mind',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: false }
    );
  });

  it('8 producer_cannot_change_protected_financial_fields', async () => {
    const db = authedDb(PRODUCER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        paymentStatus: 'paid',
        producerTransferId: 'tr_producer_self',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: true }
    );
  });

  it('9 producer_can_perform_proven_operational_status_transition', async () => {
    const db = authedDb(PRODUCER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        status: 'confirmed',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: false }
    );
  });

  it('10 courier_cannot_change_protected_financial_fields', async () => {
    const db = authedDb(COURIER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        paymentStatus: 'paid',
        courierPayoutAmount: 50,
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: true }
    );
  });

  it('11 courier_can_accept_ready_order_with_deliveryDriver_deliveryDriverId', async () => {
    await testEnv.clearFirestore();
    await seed({ status: 'ready' });
    const db = authedDb(COURIER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        deliveryDriver: { id: 'driver_doc_1', userId: COURIER, name: 'Courier' },
        deliveryDriverId: COURIER,
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: false }
    );
  });

  it('12 courier_can_perform_proven_delivery_transition', async () => {
    await testEnv.clearFirestore();
    await seed({
      status: 'ready',
      deliveryDriverId: COURIER,
      deliveryDriver: { id: 'driver_doc_1', userId: COURIER },
    });
    const db = authedDb(COURIER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        status: 'delivering',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: false }
    );
  });

  it('13 watchdog_can_write_only_proven_watchdog_fields', async () => {
    // Proven client path: OrderWatchdogService -> OrderService.updateOrder (role-capable actor).
    const db = authedDb(PRODUCER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        watchdogAlertSent: true,
        watchdogAlertTimestamp: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: false }
    );
  });

  it('14 legacy_PaymentService_financial_update_denied', async () => {
    const db = authedDb(BUYER);
    await expectWrite(
      updateDoc(doc(db, 'orders', ORDER_ID), {
        paymentStatus: 'paid',
        paymentIntentId: 'pi_legacy_client',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      { vulnerability: true }
    );
  });

  it('15 Admin_SDK_conceptually_unaffected_by_client_Rules', async () => {
    // Client Rules do not govern Admin SDK writes. This case is a documented boundary
    // assertion only — do not invoke Admin SDK or any remote backend.
    assert.equal(
      typeof process.env.FIREBASE_ADMIN_SDK_INVOKED,
      'undefined',
      'Admin SDK must not be invoked by this harness'
    );
    assert.ok(
      true,
      'Admin SDK bypasses client security rules; financial settlement remains server-side'
    );
  });
});
