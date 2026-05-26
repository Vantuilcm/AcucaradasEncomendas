import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { ConfigService } from '../services/ConfigService';

// Configurações via variáveis de ambiente (EXPO_PUBLIC_)
const SENTRY_ENABLED_ENV = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true';
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Preview/production gate — must be explicitly true to run Sentry at runtime */
export const isSentryRuntimeEnabled = (): boolean =>
  process.env.EXPO_PUBLIC_ENABLE_SENTRY === 'true';

const isSentryEnabled = () => {
  if (!isSentryRuntimeEnabled()) return false;
  if (!SENTRY_ENABLED_ENV || !SENTRY_DSN) return false;
  
  try {
    // Verificar feature flag (Fase 6)
    return ConfigService.getInstance().getFlag('enableSentry');
  } catch (error) {
    // Fallback se o ConfigService falhar
    return true;
  }
};

let isSentryInitialized = false;

export const initSentry = () => {
  if (!isSentryRuntimeEnabled()) {
    console.log('[SENTRY] Skipped init — EXPO_PUBLIC_ENABLE_SENTRY is not true');
    return;
  }

  if (isSentryInitialized) return;

  try {
    console.log('[BEFORE_SENTRY_INIT]');

    const dsnExists = !!process.env.EXPO_PUBLIC_SENTRY_DSN;
    console.log('[SENTRY_DSN_EXISTS]', dsnExists);

    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      enableAutoSessionTracking: true,
      debug: true,
    });

    isSentryInitialized = true;
    console.log('[AFTER_SENTRY_INIT]');

    try {
      Sentry.captureMessage('SENTRY_RUNTIME_TEST_BUILD_1279');
      console.log('[SENTRY_TEST_SENT]');
    } catch (captureError) {
      console.error('[SENTRY_CAPTURE_FAILED]', captureError);
      const errorMsg = (captureError as any)?.message || String(captureError);
      console.error('[SENTRY_CAPTURE_FAILED]', errorMsg);
    }
  } catch (error) {
    console.error('[SENTRY_INIT_FAILED]', error);
    const errorMsg = (error as any)?.message || String(error);
    console.error('[SENTRY_INIT_FAILED]', errorMsg);
  }
};

export const captureException = (error: any, context?: Record<string, any>) => {
  if (isSentryEnabled()) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('[Sentry Disabled]', error, context);
  }
};

export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  if (isSentryEnabled()) {
    if (context) {
      Sentry.withScope(scope => {
        scope.setExtras(context);
        Sentry.captureMessage(message, level);
      });
    } else {
      Sentry.captureMessage(message, level);
    }
  } else {
    console.log(`[Sentry Disabled] [${level}] ${message}`, context || '');
  }
};

export const setUser = (userId: string, email?: string, extra?: Record<string, any>) => {
  if (isSentryEnabled()) {
    Sentry.setUser({ id: userId, email, ...extra });
  }
};

export const clearUser = () => {
  if (isSentryEnabled()) {
    Sentry.setUser(null);
  }
};

export const startTransaction = (name: string, op: string) => {
  if (isSentryEnabled()) {
    // @ts-ignore - Transaction API pode variar dependendo da versão, mas mantemos a interface
    const transaction = Sentry.startTransaction({ name, op });
    return transaction;
  }
  return { finish: () => {} };
};

export default {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  startTransaction,
};
