import Constants from 'expo-constants';
import { captureMessage } from '../config/sentry';

export const showFirestoreDebug = (
  path: string,
  error: any,
  context: string = 'Firestore'
) => {
  const code = error?.code || String(error?.message || '').match(/[A-Z_]+/)?.[0] || 'unknown';
  const message = error?.message || JSON.stringify(error) || 'sem mensagem';

  console.error('[FIRESTORE_DEBUG]', { context, path, code, message });

  if (code === 'permission-denied' || String(message).includes('PERMISSION_DENIED')) {
    try {
      captureMessage('[FS_DENIED]', 'error', {
        operation: 'firestore-debug',
        path,
        context,
        code,
        message,
        build: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode,
      });
    } catch (sentryError) {
      console.warn('[SENTRY_FS_DENIED_FAILED]', sentryError);
    }

    console.log(`${context} - Firestore`, {
      path,
      code,
      message,
    });
  }
};
