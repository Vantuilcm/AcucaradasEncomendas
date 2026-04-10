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

// 🛡️ VALIDAÇÃO DE RUNTIME
if (!firebaseConfig.apiKey) {
  console.error('❌ [FIREBASE_CRITICAL] API KEY IS MISSING IN CONFIG OBJECT!');
}

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
    
    // Validação profunda da API Key
    const configToUse = { ...firebaseConfig };
    
    // Log completo do config (mascarado)
    console.log('🛡️ [FIREBASE] Config used for initialization:', {
      ...configToUse,
      apiKey: configToUse.apiKey ? `${configToUse.apiKey.substring(0, 5)}...${configToUse.apiKey.substring(configToUse.apiKey.length - 5)}` : 'MISSING'
    });
    if (!configToUse.apiKey || configToUse.apiKey.length < 10) {
      console.error('❌ [FIREBASE] FATAL: API Key is INVALID in firebaseConfig!', configToUse.apiKey);
      // Tentativa de recuperação via process.env direto (último recurso)
      const fallbackKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
      if (fallbackKey && fallbackKey.length > 10) {
        console.log('🩹 [FIREBASE] Recovered API Key from process.env fallback');
        configToUse.apiKey = fallbackKey;
      }
    } else {
      console.log('🛡️ [FIREBASE] API Key looks valid. Starts with:', configToUse.apiKey.substring(0, 5) + '...');
    }
    
    console.log('🛡️ [FIREBASE] Final Config Check - ProjectId:', configToUse.projectId);
    
    // 🔍 ETAPA 1 & 2: Validar se o Project ID é o esperado (acucaradas-encomendas)
    const EXPECTED_PROJECT_ID = 'acucaradas-encomendas';
    if (configToUse.projectId !== EXPECTED_PROJECT_ID) {
      console.warn(`⚠️ [FIREBASE_PROJECT_MISMATCH] Detectado: ${configToUse.projectId} | Esperado: ${EXPECTED_PROJECT_ID}`);
      // ETAPA 3: Forçar o projeto original se houver erro de injeção
      if (!configToUse.projectId || configToUse.projectId.length < 5) {
        console.log(`🩹 [FIREBASE_PROJECT_RECOVERY] Forçando Project ID original: ${EXPECTED_PROJECT_ID}`);
        configToUse.projectId = EXPECTED_PROJECT_ID;
      }
    }
    
    const { initializeApp, getApps } = require('firebase/app');
    const apps = getApps();
    _app = apps.length > 0 ? apps[0] : initializeApp(configToUse);
  }
  return _app;
};

/**
 * 🛡️ Lazy Getter para Auth
 */
export const getAuth = () => {
  if (!_auth) {
    console.log('🛡️ [FIREBASE] Initializing Auth Instance...');
    const { initializeAuth, getReactNativePersistence, getAuth: getFirebaseAuth } = require('firebase/auth');
    const storageModule = require('@react-native-async-storage/async-storage');
    const AsyncStorage = storageModule.default || storageModule;
    const app = getApp();

    try {
      if (AsyncStorage) {
        _auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
        console.log('✅ [FIREBASE] Auth initialized with AsyncStorage');
      } else {
        _auth = getFirebaseAuth(app);
        console.warn('⚠️ [FIREBASE] AsyncStorage not found, using memory persistence');
      }
    } catch (e) {
      console.error('❌ [FIREBASE] Auth init error, falling back:', e);
      _auth = getFirebaseAuth(app);
    }
  }
  return _auth;
};

/**
 * 🛡️ Lazy Getter para Firestore
 */
export const getDb = () => {
  if (!_db) {
    console.log('🛡️ [FIREBASE] Initializing Firestore Instance...');
    const { getFirestore } = require('firebase/firestore');
    _db = getFirestore(getApp());
  }
  return _db;
};

/**
 * 🛡️ Lazy Getter para Storage
 */
export const getStorage = () => {
  if (!_storage) {
    console.log('🛡️ [FIREBASE] Initializing Storage Instance...');
    const { getStorage: getFirebaseStorage } = require('firebase/storage');
    _storage = getFirebaseStorage(getApp());
  }
  return _storage;
};

// Exportar funções auxiliares do Firebase SDK de forma Lazy
// Isso permite que chamemos 'authFunctions.signInWithEmailAndPassword' sem importar no topo
export const authFunctions = {
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

export const dbFunctions = {
  get doc() { return require('firebase/firestore').doc; },
  get getDoc() { return require('firebase/firestore').getDoc; },
  get setDoc() { return require('firebase/firestore').setDoc; },
  get updateDoc() { return require('firebase/firestore').updateDoc; },
  get collection() { return require('firebase/firestore').collection; },
  get query() { return require('firebase/firestore').query; },
  get where() { return require('firebase/firestore').where; },
  get getDocs() { return require('firebase/firestore').getDocs; },
  get addDoc() { return require('firebase/firestore').addDoc; },
  get deleteDoc() { return require('firebase/firestore').deleteDoc; },
  get serverTimestamp() { return require('firebase/firestore').serverTimestamp; },
  get onSnapshot() { return require('firebase/firestore').onSnapshot; },
  get orderBy() { return require('firebase/firestore').orderBy; },
  get limit() { return require('firebase/firestore').limit; },
};

export const storageFunctions = {
  get ref() { return require('firebase/storage').ref; },
  get uploadBytes() { return require('firebase/storage').uploadBytes; },
  get getDownloadURL() { return require('firebase/storage').getDownloadURL; },
  get deleteObject() { return require('firebase/storage').deleteObject; },
};

// Mapeamento para compatibilidade (a, f, s) para facilitar migração gradual
export const a = authFunctions;
export const f = dbFunctions;
export const s = storageFunctions;

// Instâncias para compatibilidade real (chamam getAuth/getDb por baixo)
export const auth: any = new Proxy({}, {
  get: (_, prop) => {
    const instance = getAuth();
    return instance[prop];
  }
});

export const db: any = new Proxy({}, {
  get: (_, prop) => {
    const instance = getDb();
    return instance[prop];
  }
});

export const storage: any = new Proxy({}, {
  get: (_, prop) => {
    const instance = getStorage();
    return instance[prop];
  }
});

