// 🔥 src/config/firebase.ts - Firebase JS-Only (Lazy-Getter Version)
// Esta versão usa apenas o SDK de JavaScript puro para evitar conflitos nativos no iOS.
// Substituídos Proxies por Lazy Getters para maior compatibilidade e estabilidade.

import { ENV } from './env';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

// 🛡️ [RECOVERY-LOG] Verificar se os dados vieram do Constants.expoConfig.extra (Fallback físico)
const extra = Constants.expoConfig?.extra || {};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.firebaseApiKey,
  authDomain: ENV.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: ENV.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "acucaradas-encomendas",
  storageBucket: ENV.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: ENV.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: ENV.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

// Singleton pattern seguro e 🚀 LAZY
let _app: any = null;
let _auth: any = null;
let _db: any = null;
let _storage: any = null;
let _messaging: any = null;

/**
 * Obtém a instância do Firebase App de forma preguiçosa
 */
export const getApp = () => {
  if (!_app) {
    console.log('🛡️ [FIREBASE] Initializing App Instance...');
    const configToUse = { ...firebaseConfig };
    
    // 🚨 [HOTFIX] Se a chave vier como XML
    if (configToUse.apiKey && configToUse.apiKey.includes('<?xml')) {
      const match = configToUse.apiKey.match(/<key>API_KEY<\/key>\s*<string>(.*)<\/string>/);
      if (match) configToUse.apiKey = match[1];
    }

    const { initializeApp, getApps } = require('firebase/app');
    const apps = getApps();
    _app = apps.length > 0 ? apps[0] : initializeApp(configToUse);
  }
  return _app;
};

export const getAuth = () => {
  if (!_auth) {
    const { initializeAuth, getReactNativePersistence, getAuth: getFirebaseAuth } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const app = getApp();
    try {
      _auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    } catch (e) {
      _auth = getFirebaseAuth(app);
    }
  }
  return _auth;
};

export const getDb = () => {
  if (!_db) {
    _db = require('firebase/firestore').getFirestore(getApp());
  }
  return _db;
};

export const getStorage = () => {
  if (!_storage) {
    _storage = require('firebase/storage').getStorage(getApp());
  }
  return _storage;
};

export const getMessaging = () => {
  if (!_messaging) {
    try {
      _messaging = require('firebase/messaging').getMessaging(getApp());
    } catch (e) {
      console.log('🛡️ [FIREBASE] Messaging not supported or failed to initialize');
      _messaging = null;
    }
  }
  return _messaging;
};

// 🛠️ Funções de Autenticação (Auto-Injected)
const firebaseAuthFunctions: any = {
  get signInWithEmailAndPassword() { 
    return (email: string, pass: string) => require('firebase/auth').signInWithEmailAndPassword(getAuth(), email, pass); 
  },
  get createUserWithEmailAndPassword() { 
    return (email: string, pass: string) => require('firebase/auth').createUserWithEmailAndPassword(getAuth(), email, pass); 
  },
  get signOut() { return () => require('firebase/auth').signOut(getAuth()); },
  get onAuthStateChanged() { 
    return (callback: any) => require('firebase/auth').onAuthStateChanged(getAuth(), callback); 
  },
  get sendPasswordResetEmail() { 
    return (email: string) => require('firebase/auth').sendPasswordResetEmail(getAuth(), email); 
  },
  get updateProfile() { 
    return (data: any) => require('firebase/auth').updateProfile(getAuth().currentUser, data); 
  },
  get sendEmailVerification() { 
    return () => require('firebase/auth').sendEmailVerification(getAuth().currentUser); 
  },
  get signInWithCredential() { 
    return (cred: any) => require('firebase/auth').signInWithCredential(getAuth(), cred); 
  },
  get GoogleAuthProvider() { return require('firebase/auth').GoogleAuthProvider; },
  get FacebookAuthProvider() { return require('firebase/auth').FacebookAuthProvider; },
  get OAuthProvider() { return require('firebase/auth').OAuthProvider; },
};
export { firebaseAuthFunctions as authFunctions };

const ENABLE_FIRESTORE_DEBUG = true;

