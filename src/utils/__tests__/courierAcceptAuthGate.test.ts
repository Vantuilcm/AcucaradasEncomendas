/**
 * G06 — DriverHome accept Auth UID gate (handler contract).
 * Mirrors handleAcceptOrder order: online → approved → auth gate → acceptOrderAtomic.
 */
import {
  buildCourierAcceptAuthPayload,
  resolveAuthUid,
} from '../courierAcceptAuthGate';

const AUTH_UID = 'auth-uid-111';
const DRIVER_DOC_ALT = 'driver-doc-alt-999';

const baseDriver = {
  id: AUTH_UID,
  userId: AUTH_UID,
  name: 'Courier',
  phone: '11999999999',
  vehicle: { model: 'moto', plate: 'ABC1D23' },
};

/** Minimal stand-in for DriverHome handleAcceptOrder control flow (no RN). */
async function simulateHandleAcceptOrder(opts: {
  isOnline: boolean;
  canAccept: boolean;
  user: { id?: string; uid?: string } | null;
  driver: typeof baseDriver | null;
  orderId: string;
  acceptOrderAtomic: jest.Mock;
}): Promise<'blocked_offline' | 'blocked_unapproved' | 'blocked_auth' | 'accepted'> {
  const { isOnline, canAccept, user, driver, orderId, acceptOrderAtomic } = opts;
  if (!driver || !isOnline) return 'blocked_offline';
  if (!canAccept) return 'blocked_unapproved';
  const gate = buildCourierAcceptAuthPayload(user, driver);
  if (!gate.ok) return 'blocked_auth';
  await acceptOrderAtomic(orderId, gate.payload);
  return 'accepted';
}

describe('resolveAuthUid (AuthContext-shaped user)', () => {
  it('uses id when only id present; uid when only uid present; same when both equal', () => {
    expect(resolveAuthUid({ id: AUTH_UID })).toBe(AUTH_UID);
    expect(resolveAuthUid({ uid: AUTH_UID })).toBe(AUTH_UID);
    expect(resolveAuthUid({ id: AUTH_UID, uid: AUTH_UID })).toBe(AUTH_UID);
  });

  it('returns undefined when Auth UID absent or id/uid diverge', () => {
    expect(resolveAuthUid(null)).toBeUndefined();
    expect(resolveAuthUid(undefined)).toBeUndefined();
    expect(resolveAuthUid({})).toBeUndefined();
    expect(resolveAuthUid({ id: '  ' })).toBeUndefined();
    expect(resolveAuthUid({ id: AUTH_UID, uid: 'other' })).toBeUndefined();
  });
});

