import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Sentry temporariamente desativado para resolver conflitos de build
export const initSentry = () => {
  console.log('Sentry desativado temporariamente');
};

export const captureException = (error: any, context?: Record<string, any>) => {
  console.error('[Sentry Disabled]', error, context);
};

export const captureMessage = (message: string, level: any = 'info') => {
  console.log(`[Sentry Disabled] ${message}`);
};

export const startTransaction = (name: string, op: string) => {
  return { finish: () => {} };
};

export default {
  initSentry,
  captureException,
  captureMessage,
  startTransaction,
};
