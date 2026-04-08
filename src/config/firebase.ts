// 🔥 src/config/firebase.ts - Firebase JS-Only (Anti-Crash Version)
// Esta versão usa apenas o SDK de JavaScript puro para evitar conflitos nativos no iOS.

import { getApps, initializeApp } from 'firebase/app';
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

let _app: any = null;
let _auth: any = null;
let _db: any = null;
let _storage: any = null;
let _authFunctions: any = null;
let _firestoreFunctions: any = null;

const getAppInstance = () => {
  if (!_app) {
    console.log('🛡️ [FIREBASE] Lazy Initialization: App...');
    const apps = getApps();
    _app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
  }
  return _app;
};

// Exportar objetos que fingem ser os reais mas só inicializam quando acessados
export const app = new Proxy({}, {
  get: (_, prop) => getAppInstance()[prop]
}) as any;

export const auth = new Proxy({}, {
  get: (target, prop) => {
    if (!_auth) {
      console.log('🛡️ [FIREBASE] Lazy Initialization: Auth...');
      const { getAuth } = require('firebase/auth');
      _auth = getAuth(getAppInstance());
    }
    const val = _auth[prop];
    return typeof val === 'function' ? val.bind(_auth) : val;
  }
}) as any;

export const db = new Proxy({}, {
  get: (target, prop) => {
    if (!_db) {
      console.log('🛡️ [FIREBASE] Lazy Initialization: Firestore...');
      const { getFirestore } = require('firebase/firestore');
      _db = getFirestore(getAppInstance());
    }
    const val = _db[prop];
    return typeof val === 'function' ? val.bind(_db) : val;
  }
}) as any;

export const storage = new Proxy({}, {
  get: (target, prop) => {
    if (!_storage) {
      console.log('🛡️ [FIREBASE] Lazy Initialization: Storage...');
      const { getStorage } = require('firebase/storage');
      _storage = getStorage(getAppInstance());
    }
    const val = _storage[prop];
    return typeof val === 'function' ? val.bind(_storage) : val;
  }
}) as any;

// 🚀 FUNÇÕES LAZY (Ponte para todas as funções do Firebase)
// Permite importar functions como 'collection', 'query', 'signInWithEmailAndPassword'
// sem que o Metro Bundler avalie o módulo 'firebase/firestore' ou 'firebase/auth' no boot.

export const f: any = new Proxy({}, {
  get: (target, prop) => {
    if (!_firestoreFunctions) {
      console.log('🛡️ [FIREBASE] Lazy Loading Firestore Functions...');
      _firestoreFunctions = require('firebase/firestore');
    }
    return _firestoreFunctions[prop];
  }
});

export const a: any = new Proxy({}, {
  get: (target, prop) => {
    if (!_authFunctions) {
      console.log('🛡️ [FIREBASE] Lazy Loading Auth Functions...');
      _authFunctions = require('firebase/auth');
    }
    return _authFunctions[prop];
  }
});

export const messaging = null; 

