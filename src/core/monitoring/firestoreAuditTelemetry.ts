// Telemetria Firestore — somente observabilidade (Diagnóstico Dev → LOGS)
import { log } from './logger';

export type FirestoreAuditStatus = 'READ_START' | 'READ_SUCCESS' | 'READ_DENIED';

export interface FirestoreAuditPayload {
  status: FirestoreAuditStatus;
  uid: string;
  email: string | null;
  path: string;
  code?: string;
  errorMessage?: string;
  exists?: boolean;
}

const formatAuditMessage = (payload: FirestoreAuditPayload): string => {
  const lines = [
    '[FIRESTORE_AUDIT]',
    `uid=${payload.uid}`,
    payload.email ? `email=${payload.email}` : 'email=(null)',
    `path=${payload.path}`,
    `status=${payload.status}`,
  ];

  if (payload.status === 'READ_SUCCESS' && payload.exists !== undefined) {
    lines.push(`exists=${payload.exists}`);
  }

  if (payload.status === 'READ_DENIED') {
    if (payload.code) lines.push(`code=${payload.code}`);
    if (payload.errorMessage) lines.push(`message=${payload.errorMessage}`);
  }

  return lines.join('\n');
};

/** Persiste evento na aba LOGS do Diagnóstico Dev (AsyncStorage @app_error_logs) */
export function emitFirestoreAudit(payload: FirestoreAuditPayload): void {
  const message = formatAuditMessage(payload);
  const severity = payload.status === 'READ_DENIED' ? 'HIGH' : 'LOW';

  void log('FIRESTORE_AUDIT', severity, message, {
    context: 'firestore',
    metadata: {
      ...payload,
      tag: 'FIRESTORE_AUDIT',
    },
  });

  console.log(message);
}
