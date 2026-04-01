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

export const initSentry = () => {
  console.log('MISSÃO: [4/3] Sentry Init - DESATIVADO TEMPORARIAMENTE para debug de boot');
  return;
  
  /*
  if (!isSentryEnabled()) {
    console.log('[Sentry] Monitoramento desativado (ENV desativado ou DSN ausente ou Feature Flag desligada)');
    return;
  }
  */

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: __DEV__, // Debug apenas em desenvolvimento
      environment: __DEV__ ? 'development' : 'production',
      // Adicionar release automaticamente se disponível via Expo Constants
      release: Constants.expoConfig?.version || '1.0.0',
      // Não lançar erro se falhar a inicialização
    });
    console.log(`[Sentry] Inicializado com sucesso no ambiente: ${__DEV__ ? 'development' : 'production'}`);
  } catch (error) {
    // Falha silenciosa para não quebrar o app
    console.error('[Sentry] Erro ao inicializar:', error);
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
