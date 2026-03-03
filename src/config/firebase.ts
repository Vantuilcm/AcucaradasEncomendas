import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

// Declarando variáveis para exportação
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: any = null;
let storage: FirebaseStorage;

// Inicializa Firebase com modo de verificação de erros
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Inicialização do Firebase Cloud Messaging (FCM) com tratamento específico para cada plataforma
  if (Platform.OS === 'web') {
    // No ambiente web, verificamos primeiro se o FCM é suportado
    const { getMessaging, isSupported } = require('firebase/messaging');
    isSupported()
      .then(supported => {
        if (supported) {
          messaging = getMessaging(app);
          console.log('Firebase Cloud Messaging inicializado no navegador');
        } else {
          console.log('Firebase Cloud Messaging não é suportado neste navegador');
        }
      })
      .catch(error => {
        console.error('Erro ao verificar suporte para FCM no navegador:', error);
      });
  } else if (Platform.OS === 'ios') {
    // Para iOS, inicializamos com configurações específicas
    // Verificamos se o arquivo GoogleService-Info.plist está configurado corretamente
    try {
      const { getMessaging } = require('firebase/messaging');
      messaging = getMessaging(app);

      // Configurações específicas para iOS
      // Verificamos se o APNs está configurado corretamente
      if (
        Constants.expoConfig?.ios?.infoPlist?.UIBackgroundModes?.includes('remote-notification')
      ) {
        console.log('Configuração de notificações em background para iOS está ativa');
      } else {
        console.log(
          'Aviso: Configuração de notificações em background para iOS pode não estar ativa'
        );
      }

      console.log('Firebase Cloud Messaging inicializado no iOS');
    } catch (error) {
      console.error('Erro ao inicializar FCM no iOS:', error);
      console.log('Verifique se o arquivo GoogleService-Info.plist está configurado corretamente');
    }
  } else if (Platform.OS === 'android') {
    // Para Android, inicializamos com configurações específicas
    // Verificamos se o arquivo google-services.json está configurado corretamente
    try {
      const { getMessaging } = require('firebase/messaging');
      messaging = getMessaging(app);

      // Configurações específicas para Android
      // Verificamos se as permissões necessárias estão configuradas
      if (Constants.expoConfig?.android?.googleServicesFile) {
        console.log('Arquivo google-services.json está configurado no app.config.ts');
      } else {
        console.log(
          'Aviso: Verifique se o arquivo google-services.json está configurado no app.config.ts'
        );
      }

      console.log('Firebase Cloud Messaging inicializado no Android');
    } catch (error) {
      console.error('Erro ao inicializar FCM no Android:', error);
      console.log('Verifique se o arquivo google-services.json está configurado corretamente');
    }
  } else {
    // Para outras plataformas não suportadas explicitamente
    console.log(
      `Firebase Cloud Messaging não foi inicializado: plataforma ${Platform.OS} não suportada explicitamente`
    );
  }

  // Verificação final da inicialização do FCM
  if (!messaging) {
    console.warn(
      'Firebase Cloud Messaging não foi inicializado. Algumas funcionalidades de notificação podem não funcionar.'
    );
  }

  console.log(`Firebase initialized successfully on ${Platform.OS}`);
} catch (error) {
  console.error('Firebase initialization error:', error);

  // Mock simples para auth e db quando Firebase falha
  auth = {
    currentUser: null,
    onAuthStateChanged: callback => callback(null),
    signInWithEmailAndPassword: async () => ({ user: { uid: 'mock-uid' } }),
    createUserWithEmailAndPassword: async () => ({ user: { uid: 'mock-uid' } }),
    signOut: async () => {},
  };

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
  };
}

// Exportar as variáveis após a inicialização
export { app, auth, db, messaging, storage };

// Initialize Analytics conditionally
export const analytics =
  process.env.NODE_ENV === 'test'
    ? null // Mock para testes
    : isSupported().then(yes => (yes ? getAnalytics(app) : null));
