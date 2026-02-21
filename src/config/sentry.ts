import * as Sentry from 'sentry-expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const initSentry = () => {
  // Inicializa o Sentry apenas em ambiente de produção ou staging
  if (__DEV__ && !Constants.expoConfig?.extra?.enableSentryInDev) {
    console.log('Sentry desativado em ambiente de desenvolvimento');
    return;
  }

  Sentry.init({
    dsn: Constants.expoConfig?.extra?.sentryDsn || 'https://seuprojetoid@sentry.io/123456',
    enableInExpoDevelopment: Constants.expoConfig?.extra?.enableSentryInDev || false,
    debug: Constants.expoConfig?.extra?.sentryDebug || false,
    environment: Constants.expoConfig?.extra?.environment || 'production',
    release: `acucaradas-${Constants.expoConfig?.version}`,
    dist:
      Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.buildNumber
        : Constants.expoConfig?.android?.versionCode?.toString(),
    integrations: [
      new Sentry.Native.ReactNativeTracing({
        routingInstrumentation: new Sentry.Native.ReactNavigationInstrumentation(),
        tracingOrigins: ['localhost', 'api.acucaradas.com.br', /^\//],
      }),
    ],
    tracesSampleRate: Constants.expoConfig?.extra?.sentryTracesSampleRate || 0.2,
  });

  // Informação da versão do app para rastreamento
  Sentry.Native.setTags({
    appVersion: Constants.expoConfig?.version,
    expoVersion: Constants.expoConfig?.sdkVersion,
    platform: Platform.OS,
  });
};

export const captureException = (error: any, context?: Record<string, any>) => {
  // Evitar enviar erros para o Sentry em desenvolvimento
  if (__DEV__ && !Constants.expoConfig?.extra?.enableSentryInDev) {
    console.error('[DEV ERROR]', error);
    return;
  }

  if (context) {
    Sentry.Native.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.Native.captureException(error);
    });
  } else {
    Sentry.Native.captureException(error);
  }
};

export const captureMessage = (message: string, level: Sentry.Severity = Sentry.Severity.Info) => {
  // Evitar enviar mensagens para o Sentry em desenvolvimento
  if (__DEV__ && !Constants.expoConfig?.extra?.enableSentryInDev) {
    console.log(`[DEV ${level}]`, message);
    return;
  }

  Sentry.Native.captureMessage(message, level);
};

export const startTransaction = (name: string, op: string) => {
  return Sentry.Native.startTransaction({ name, op });
};

export default {
  initSentry,
  captureException,
  captureMessage,
  startTransaction,
};
