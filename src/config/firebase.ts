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

// Variáveis para armazenar as instâncias dos SDKs (Singleton)
let _app: any = null;
let _auth: any = null;
let _db: any = null;
let _messaging: any = null;
let _authModule: any = null;
let _firestoreModule: any = null;

/**
 * Obtém a instância do Firebase App de forma preguiçosa
 */
const getAppInstance = () => {
  try {
    if (!_app) {
      console.log('🛡️ [FIREBASE] Initializing App Instance...');
      const { initializeApp, getApps } = require('firebase/app');
      const apps = getApps();
      _app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
      console.log('🛡️ [FIREBASE] App Instance initialized successfully.');
    }
    return _app;
  } catch (error) {
    console.error('❌ [FIREBASE] Error initializing App Instance:', error);
    throw error;
  }
};

/**
 * 🚀 Proxy para Funções do Firebase (a e f)
 */
export const a: any = new Proxy({}, {
  get: (_target, prop) => {
    try {
      if (!_authModule) {
        console.log('🛡️ [FIREBASE] Lazy Loading Auth Module...');
        _authModule = require('firebase/auth');
      }
      const val = _authModule[prop];
      // Se for uma função que aceita auth como primeiro argumento, retornamos o wrapper
      if (typeof val === 'function') {
        return (...args: any[]) => {
          // Se o primeiro argumento for o nosso proxy de auth, extraímos o real
          if (args[0] && args[0].__isProxy && _auth) {
            args[0] = _auth;
          }
          return val(...args);
        };
      }
      return val;
    } catch (error) {
      console.error(`❌ [FIREBASE] Error loading Auth property ${prop.toString()}:`, error);
      return () => { console.error('Auth function failed'); return null; };
    }
  }
});

export const f: any = new Proxy({}, {
  get: (_target, prop) => {
    try {
      if (!_firestoreModule) {
        console.log('🛡️ [FIREBASE] Lazy Loading Firestore Module...');
        _firestoreModule = require('firebase/firestore');
      }
      const val = _firestoreModule[prop];
      if (typeof val === 'function') {
        return (...args: any[]) => {
          // Desembrulhar proxies de db ou refs se passados como argumentos
          args = args.map(arg => {
            if (arg && arg.__isProxy) {
              if (arg === db && _db) return _db;
              // Aqui poderíamos adicionar lógica para refs de documentos se necessário
            }
            return arg;
          });
          return val(...args);
        };
      }
      return val;
    } catch (error) {
      console.error(`❌ [FIREBASE] Error loading Firestore property ${prop.toString()}:`, error);
      return () => { console.error('Firestore function failed'); return null; };
    }
  }
});

/**
 * 🛡️ Instâncias Lazy (auth, db, messaging)
 */
export const auth: any = new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__isProxy') return true;
    if (prop === 'toJSON') return () => ({});
    
    try {
      if (!_auth) {
        console.log('🛡️ [FIREBASE] Initializing Auth Instance...');
        const { initializeAuth, getReactNativePersistence, getAuth } = require('firebase/auth');
        const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
        const instance = getAppInstance();
        
        try {
          _auth = initializeAuth(instance, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage)
          });
        } catch (e) {
          _auth = getAuth(instance);
        }
      }
      
      const val = _auth[prop];
      if (typeof val === 'function') {
        return val.bind(_auth);
      }
      return val;
    } catch (error) {
      return null;
    }
  },
  // Delegar operações fundamentais para o objeto real
  getPrototypeOf: () => {
    if (!_auth) return Object.prototype;
    return Object.getPrototypeOf(_auth);
  }
});

export const db: any = new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__isProxy') return true;
    
    try {
      if (!_db) {
        console.log('🛡️ [FIREBASE] Initializing Firestore Instance...');
        const { getFirestore } = require('firebase/firestore');
        const instance = getAppInstance();
        _db = getFirestore(instance);
      }
      
      const val = _db[prop];
      if (typeof val === 'function') {
        return val.bind(_db);
      }
      return val;
    } catch (error) {
      return null;
    }
  },
  getPrototypeOf: () => {
    if (!_db) return Object.prototype;
    return Object.getPrototypeOf(_db);
  }
});

export const messaging = new Proxy({}, {
  get: (_target, prop) => {
    if (!_messaging) {
      try {
        const instance = getAppInstance();
        const { getMessaging } = require('firebase/messaging');
        _messaging = getMessaging(instance);
      } catch (e) {
        return null;
      }
    }
    const val = _messaging[prop];
    return typeof val === 'function' ? val.bind(_messaging) : val;
  }
}) as any; 

