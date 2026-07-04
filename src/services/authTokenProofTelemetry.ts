import { jwtDecode } from 'jwt-decode';
import { getAuth, getApp, dbFunctions } from '../config/firebase';
import { logInfo, logError as logProofError } from '../core/monitoring/logger';
import { proveAuthContextFromFunction } from './authContextProofTelemetry';

function getRuntimeProjectProof(): { projectId?: string; appId?: string; authDomain?: string } {
  try {
    const options = getApp().options;
    return {
      projectId: options.projectId,
      appId: typeof options.appId === 'string'
        ? `${options.appId.slice(0, 8)}...${options.appId.slice(-4)}`
        : undefined,
      authDomain: options.authDomain,
    };
  } catch {
    return { projectId: undefined };
  }
}

export type AuthTokenProofSource = 'bootstrap' | 'login';

type FirebaseIdTokenPayload = {
  sub?: string;
  user_id?: string;
  aud?: string;
  iss?: string;
  auth_time?: number;
  iat?: number;
  exp?: number;
  email?: string;
};

function decodeTokenClaims(token: string): FirebaseIdTokenPayload | null {
  try {
    return jwtDecode<FirebaseIdTokenPayload>(token);
  } catch {
    return null;
  }
}

function isTokenValid(claims: FirebaseIdTokenPayload | null, nowMs: number): boolean {
  if (!claims?.sub) return false;
  if (typeof claims.exp === 'number' && claims.exp * 1000 <= nowMs) return false;
  return true;
}

/**
 * Telemetria read-only: prova o que Firestore recebe do app antes de getDoc(users/{uid}).
 * Persiste no AsyncStorage via logger (Diagnóstico Dev).
 */
