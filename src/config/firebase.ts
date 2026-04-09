// 🔥 src/config/firebase.ts - Firebase JS-Only (Anti-Crash Version)
// Esta versão usa apenas o SDK de JavaScript puro para evitar conflitos nativos no iOS.

import { ENV } from './env';

const firebaseConfig = {
  apiKey: ENV.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: ENV.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: ENV.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: ENV.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: ENV.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: ENV.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

// Singleton pattern seguro e 🚀 LAZY
// O objetivo aqui é NÃO importar 'firebase/auth', 'firebase/firestore', etc.
// na avaliação do módulo, para evitar que side effects nativos matem o app no boot.

// Variáveis para armazenar as instâncias dos SDKs
let _auth: any = null;
let _db: any = null;
let _messaging: any = null;
let _firestoreFunctions: any = null;
let _app: any = null;

// Flag global para permitir carregamento do Firebase apenas após o boot seguro
// @ts-ignore
if (typeof global.__FIREBASE_BOOT_ALLOWED__ === 'undefined') {
  // @ts-ignore
  global.__FIREBASE_BOOT_ALLOWED__ = false;
}

/**
 * Função interna para obter a instância do App
 */
const getAppInstance = () => {
  // Bloqueio de segurança: impede o carregamento prematuro do SDK
  // @ts-ignore
  if (!global.__FIREBASE_BOOT_ALLOWED__ && !__DEV__) {
    console.warn('🛡️ [FIREBASE] Bloqueio de carregamento prematuro! Tentativa de acesso antes do boot seguro.');
    throw new Error('Firebase access blocked during boot sequence for stability.');
  }

  if (!_app) {
    const { initializeApp, getApps } = require('firebase/app');
    const apps = getApps();
    if (apps.length > 0) {
      _app = apps[0];
    } else {
      console.log('🛡️ [FIREBASE] Initializing Firebase JS-Only Instance...');
      _app = initializeApp(firebaseConfig);
    }
  }
  return _app;
};

// Proxy para funções de Autenticação (a)
export const a: any = new Proxy({}, {
  get: (_target, prop) => {
    // Bloqueio de segurança: impede o carregamento prematuro do SDK
    // @ts-ignore
    if (!global.__FIREBASE_BOOT_ALLOWED__ && !__DEV__) {
      console.warn(`🛡️ [FIREBASE] Bloqueio de acesso a Auth.${prop.toString()} durante o boot.`);
      return () => { console.warn('Firebase Auth blocked'); return null; };
    }

    if (!_auth) {
      console.log('🛡️ [FIREBASE] Lazy Loading Auth Functions...');
      _auth = require('firebase/auth');
    }
    return _auth[prop];
  }
});

// Proxy para funções do Firestore (f)
export const f: any = new Proxy({}, {
  get: (_target, prop) => {
    // Bloqueio de segurança: impede o carregamento prematuro do SDK
    // @ts-ignore
    if (!global.__FIREBASE_BOOT_ALLOWED__ && !__DEV__) {
      console.warn(`🛡️ [FIREBASE] Bloqueio de acesso a Firestore.${prop.toString()} durante o boot.`);
      return () => { console.warn('Firebase Firestore blocked'); return null; };
    }

    if (!_firestoreFunctions) {
      console.log('🛡️ [FIREBASE] Lazy Loading Firestore Functions...');
      _firestoreFunctions = require('firebase/firestore');
    }
    return _firestoreFunctions[prop];
  }
});

// Exporta as instâncias lazy para compatibilidade
export const auth = new Proxy({}, {
  get: (_target, prop) => {
    // Bloqueio de segurança: impede o carregamento prematuro do SDK
    // @ts-ignore
    if (!global.__FIREBASE_BOOT_ALLOWED__ && !__DEV__) {
      return null;
    }

    const instance = getAppInstance();
    const { getAuth } = require('firebase/auth');
    const authInstance = getAuth(instance);
    const val = (authInstance as any)[prop];
    return typeof val === 'function' ? val.bind(authInstance) : val;
  }
}) as any;

export const db = new Proxy({}, {
  get: (_target, prop) => {
    // Bloqueio de segurança: impede o carregamento prematuro do SDK
    // @ts-ignore
    if (!global.__FIREBASE_BOOT_ALLOWED__ && !__DEV__) {
      return null;
    }

    const instance = getAppInstance();
    const { getFirestore } = require('firebase/firestore');
    const dbInstance = getFirestore(instance);
    const val = (dbInstance as any)[prop];
    return typeof val === 'function' ? val.bind(dbInstance) : val;
  }
}) as any;

export const messaging = new Proxy({}, {
  get: (_target, prop) => {
    // Bloqueio de segurança: impede o carregamento prematuro do SDK
    // @ts-ignore
    if (!global.__FIREBASE_BOOT_ALLOWED__ && !__DEV__) {
      return null;
    }

    const instance = getAppInstance();
    const { getMessaging } = require('firebase/messaging');
    const messagingInstance = getMessaging(instance);
    const val = (messagingInstance as any)[prop];
    return typeof val === 'function' ? val.bind(messagingInstance) : val;
  }
}) as any; 