describe('buildCourierAcceptAuthPayload — DriverHome accept contract', () => {
  // 1. id==AuthUid and userId correct -> call 1 with both IDs correct
  it('1: id==AuthUid + userId correto → payload com ambos os IDs', () => {
    const result = buildCourierAcceptAuthPayload({ id: AUTH_UID }, baseDriver);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({
      id: AUTH_UID,
      userId: AUTH_UID,
      name: 'Courier',
      phone: '11999999999',
      vehicle: 'moto',
      plate: 'ABC1D23',
    });
  });

  // 2. id!=AuthUid, userId==AuthUid -> preserves id, userId=AuthUid
  it('2: id≠AuthUid, userId==AuthUid → preserva id e passa userId=authUid', () => {
    const result = buildCourierAcceptAuthPayload(
      { id: AUTH_UID },
      { ...baseDriver, id: DRIVER_DOC_ALT, userId: AUTH_UID }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.id).toBe(DRIVER_DOC_ALT);
    expect(result.payload.userId).toBe(AUTH_UID);
  });

  // 3. driver.userId!=AuthUid -> no call
  it('3: driver.userId≠AuthUid → block', () => {
    const result = buildCourierAcceptAuthPayload(
      { id: AUTH_UID },
      { ...baseDriver, userId: 'other-uid' }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('UID_MISMATCH');
  });

  // 4. AuthUid absent -> no call
  it('4: AuthUid ausente → block', () => {
    const result = buildCourierAcceptAuthPayload(null, baseDriver);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('NO_AUTH_UID');
  });

  // 5. driver.userId absent -> no call
  it('5: driver.userId ausente → block', () => {
    const result = buildCourierAcceptAuthPayload(
      { id: AUTH_UID },
      { ...baseDriver, userId: undefined as unknown as string }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('NO_DRIVER_USERID');
  });

  // 6. user.id and user.uid present and divergent -> no call
  it('6: user.id e user.uid divergentes → block AUTH_ID_UID_DIVERGE', () => {
    const result = buildCourierAcceptAuthPayload(
      { id: AUTH_UID, uid: 'other-uid' },
      baseDriver
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('AUTH_ID_UID_DIVERGE');
  });
});

describe('DriverHome handleAcceptOrder gate → acceptOrderAtomic (mock)', () => {
  it('1/2: chama acceptOrderAtomic 1× com id preservado e userId=authUid', async () => {
    const acceptOrderAtomic = jest.fn(async () => ({ id: 'order-1' }));
    const status = await simulateHandleAcceptOrder({
      isOnline: true,
      canAccept: true,
      user: { id: AUTH_UID },
      driver: { ...baseDriver, id: DRIVER_DOC_ALT, userId: AUTH_UID },
      orderId: 'order-1',
      acceptOrderAtomic,
    });
    expect(status).toBe('accepted');
    expect(acceptOrderAtomic).toHaveBeenCalledTimes(1);
    expect(acceptOrderAtomic).toHaveBeenCalledWith('order-1', {
      id: DRIVER_DOC_ALT,
      userId: AUTH_UID,
      name: 'Courier',
      phone: '11999999999',
      vehicle: 'moto',
      plate: 'ABC1D23',
    });
  });

  it('3: não chama quando driver.userId≠AuthUid', async () => {
    const acceptOrderAtomic = jest.fn();
    const status = await simulateHandleAcceptOrder({
      isOnline: true,
      canAccept: true,
      user: { id: AUTH_UID },
      driver: { ...baseDriver, userId: 'wrong' },
      orderId: 'order-1',
      acceptOrderAtomic,
    });
    expect(status).toBe('blocked_auth');
    expect(acceptOrderAtomic).not.toHaveBeenCalled();
  });

  it('4: não chama quando AuthUid ausente', async () => {
    const acceptOrderAtomic = jest.fn();
    const status = await simulateHandleAcceptOrder({
      isOnline: true,
      canAccept: true,
      user: null,
      driver: baseDriver,
      orderId: 'order-1',
      acceptOrderAtomic,
    });
    expect(status).toBe('blocked_auth');
    expect(acceptOrderAtomic).not.toHaveBeenCalled();
  });

  it('5: não chama quando driver.userId ausente', async () => {
    const acceptOrderAtomic = jest.fn();
    const status = await simulateHandleAcceptOrder({
      isOnline: true,
      canAccept: true,
      user: { id: AUTH_UID },
      driver: { ...baseDriver, userId: undefined as unknown as string },
      orderId: 'order-1',
      acceptOrderAtomic,
    });
    expect(status).toBe('blocked_auth');
    expect(acceptOrderAtomic).not.toHaveBeenCalled();
  });

  it('6: não chama quando user.id e user.uid divergem', async () => {
    const acceptOrderAtomic = jest.fn();
    const status = await simulateHandleAcceptOrder({
      isOnline: true,
      canAccept: true,
      user: { id: AUTH_UID, uid: 'other' },
      driver: baseDriver,
      orderId: 'order-1',
      acceptOrderAtomic,
    });
    expect(status).toBe('blocked_auth');
    expect(acceptOrderAtomic).not.toHaveBeenCalled();
  });

  // 7. preserves existing online/approved gates
  it('7: preserva gates isOnline / canAccept — não chega ao accept', async () => {
    const acceptOrderAtomic = jest.fn();
    const offline = await simulateHandleAcceptOrder({
      isOnline: false,
      canAccept: true,
      user: { id: AUTH_UID },
      driver: baseDriver,
      orderId: 'order-1',
      acceptOrderAtomic,
    });
    expect(offline).toBe('blocked_offline');
    expect(acceptOrderAtomic).not.toHaveBeenCalled();

    const unapproved = await simulateHandleAcceptOrder({
      isOnline: true,
      canAccept: false,
      user: { id: AUTH_UID },
      driver: baseDriver,
      orderId: 'order-1',
      acceptOrderAtomic,
    });
    expect(unapproved).toBe('blocked_unapproved');
    expect(acceptOrderAtomic).not.toHaveBeenCalled();
  });
});
