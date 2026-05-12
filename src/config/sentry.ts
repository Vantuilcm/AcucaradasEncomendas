import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Alert } from 'react-native';
import { ConfigService } from '../services/ConfigService';

// Configurações via variáveis de ambiente (EXPO_PUBLIC_)
const SENTRY_ENABLED_ENV = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true';
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

const isSentryEnabled = () => {
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
  if (isSentryInitialized) {
    console.log('🟡 Sentry já inicializado');
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const isProduction = process.env.NODE_ENV === 'production' || !__DEV__;

  console.log('[SENTRY_DSN_EXISTS]', !!dsn);

  if (!dsn) {
    console.warn('⚠️ Sentry DSN não configurado. Monitoramento automático desativado.');
    return;
  }

  if (!isProduction) {
    console.log('🟡 Sentry ignorado (ambiente não produção)');
    return;
  }

  try {
    Sentry.init({
      dsn,
      debug: false,
      environment: 'production',
      release: Constants.expoConfig?.version || '1.0.0',
      tracesSampleRate: 1.0,
      enableAutoSessionTracking: true,
    });

    isSentryInitialized = true;
    console.log('[SENTRY_INIT_OK]');

    try {
      Alert.alert('SENTRY_INIT_OK');
    } catch (e) {
      console.error('[ALERT_ERROR]', e);
    }

    try {
      Sentry.captureMessage('SENTRY_RUNTIME_TEST_BUILD_1278');
      console.log('[SENTRY_TEST_SENT]');

      try {
        Alert.alert('SENTRY_TEST_SENT');
      } catch (e) {
        console.error('[ALERT_ERROR]', e);
      }
    } catch (error) {
      console.error('[SENTRY_TEST_FAILED]', error);

      try {
        const errorMsg = (error as any)?.message || String(error);
        Alert.alert(
          'SENTRY_TEST_FAILED',
          errorMsg
        );
      } catch (e) {
        console.error('[ALERT_ERROR]', e);
      }
    }

    console.log('✅ Sentry iniciado com sucesso em modo PRODUÇÃO');
  } catch (error) {
    console.error('❌ Falha ao iniciar Sentry:', error);

    try {
      const errorMsg = (error as any)?.message || String(error);
      Alert.alert(
        'SENTRY_INIT_FAILED',
        errorMsg
      );
    } catch (e) {
      console.error('[ALERT_ERROR]', e);
    }
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
