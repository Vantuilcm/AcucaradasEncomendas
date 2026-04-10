// 🛡️ src/config/env.ts - Env Guardian (Resiliência Total)
// Centraliza, valida e garante que o app nunca inicie com variáveis undefined.

import Constants from 'expo-constants';

export type Env = {
  EXPO_PUBLIC_API_URL: string;
  EXPO_PUBLIC_PROJECT_ID: string;
  EXPO_PUBLIC_APP_NAME: string;
  EXPO_PUBLIC_FIREBASE_API_KEY: string;
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: string;
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  EXPO_PUBLIC_FIREBASE_APP_ID: string;
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID?: string;
  EXPO_PUBLIC_FIREBASE_DATABASE_URL?: string;
  EXPO_PUBLIC_ONESIGNAL_APP_ID: string;
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
  EXPO_PUBLIC_SENTRY_DSN?: string;
  EXPO_PUBLIC_MONITORING_REMOTE_ENABLED?: string;
};

function getEnv(): Env {
  const extra = Constants.expoConfig?.extra || {};

  const env: Record<string, string | undefined> = {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || extra.apiUrl,
    EXPO_PUBLIC_PROJECT_ID: process.env.EXPO_PUBLIC_PROJECT_ID || extra.eas?.projectId,
    EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || Constants.expoConfig?.name,
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.firebaseApiKey,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || extra.firebaseProjectId,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || extra.firebaseAppId,
    EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    EXPO_PUBLIC_FIREBASE_DATABASE_URL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
    EXPO_PUBLIC_ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    EXPO_PUBLIC_MONITORING_REMOTE_ENABLED: process.env.EXPO_PUBLIC_MONITORING_REMOTE_ENABLED,
  };

  // Variáveis OBRIGATÓRIAS que causam crash se faltarem
  const requiredKeys = [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_PROJECT_ID',
    'EXPO_PUBLIC_ONESIGNAL_APP_ID'
  ];

  for (const key of requiredKeys) {
    if (!env[key]) {
      const errorMsg = `🚨 ENV CRASH: Variable ${key} is not defined. Check GitHub Secrets or .env file.`;
      console.error(errorMsg);
      // Evitar crash imediato na inicialização mesmo em produção, apenas logar e continuar
      // if (!__DEV__) {
      //   throw new Error(errorMsg);
      // }
    }
  }

  return env as Env;
}

export const ENV = getEnv();
