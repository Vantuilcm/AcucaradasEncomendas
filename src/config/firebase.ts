// 🔥 src/config/firebase.ts - Firebase JS-Only (Anti-Crash Version)
// Esta versão usa apenas o SDK de JavaScript puro para evitar conflitos nativos no iOS.

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
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

// Singleton pattern seguro
let app: FirebaseApp;
if (getApps().length === 0) {
  console.log('🛡️ [FIREBASE] Inicializando JS-SDK (Zero Native)...');
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = null; // Desativado para evitar crash nativo de FCM
export { app };
