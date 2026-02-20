import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import { 
  getStorage, 
  FirebaseStorage 
} from 'firebase/storage';

const {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} = firestore as any;

type Firestore = any; // Fallback para o tipo
import { getAnalytics, isSupported } from 'firebase/analytics';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { LoggingService } from '../services/LoggingService';

const logger = LoggingService.getInstance();
const isTestEnv = process.env.NODE_ENV === 'test';

// Configuração do Firebase com suporte a múltiplos formatos de variáveis de ambiente
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    Constants.expoConfig?.extra?.firebaseApiKey ||
    'your-firebase-api-key',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.FIREBASE_AUTH_DOMAIN ||
    Constants.expoConfig?.extra?.firebaseAuthDomain ||
    'your-firebase-auth-domain',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    Constants.expoConfig?.extra?.firebaseProjectId ||
    'your-firebase-project-id',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    Constants.expoConfig?.extra?.firebaseStorageBucket ||
    'your-firebase-storage-bucket',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    Constants.expoConfig?.extra?.firebaseMessagingSenderId ||
    'your-firebase-messaging-sender-id',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    process.env.FIREBASE_APP_ID ||
    Constants.expoConfig?.extra?.firebaseAppId ||
    'your-firebase-app-id',
  measurementId:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    Constants.expoConfig?.extra?.firebaseMeasurementId ||
    'your-measurement-id',
};

// Declarando variáveis para exportação com valores iniciais para evitar erros de referência
let app: FirebaseApp = null as any;
let auth: Auth = null as any;
let db: Firestore = null as any;
let messaging: any = null;
let storage: FirebaseStorage = null as any;

const applyFallbackFirebase = () => {
  auth = {
    currentUser: null,
    onAuthStateChanged: (cb: any) => {
      try {
        cb(null);
      } catch {}
      return () => {};
    },
  } as any;

  db = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: true, data: () => ({ userType: 'customer' }) }),
        set: async () => {},
        update: async () => {},
      }),
      where: () => ({
        get: async () => ({ docs: [] }),
      }),
      add: async () => ({ id: 'mock-id' }),
    }),
    doc: () => ({
      get: async () => ({ exists: true, data: () => ({ userType: 'customer' }) }),
      set: async () => {},
      update: async () => {},
    }),
  } as any;
};

const isValid = (v?: string) => !!v && !String(v).startsWith('your-');
export const firebaseAvailable =
  isValid(firebaseConfig.apiKey) &&
  isValid(firebaseConfig.authDomain) &&
  isValid(firebaseConfig.projectId) &&
  isValid(firebaseConfig.appId);

// Inicializa Firebase com modo de verificação de erros
try {
  if (firebaseAvailable) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    try {
      auth.languageCode = 'pt-BR';
    } catch {}
    
    // Inicializa Firestore com configurações otimizadas
    if (Platform.OS === 'web') {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true,
      });
    } else {
      db = getFirestore(app);
    }
    

    storage = getStorage(app);

    if (Platform.OS === 'web') {
      try {
        const { getMessaging, isSupported } = require('firebase/messaging');
        isSupported()
          .then((supported: boolean) => {
            if (supported) {
              messaging = getMessaging(app);
            }
          })
          .catch(() => {});
      } catch {}
    } else {
      messaging = null;
    }

    logger.info(`Firebase initialized successfully on ${Platform.OS}`);
  } else {
    logger.error('Firebase configuration is invalid. Firebase features will be disabled.');
    applyFallbackFirebase();
  }
} catch (error: any) {
  logger.error('Firebase initialization error', error);
  applyFallbackFirebase();
}

// Exportar as variáveis após a inicialização
export { app, auth, db, messaging, storage };

// Initialize Analytics conditionally
export const analytics =
  process.env.NODE_ENV === 'test'
    ? null // Mock para testes
    : isSupported().then(yes => (yes ? getAnalytics(app) : null));