export async function proofTraceGetDocUserProfile(
  contextUid: string,
  source: AuthTokenProofSource
) {
  const auth = getAuth();
  const nowMs = Date.now();
  const runtimeProof = getRuntimeProjectProof();

  console.log('[RUNTIME_PROOF][PROJECT_ID]', {
    ...runtimeProof,
    contextUid,
    source,
    timestamp: new Date(nowMs).toISOString(),
  });

  const authCurrentUserUid = auth.currentUser?.uid ?? null;
  const authCurrentUserEmail = auth.currentUser?.email ?? null;
  const providerId = auth.currentUser?.providerData?.[0]?.providerId ?? null;

  const authSnapshot = {
    authCurrentUserUid,
    authCurrentUserEmail,
    authInitialized: !!auth.currentUser,
    providerId,
    contextUid,
    projectId: runtimeProof.projectId,
    timestamp: nowMs,
    source,
  };

  console.log('[AUTH_TOKEN_PROOF]', authSnapshot);
  await logInfo('AUTH_TOKEN_PROOF', '[AUTH_TOKEN_PROOF]', authSnapshot);

  let tokenObtained = false;
  let tokenLength = 0;
  let tokenIssuedAtTime: number | null = null;
  let tokenExpirationTime: number | null = null;
  let tokenClaims: FirebaseIdTokenPayload | null = null;
  let tokenUid: string | null = null;

  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(false);
      tokenObtained = Boolean(token);
      tokenLength = token?.length ?? 0;

      if (token) {
        tokenClaims = decodeTokenClaims(token);
        tokenUid = tokenClaims?.sub ?? tokenClaims?.user_id ?? null;
        tokenIssuedAtTime =
          typeof tokenClaims?.iat === 'number' ? tokenClaims.iat * 1000 : null;
        tokenExpirationTime =
          typeof tokenClaims?.exp === 'number' ? tokenClaims.exp * 1000 : null;
      }
    }
  } catch {
    tokenObtained = false;
    tokenLength = 0;
  }

  const tokenStatusLog = {
    authCurrentUserUid,
    authCurrentUserEmail,
    tokenObtained,
    tokenLength,
    tokenIssuedAtTime,
    tokenExpirationTime,
    providerId,
    timestamp: nowMs,
    source,
  };

  console.log('[AUTH_TOKEN_STATUS]', tokenStatusLog);
  await logInfo('AUTH_TOKEN_PROOF', '[AUTH_TOKEN_STATUS]', tokenStatusLog);

  const subMatchesAuthUid =
    tokenClaims?.sub != null && authCurrentUserUid != null
      ? tokenClaims.sub === authCurrentUserUid
        ? 'SIM'
        : 'NÃO'
      : 'NÃO';

  const claimsPayload = {
    sub: tokenClaims?.sub ?? null,
    user_id: tokenClaims?.user_id ?? null,
    aud: tokenClaims?.aud ?? null,
    iss: tokenClaims?.iss ?? null,
    auth_time: tokenClaims?.auth_time ?? null,
    subMatchesAuthUid,
    tokenValid: isTokenValid(tokenClaims, nowMs) ? 'SIM' : 'NÃO',
    timestamp: nowMs,
    source,
  };

  console.log('[AUTH_TOKEN_CLAIMS]', claimsPayload);
  await logInfo('AUTH_TOKEN_PROOF', '[AUTH_TOKEN_CLAIMS]', claimsPayload);

  await proveAuthContextFromFunction(
    source,
    contextUid,
    authCurrentUserUid,
    tokenUid
  );

  const path = `users/${contextUid}`;
  const requestProof = {
    uid: contextUid,
    path,
    tokenUid,
    firebaseAuthUid: authCurrentUserUid,
    projectId: runtimeProof.projectId,
    tokenUidMatchesAuthUid:
      tokenUid != null && authCurrentUserUid != null && tokenUid === authCurrentUserUid
        ? 'SIM'
        : 'NÃO',
    contextUidMatchesAuthUid:
      contextUid === authCurrentUserUid ? 'SIM' : 'NÃO',
    timestamp: nowMs,
    source,
  };

  console.log('[FIRESTORE_REQUEST_PROOF]', requestProof);
  await logInfo('AUTH_TOKEN_PROOF', '[FIRESTORE_REQUEST_PROOF]', requestProof);

  console.log('[FIRESTORE_READ_START]', requestProof);
  await logInfo('AUTH_TOKEN_PROOF', '[FIRESTORE_READ_START]', requestProof);

  const userRef = dbFunctions.doc('users', contextUid);

  try {
    const userDoc = await dbFunctions.getDoc(userRef);
    const successPayload = {
      uid: contextUid,
      path,
      exists: userDoc.exists(),
      timestamp: Date.now(),
      source,
    };
    console.log('[FIRESTORE_RESPONSE_SUCCESS]', successPayload);
    await logInfo('AUTH_TOKEN_PROOF', '[FIRESTORE_RESPONSE_SUCCESS]', successPayload);
    console.log('[FIRESTORE_READ_SUCCESS]', successPayload);
    await logInfo('AUTH_TOKEN_PROOF', '[FIRESTORE_READ_SUCCESS]', successPayload);
    return userDoc;
  } catch (error: any) {
    const errorPayload = {
      uid: contextUid,
      path,
      projectId: runtimeProof.projectId,
      code: error?.code ?? null,
      message: error?.message ?? String(error),
      timestamp: Date.now(),
      source,
    };
    console.error('[FIRESTORE_RESPONSE_ERROR]', errorPayload);
    await logProofError('AUTH_TOKEN_PROOF', '[FIRESTORE_RESPONSE_ERROR]', errorPayload);
    console.error('[FIRESTORE_READ_ERROR]', errorPayload);
    await logProofError('AUTH_TOKEN_PROOF', '[FIRESTORE_READ_ERROR]', errorPayload);
    throw error;
  }
}

/**
 * Pre-auth telemetry: logs projectId BEFORE signInWithEmailAndPassword.
 * If auth fails, this is the only proof of which Firebase project the app targeted.
 */
export function proofTracePreAuth(email: string) {
  const runtimeProof = getRuntimeProjectProof();
  const payload = {
    ...runtimeProof,
    emailDomain: email.includes('@') ? email.split('@')[1] : 'unknown',
    timestamp: new Date().toISOString(),
  };
  console.log('[RUNTIME_PROOF][PRE_AUTH]', payload);
  logInfo('AUTH_TOKEN_PROOF', '[RUNTIME_PROOF][PRE_AUTH]', payload);
}
