import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
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
    console.log('✅ Sentry iniciado com sucesso em modo PRODUÇÃO');
  } catch (error) {
    console.error('❌ Falha ao iniciar Sentry:', error);
  }
};

export const captureException = (error: any, context?: Record<string, any>) => {
  if (isSentryEnabled()) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('[Sentry Disabled]', error, context);
  }
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (isSentryEnabled()) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[Sentry Disabled] [${level}] ${message}`);
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
