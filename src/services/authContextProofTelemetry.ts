import { getApp } from '../config/firebase';
import { logInfo, logError } from '../core/monitoring/logger';
import type { AuthTokenProofSource } from './authTokenProofTelemetry';

type DebugAuthContextResponse = {
  authExists?: boolean;
  authUid?: string | null;
  email?: string | null;
  projectId?: string | null;
  timestamp?: string | null;
};

/**
 * Chama debugAuthContext (Cloud Function) e persiste AUTH_CONTEXT_PROOF no Diagnóstico Dev.
 * Read-only — não altera fluxo de login.
 */
export async function proveAuthContextFromFunction(
  source: AuthTokenProofSource,
  contextUid: string,
  firebaseAuthUid: string | null,
  tokenUid: string | null
) {
  const base = {
    authExists: false,
    authUid: null as string | null,
    projectId: null as string | null,
    email: null as string | null,
    timestamp: null as string | null,
    functionCallOk: false,
    errorCode: null as string | null,
    errorMessage: null as string | null,
    firebaseAuthUid,
    tokenUid,
    contextUid,
    functionAuthMatchesFirebaseAuth: 'NÃO' as 'SIM' | 'NÃO',
    functionAuthMatchesTokenUid: 'NÃO' as 'SIM' | 'NÃO',
    functionAuthMatchesContextUid: 'NÃO' as 'SIM' | 'NÃO',
    source,
    loggedAt: Date.now(),
  };

  try {
    const { getFunctions, httpsCallable } = require('firebase/functions');
    const functions = getFunctions(getApp());
    const debugAuthContext = httpsCallable(functions, 'debugAuthContext');
    const result = await debugAuthContext({});
    const data = (result?.data ?? {}) as DebugAuthContextResponse;

    base.authExists = Boolean(data.authExists);
    base.authUid = data.authUid ?? null;
    base.projectId = data.projectId ?? null;
    base.email = data.email ?? null;
    base.timestamp = data.timestamp ?? null;
    base.functionCallOk = true;

    if (base.authUid && firebaseAuthUid) {
      base.functionAuthMatchesFirebaseAuth =
        base.authUid === firebaseAuthUid ? 'SIM' : 'NÃO';
    }
    if (base.authUid && tokenUid) {
      base.functionAuthMatchesTokenUid = base.authUid === tokenUid ? 'SIM' : 'NÃO';
    }
    if (base.authUid && contextUid) {
      base.functionAuthMatchesContextUid =
        base.authUid === contextUid ? 'SIM' : 'NÃO';
    }
  } catch (error: any) {
    base.errorCode = error?.code ?? null;
    base.errorMessage = error?.message ?? String(error);
  }

  const persistPayload = {
    authExists: base.authExists,
    authUid: base.authUid,
    projectId: base.projectId,
    email: base.email,
    timestamp: base.timestamp,
    functionCallOk: base.functionCallOk,
    firebaseAuthUid: base.firebaseAuthUid,
    tokenUid: base.tokenUid,
    contextUid: base.contextUid,
    functionAuthMatchesFirebaseAuth: base.functionAuthMatchesFirebaseAuth,
    functionAuthMatchesTokenUid: base.functionAuthMatchesTokenUid,
    functionAuthMatchesContextUid: base.functionAuthMatchesContextUid,
    errorCode: base.errorCode,
    errorMessage: base.errorMessage,
    source: base.source,
    loggedAt: base.loggedAt,
  };

  console.log('[AUTH_CONTEXT_PROOF]', persistPayload);

  if (base.functionCallOk) {
    await logInfo('AUTH_CONTEXT_PROOF', '[AUTH_CONTEXT_PROOF]', persistPayload);
  } else {
    await logError('AUTH_CONTEXT_PROOF', '[AUTH_CONTEXT_PROOF]', persistPayload);
  }

  return base;
}
