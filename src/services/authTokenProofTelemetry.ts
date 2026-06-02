import { getAuth, dbFunctions } from '../config/firebase';
import { logInfo, logError as logProofError } from '../core/monitoring/logger';

export type AuthTokenProofSource = 'bootstrap' | 'login';

/**
 * Telemetria read-only: prova se getDoc(users/{uid}) corre com auth/token válidos.
 * Persiste no AsyncStorage via logger (Diagnóstico Dev).
 */
export async function proofTraceGetDocUserProfile(
  contextUid: string,
  source: AuthTokenProofSource
) {
  const auth = getAuth();

  const authSnapshot = {
    authCurrentUserUid: auth.currentUser?.uid ?? null,
    authCurrentUserEmail: auth.currentUser?.email ?? null,
    authInitialized: !!auth.currentUser,
    contextUid,
    timestamp: Date.now(),
    source,
  };

  console.log('[AUTH_TOKEN_PROOF]', authSnapshot);
  await logInfo('AUTH_TOKEN_PROOF', '[AUTH_TOKEN_PROOF]', authSnapshot);

  let tokenObtained = false;
  let tokenLength = 0;
  let tokenUid: string | null = null;
  let tokenEmail: string | null = null;

  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(false);
      tokenObtained = Boolean(token);
      tokenLength = token?.length ?? 0;
      tokenUid = auth.currentUser.uid ?? null;
      tokenEmail = auth.currentUser.email ?? null;
    }
  } catch {
    tokenObtained = false;
    tokenLength = 0;
  }

  const tokenStatusLog = {
    tokenObtained,
    tokenLength,
    timestamp: Date.now(),
    source,
  };
  const tokenStatusPersist = {
    ...tokenStatusLog,
    uid: tokenUid,
    email: tokenEmail,
  };

  console.log('[AUTH_TOKEN_STATUS]', tokenStatusLog);
  await logInfo('AUTH_TOKEN_PROOF', '[AUTH_TOKEN_STATUS]', tokenStatusPersist);

  const path = `users/${contextUid}`;
  const readStart = {
    uid: contextUid,
    path,
    authCurrentUserUid: auth.currentUser?.uid ?? null,
    timestamp: Date.now(),
    source,
  };

  console.log('[FIRESTORE_READ_START]', readStart);
  await logInfo('AUTH_TOKEN_PROOF', '[FIRESTORE_READ_START]', readStart);

  const userRef = dbFunctions.doc('users', contextUid);

  try {
    const userDoc = await dbFunctions.getDoc(userRef);
    const successPayload = {
      uid: contextUid,
      exists: userDoc.exists(),
      timestamp: Date.now(),
      source,
    };
    console.log('[FIRESTORE_READ_SUCCESS]', successPayload);
    await logInfo('AUTH_TOKEN_PROOF', '[FIRESTORE_READ_SUCCESS]', successPayload);
    return userDoc;
  } catch (error: any) {
    const errorPayload = {
      uid: contextUid,
      code: error?.code ?? null,
      message: error?.message ?? String(error),
      timestamp: Date.now(),
      source,
    };
    console.error('[FIRESTORE_READ_ERROR]', errorPayload);
    await logProofError('AUTH_TOKEN_PROOF', '[FIRESTORE_READ_ERROR]', errorPayload);
    throw error;
  }
}