const getFirestorePath = (refOrQuery: any): string => {
  if (!refOrQuery) return 'unknown';
  if (typeof refOrQuery === 'string') return refOrQuery;
  if (refOrQuery?.path) return refOrQuery.path;
  if (refOrQuery?.query?.path) return refOrQuery.query.path;
  if (refOrQuery?.parent?.path) return refOrQuery.parent.path;
  if (refOrQuery?.id && refOrQuery?.firestore) return `${refOrQuery.firestore?.app?.name || 'default'}/${refOrQuery.id}`;
  return refOrQuery.constructor?.name || 'unknown';
};

const getFirestorePathFromArgs = (args: any[]): string => {
  if (!args || args.length === 0) return 'unknown';
  if (typeof args[0] === 'string') {
    return args.filter((segment: any) => typeof segment === 'string').join('/');
  }
  if (args.length > 1 && typeof args[1] === 'string') {
    return [args[1], ...args.slice(2).filter((segment: any) => typeof segment === 'string')].join('/');
  }
  return getFirestorePath(args[0]);
};

export const logFirestoreOperation = ({
  operation,
  path,
  screen,
  uid,
}: {
  operation: string;
  path: string;
  screen?: string;
  uid?: string;
}) => {
  if (!ENABLE_FIRESTORE_DEBUG) return;
  console.log('[FS_CALL]', {
    operation,
    path,
    screen: screen || 'unknown',
    uid: uid || 'unknown',
    timestamp: new Date().toISOString(),
  });
};

export const logFirestoreDenied = ({
  operation,
  path,
  screen,
  error,
}: {
  operation: string;
  path: string;
  screen?: string;
  error: any;
}) => {
  if (!ENABLE_FIRESTORE_DEBUG) return;
  console.error('[FS_DENIED]', {
    operation,
    path,
    screen: screen || 'unknown',
    code: error?.code,
    message: error?.message,
    timestamp: new Date().toISOString(),
  });

  try {
    Sentry.captureMessage('[FS_DENIED]', {
      level: 'error',

      extra: {
        operation,
        path,
        screen: screen || 'unknown',
        context: screen || 'unknown',

        code: error?.code,
        message: error?.message,

        stack: error?.stack || 'NO_STACK',

        build:
          Constants?.expoConfig?.ios?.buildNumber ||
          Constants?.expoConfig?.android?.versionCode,
      },
    });

    console.log('[FS_DENIED_SENT_TO_SENTRY]');
  } catch (sentryError) {
    console.error('[FS_DENIED_SENTRY_FAILED]', sentryError);
  }
};

const wrapFirestoreCall = (operation: string, fn: any) => {
  return async (...args: any[]) => {
    const path = getFirestorePathFromArgs(args);
    logFirestoreOperation({ operation, path });
    try {
      return await fn(...args);
    } catch (error) {
      logFirestoreDenied({ operation, path, error });
      throw error;
    }
  };
};

