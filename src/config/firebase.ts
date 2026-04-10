// 🔥 src/config/firebase.ts - Firebase JS-Only (Lazy-Getter Version)
// Esta versão usa apenas o SDK de JavaScript puro para evitar conflitos nativos no iOS.
// Substituídos Proxies por Lazy Getters para maior compatibilidade e estabilidade.

import { ENV } from './env';
import Constants from 'expo-constants';

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

// 🛠️ Funções de Autenticação (Auto-Injected)
export const authFunctions: any = {
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

// 🛠️ Funções de Banco de Dados (Auto-Injected)
export const dbFunctions: any = {
  get collection() { return (path: string) => require('firebase/firestore').collection(getDb(), path); },
  get doc() { return (path: string, ...rest: string[]) => require('firebase/firestore').doc(getDb(), path, ...rest); },
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
  get onSnapshot() { return (...args: any[]) => require('firebase/firestore').onSnapshot(...args); },
  get writeBatch() { return () => require('firebase/firestore').writeBatch(getDb()); },
  get runTransaction() { return (callback: any) => require('firebase/firestore').runTransaction(getDb(), callback); },
  get serverTimestamp() { return require('firebase/firestore').serverTimestamp; },
};

// Mapeamento curto para compatibilidade
export const a = authFunctions;
export const f = dbFunctions;

// Proxies para instâncias (chamam getters por baixo)
export const auth: any = new Proxy({}, { get: (_, prop) => getAuth()[prop] });
export const db: any = new Proxy({}, { get: (_, prop) => getDb()[prop] });
export const storage: any = new Proxy({}, { get: (_, prop) => getStorage()[prop] });
