// 🔥 src/config/firebase.ts - Firebase Hardened (Resiliência Total)
// REMOVE todos os mocks e usa o ENV centralizado para garantir funcionamento real.

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
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

// Singleton pattern para evitar dupla inicialização
let app: FirebaseApp;
try {
  if (getApps().length === 0) {
    console.log('🔥 [FIREBASE] Inicializando app principal...');
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
} catch (e) {
  console.error('❌ [FIREBASE] Erro fatal na inicialização:', e);
  // @ts-ignore
  app = {} as FirebaseApp;
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const messaging: any = null; // Placeholder para FCM

// Analytics condicional (não disponível em todos os ambientes)
const analytics = isSupported().then(yes => (yes ? getAnalytics(app) : null));

export { app, auth, db, messaging, storage, analytics };