// 🛠️ Funções de Banco de Dados (Auto-Injected)
export const dbFunctions: any = {
  get collection() {
    return (...args: any[]) => {
      if (typeof args[0] === 'string') {
        return require('firebase/firestore').collection(getDb(), ...args);
      }
      return require('firebase/firestore').collection(...args);
    };
  },
  get doc() {
    return (...args: any[]) => {
      if (typeof args[0] === 'string') {
        return require('firebase/firestore').doc(getDb(), ...args);
      }
      return require('firebase/firestore').doc(...args);
    };
  },
  get getDocs() { 
    return wrapFirestoreCall('getDocs', async (q: any) => {
      const path = getFirestorePath(q);
      console.log('[FS_GETDOCS_START]', {
        path,
        operation: 'getDocs',
        timestamp: new Date().toISOString(),
      });
      
      try {
        const result = await require('firebase/firestore').getDocs(q);
        console.log('[FS_GETDOCS_SUCCESS]', {
          path,
          docsCount: result.size,
          timestamp: new Date().toISOString(),
        });
        return result;
      } catch (error) {
        console.error('[FS_GETDOCS_DENIED]', {
          path,
          code: (error as any)?.code,
          message: (error as any)?.message,
          timestamp: new Date().toISOString(),
        });
        
        // Call showFirestoreDebug for getDocs queries
        if (typeof window !== 'undefined' && (window as any).showFirestoreDebug) {
          (window as any).showFirestoreDebug(path, error, 'GETDOCS_QUERY');
        }
        
        throw error;
      }
    });
  },
  get getDoc() { return wrapFirestoreCall('getDoc', (ref: any) => require('firebase/firestore').getDoc(ref)); },
  get setDoc() { return wrapFirestoreCall('setDoc', (ref: any, ...args: any[]) => require('firebase/firestore').setDoc(ref, ...args)); },
  get addDoc() { return wrapFirestoreCall('addDoc', (ref: any, ...args: any[]) => require('firebase/firestore').addDoc(ref, ...args)); },
  get updateDoc() { return wrapFirestoreCall('updateDoc', (ref: any, ...args: any[]) => require('firebase/firestore').updateDoc(ref, ...args)); },
  get deleteDoc() { return wrapFirestoreCall('deleteDoc', (ref: any) => require('firebase/firestore').deleteDoc(ref)); },
  get query() { 
    return (...args: any[]) => {
      // 🔍 [FS_QUERY] Log query construction with filters
      const collectionRef = args[0];
      const filters = args.slice(1);
      const collectionPath = getFirestorePath(collectionRef);
      
      console.log('[FS_QUERY]', {
        collection: collectionPath,
        filters: filters.map((filter: any, index: number) => {
          if (filter?._field && filter?._op && filter?._value !== undefined) {
            // where() filter
            return `where(${filter._field._fieldPath}, ${filter._op}, ${JSON.stringify(filter._value)})`;
          } else if (filter?._field && filter?._direction) {
            // orderBy() filter
            return `orderBy(${filter._field._fieldPath}, ${filter._direction})`;
          } else if (typeof filter === 'number') {
            // limit() filter
            return `limit(${filter})`;
          } else {
            // Unknown filter type
            return `unknown_filter_${index}`;
          }
        }),
        timestamp: new Date().toISOString(),
      });
      
      return require('firebase/firestore').query(...args);
    };
  },
  get where() { return (...args: any[]) => require('firebase/firestore').where(...args); },
  get orderBy() { return (...args: any[]) => require('firebase/firestore').orderBy(...args); },
  get limit() { return (...args: any[]) => require('firebase/firestore').limit(...args); },
  get startAfter() { return (...args: any[]) => require('firebase/firestore').startAfter(...args); },
  get onSnapshot() {
    return (refOrQuery: any, next: any, error?: any, complete?: any) => {
      const path = getFirestorePath(refOrQuery);
      console.log('[FS_LISTENER_START]', {
        path,
        operation: 'onSnapshot',
        timestamp: new Date().toISOString(),
      });
      
      return require('firebase/firestore').onSnapshot(
        refOrQuery,
        next,
        (err: any) => {
          console.error('[FS_LISTENER_DENIED]', {
            path,
            code: err?.code,
            message: err?.message,
            timestamp: new Date().toISOString(),
          });
          
          // Call showFirestoreDebug for listener queries
          if (typeof window !== 'undefined' && (window as any).showFirestoreDebug) {
            (window as any).showFirestoreDebug(path, err, 'LISTENER_QUERY');
          }
          
          if (error) error(err);
        },
        complete
      );
    };
  },
  get writeBatch() { return () => require('firebase/firestore').writeBatch(getDb()); },
  get runTransaction() { return (callback: any) => require('firebase/firestore').runTransaction(getDb(), callback); },
  get serverTimestamp() { return require('firebase/firestore').serverTimestamp; },
  get increment() { return require('firebase/firestore').increment; },
};

// Mapeamento curto para compatibilidade
export const a = firebaseAuthFunctions;
export const f = dbFunctions;
export const s = {
  get ref() { return (path?: string) => require('firebase/storage').ref(getStorage(), path); },
  get uploadBytes() { return (ref: any, data: any) => require('firebase/storage').uploadBytes(ref, data); },
  get getDownloadURL() { return (ref: any) => require('firebase/storage').getDownloadURL(ref); },
  get deleteObject() { return (ref: any) => require('firebase/storage').deleteObject(ref); },
};

// Proxies para instâncias (chamam getters por baixo)
export const auth: any = new Proxy({}, { get: (_, prop) => getAuth()[prop] });
export const db: any = new Proxy({}, { get: (_, prop) => getDb()[prop] });
export const storage: any = new Proxy({}, { get: (_, prop) => getStorage()[prop] });
export const messaging: any = new Proxy({}, { 
  get: (_, prop) => {
    const m = getMessaging();
    return m ? m[prop] : null;
  } 
});
