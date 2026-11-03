/**
 * G06_R3 — DriverHome accept Auth UID gate (Production Original).
 * Mirrors handleAcceptOrder: isOnline → auth gate → acceptOrderAtomic.
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

/** Minimal stand-in for Original DriverHome handleAcceptOrder (no RN). */
async function simulateHandleAcceptOrder(opts: {
  isOnline: boolean;
  user: { id?: string; uid?: string } | null;
  driver: typeof baseDriver | null;
  orderId: string;
  acceptOrderAtomic: jest.Mock;
}): Promise<'blocked_offline' | 'blocked_auth' | 'accepted'> {
  const { isOnline, user, driver, orderId, acceptOrderAtomic } = opts;
  if (!driver || !isOnline) return 'blocked_offline';
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

  it('3: driver.userId≠AuthUid → block', () => {
    const result = buildCourierAcceptAuthPayload(
      { id: AUTH_UID },
      { ...baseDriver, userId: 'other-uid' }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('UID_MISMATCH');
  });

  it('4: AuthUid ausente → block', () => {
    const result = buildCourierAcceptAuthPayload(null, baseDriver);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('NO_AUTH_UID');
  });

  it('5: driver.userId ausente → block', () => {
    const result = buildCourierAcceptAuthPayload(
      { id: AUTH_UID },
      { ...baseDriver, userId: undefined as unknown as string }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('NO_DRIVER_USERID');
  });

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
  it('chama acceptOrderAtomic 1× com id preservado e userId=authUid', async () => {
    const acceptOrderAtomic = jest.fn(async () => ({ id: 'order-1' }));
    const status = await simulateHandleAcceptOrder({
      isOnline: true,
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

  it('não chama quando Auth gate falha / offline', async () => {
    const acceptOrderAtomic = jest.fn();

    expect(
      await simulateHandleAcceptOrder({
        isOnline: true,
        user: { id: AUTH_UID },
        driver: { ...baseDriver, userId: 'wrong' },
        orderId: 'order-1',
        acceptOrderAtomic,
      })
    ).toBe('blocked_auth');

    expect(
      await simulateHandleAcceptOrder({
        isOnline: true,
        user: null,
        driver: baseDriver,
        orderId: 'order-1',
        acceptOrderAtomic,
      })
    ).toBe('blocked_auth');

    expect(
      await simulateHandleAcceptOrder({
        isOnline: false,
        user: { id: AUTH_UID },
        driver: baseDriver,
        orderId: 'order-1',
        acceptOrderAtomic,
      })
    ).toBe('blocked_offline');

    expect(acceptOrderAtomic).not.toHaveBeenCalled();
  });
});
