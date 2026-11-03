/**
 * G06/R3: Auth UID gate for courier order accept (Production Original).
 * Ensures deliveryDriverId consumers receive users/{Auth UID}, while
 * preserving delivery_drivers document id on deliveryDriver.id.
 */

export type CourierAcceptAuthUser = {
  id?: string;
  uid?: string;
} | null | undefined;

export type CourierAcceptDriverIdentity = {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  vehicle: { model: string; plate: string };
};

export type CourierAcceptDriverPayload = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
};

export type CourierAcceptAuthGateReason =
  | 'NO_AUTH_UID'
  | 'AUTH_ID_UID_DIVERGE'
  | 'NO_DRIVER_USERID'
  | 'UID_MISMATCH';

export type CourierAcceptAuthGateResult =
  | { ok: true; authUid: string; payload: CourierAcceptDriverPayload }
  | {
      ok: false;
      reason: CourierAcceptAuthGateReason;
      message: string;
    };

function normalizeAuthToken(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Resolve Auth UID from AuthContext-shaped user.
 * Returns undefined when absent OR when id and uid are both set and differ.
 */
export function resolveAuthUid(user: CourierAcceptAuthUser): string | undefined {
  if (!user) return undefined;
  const id = normalizeAuthToken(user.id);
  const uid = normalizeAuthToken(user.uid);
  if (id && uid && id !== uid) return undefined;
  return id || uid;
}

/**
 * Validate Auth UID vs driver.userId and build accept payload.
 * Does not call acceptOrderAtomic; caller must abort when ok=false.
 * Never falls back to driver.id as Auth UID substitute.
 */
export function buildCourierAcceptAuthPayload(
  user: CourierAcceptAuthUser,
  driver: CourierAcceptDriverIdentity
): CourierAcceptAuthGateResult {
  const id = user ? normalizeAuthToken(user.id) : undefined;
  const uid = user ? normalizeAuthToken(user.uid) : undefined;

  if (id && uid && id !== uid) {
    return {
      ok: false,
      reason: 'AUTH_ID_UID_DIVERGE',
      message:
        'Sessão inconsistente. Entre novamente para aceitar entregas.',
    };
  }

  const authUid = id || uid;
  if (!authUid) {
    return {
      ok: false,
      reason: 'NO_AUTH_UID',
      message: 'Sessão inválida. Entre novamente para aceitar entregas.',
    };
  }

  const driverUserId =
    typeof driver.userId === 'string' ? driver.userId.trim() : '';
  if (!driverUserId) {
    return {
      ok: false,
      reason: 'NO_DRIVER_USERID',
      message:
        'Cadastro de entregador incompleto (userId ausente). Atualize seu cadastro.',
    };
  }

  if (driverUserId !== authUid) {
    return {
      ok: false,
      reason: 'UID_MISMATCH',
      message:
        'Identidade do entregador não corresponde à sessão autenticada. Não é possível aceitar.',
    };
  }

  return {
    ok: true,
    authUid,
    payload: {
      id: driver.id,
      userId: authUid,
      name: driver.name,
      phone: driver.phone,
      vehicle: driver.vehicle.model,
      plate: driver.vehicle.plate,
    },
  };
}
