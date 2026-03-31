import { initializeApp, FirebaseApp } from 'firebase/app';
// @ts-ignore
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Helper para validar variáveis críticas de forma segura
const getEnvVar = (expoKey: string, nodeKey: string, fallbackKey: string, name: string): string => {
  const value = process.env[expoKey] || process.env[nodeKey] || Constants.expoConfig?.extra?.[fallbackKey];
  
  // Se for nulo, vazio, ou o valor padrão (mock), avisamos mas não travamos a inicialização aqui
  if (!value || value.includes('your-')) {
    const errorMsg = `CRITICAL ERROR: Variável de ambiente faltando para ${name}. Verifique seu arquivo .env ou segredos do EAS.`;
    console.error(errorMsg);
    // Em vez de throw, retornamos uma string vazia para evitar crash na inicialização do módulo
    return '';
  }
  
  return value;
};

// Configuração do Firebase com suporte a múltiplos formatos de variáveis de ambiente e validação
const firebaseConfig = {
  apiKey: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY', 'firebaseApiKey', 'API Key'),
  authDomain: getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN', 'firebaseAuthDomain', 'Auth Domain'),
  projectId: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID', 'firebaseProjectId', 'Project ID'),
  storageBucket: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET', 'firebaseStorageBucket', 'Storage Bucket'),
  messagingSenderId: getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID', 'firebaseMessagingSenderId', 'Messaging Sender ID'),
  appId: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_APP_ID', 'firebaseAppId', 'App ID'),
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || Constants.expoConfig?.extra?.firebaseMeasurementId || undefined,
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
      .then((supported: boolean) => {
        if (supported) {
          messaging = getMessaging(app);
          console.log('Firebase Cloud Messaging inicializado no navegador');
        } else {
          console.log('Firebase Cloud Messaging não é suportado neste navegador');
        }
      })
      .catch((error: any) => {
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
  console.error('CRITICAL: Firebase initialization error:', error);

  // Em vez de throw, vamos apenas logar o erro. 
  // O app pode tentar rodar, mas as chamadas ao Firebase falharão (o que é melhor que crash na splash screen)
  console.warn('Falha ao inicializar o Firebase. Algumas funcionalidades não estarão disponíveis.');
}

// Exportar as variáveis após a inicialização
export { app, auth, db, messaging, storage };

// Initialize Analytics conditionally
export const analytics =
  process.env.NODE_ENV === 'test'
    ? null // Mock para testes
    : isSupported().then(yes => (yes ? getAnalytics(app) : null));
