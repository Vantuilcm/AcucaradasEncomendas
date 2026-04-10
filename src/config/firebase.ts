// 🔥 src/config/firebase.ts - Firebase JS-Only (Lazy-Getter Version)
// Esta versão usa apenas o SDK de JavaScript puro para evitar conflitos nativos no iOS.
// Substituídos Proxies por Lazy Getters para maior compatibilidade e estabilidade.

import { ENV } from './env';

// 🚨 DEBUG: Log das variáveis brutas vindas do ENV
console.log('🧪 [FIREBASE_CONFIG_DEBUG] EXPO_PUBLIC_FIREBASE_API_KEY:', ENV.EXPO_PUBLIC_FIREBASE_API_KEY ? `CHAVE_OK (${ENV.EXPO_PUBLIC_FIREBASE_API_KEY.substring(0, 10)}...)` : 'CHAVE_AUSENTE');
console.log('🧪 [FIREBASE_CONFIG_DEBUG] EXPO_PUBLIC_FIREBASE_PROJECT_ID:', ENV.EXPO_PUBLIC_FIREBASE_PROJECT_ID);

// 🛡️ [RECOVERY-LOG] Verificar se os dados vieram do Constants.expoConfig.extra (Fallback físico)
import Constants from 'expo-constants';
const extra = Constants.expoConfig?.extra || {};
if (!ENV.EXPO_PUBLIC_FIREBASE_API_KEY && extra.firebaseApiKey) {
  console.log('🩹 [FIREBASE_RECOVERY] API Key successfully recovered from Expo Extra (app.config.js fallback)');
  console.log('🩹 [FIREBASE_RECOVERY] Key recovered:', `${extra.firebaseApiKey.substring(0, 10)}...`);
}

// ⚠️ TESTE HARDCODED (ETAPA 3) - Se o build falhar com "invalid-api-key", 
// você pode colocar a chave real aqui temporariamente para isolar se o problema é a injeção do ENV.
const HARDCODED_API_KEY = ""; // <--- COLOQUE A CHAVE AQUI SE O ENV ESTIVER VINDO UNDEFINED

const firebaseConfig = {
  apiKey: HARDCODED_API_KEY || ENV.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: ENV.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: ENV.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
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

/**
 * Obtém a instância do Firebase App de forma preguiçosa
 */
export const getApp = () => {
  if (!_app) {
    console.log('🛡️ [FIREBASE] Initializing App Instance...');
    const configToUse = { ...firebaseConfig };
    
    // Fallback de recuperação de Project ID
    const EXPECTED_PROJECT_ID = 'acucaradas-encomendas';
    if (!configToUse.projectId || configToUse.projectId.length < 5) {
      configToUse.projectId = EXPECTED_PROJECT_ID;
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

// 🛠️ Proxy de Funções (Lazy-Loaded e Argument-Safe)
export const authFunctions: any = {
  get signInWithEmailAndPassword() { return require('firebase/auth').signInWithEmailAndPassword; },
  get createUserWithEmailAndPassword() { return require('firebase/auth').createUserWithEmailAndPassword; },
  get signOut() { return require('firebase/auth').signOut; },
  get onAuthStateChanged() { return require('firebase/auth').onAuthStateChanged; },
  get sendPasswordResetEmail() { return require('firebase/auth').sendPasswordResetEmail; },
  get updateProfile() { return require('firebase/auth').updateProfile; },
  get sendEmailVerification() { return require('firebase/auth').sendEmailVerification; },
  get signInWithCredential() { return require('firebase/auth').signInWithCredential; },
  get GoogleAuthProvider() { return require('firebase/auth').GoogleAuthProvider; },
  get FacebookAuthProvider() { return require('firebase/auth').FacebookAuthProvider; },
  get OAuthProvider() { return require('firebase/auth').OAuthProvider; },
};

export const dbFunctions: any = {
  get collection() { return (path: string) => {
    const firestore = require('firebase/firestore');
    return firestore.collection(getDb(), path);
  }; },
  get doc() { return (path: string, ...rest: string[]) => {
    const firestore = require('firebase/firestore');
    return firestore.doc(getDb(), path, ...rest);
  }; },
  get getDocs() { return (q: any) => require('firebase/firestore').getDocs(q); },
  get getDoc() { return (ref: any) => require('firebase/firestore').getDoc(ref); },
  get setDoc() { return (ref: any, ...args: any[]) => require('firebase/firestore').setDoc(ref, ...args); },
  get addDoc() { return (ref: any, ...args: any[]) => require('firebase/firestore').addDoc(ref, ...args); },
  get updateDoc() { return (ref: any, ...args: any[]) => require('firebase/firestore').updateDoc(ref, ...args); },
  get deleteDoc() { return (ref: any) => require('firebase/firestore').deleteDoc(ref); },
  get query() { return (...args: any[]) => require('firebase/firestore').query(...args); },
  get where() { return (...args: any[]) => require('firebase/firestore').where(...args); },
  get orderBy() { return (...args: any[]) => require('firebase/firestore').orderBy(...args); },
  get limit() { return (...args: any[]) => require('firebase/firestore').limit(...args); },
  get startAfter() { return (...args: any[]) => require('firebase/firestore').startAfter(...args); },
  get onSnapshot() { 
    return (ref: any, ...args: any[]) => {
      const firestore = require('firebase/firestore');
      return firestore.onSnapshot(ref, ...args);
    };
  },
  get writeBatch() { return () => require('firebase/firestore').writeBatch(getDb()); },
  get runTransaction() { return (callback: any) => require('firebase/firestore').runTransaction(getDb(), callback); },
  get serverTimestamp() { return require('firebase/firestore').serverTimestamp; },
};

export const storageFunctions: any = {
  get ref() { return (path?: string) => require('firebase/storage').ref(getStorage(), path); },
  get uploadBytes() { return require('firebase/storage').uploadBytes; },
  get getDownloadURL() { return require('firebase/storage').getDownloadURL; },
  get deleteObject() { return require('firebase/storage').deleteObject; },
};

export const a = authFunctions;
export const f = dbFunctions;
export const s = storageFunctions;

export const auth: any = new Proxy({}, { get: (_, prop) => getAuth()[prop] });
export const db: any = new Proxy({}, { get: (_, prop) => getDb()[prop] });
export const storage: any = new Proxy({}, { get: (_, prop) => getStorage()[prop] });
