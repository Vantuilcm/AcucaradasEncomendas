// 🛡️ ZeroNativeCrashRecoveryAI - Fase 1.3.8: Firebase MOCK (Zero Imports)
// Este arquivo substitui temporariamente o Firebase real para isolar o crash de importação.

console.log('🛡️ [FIREBASE] Mock mode active. Zero external imports.');

const app = {} as any;
const auth = {} as any;
const db = {
  collection: () => ({ doc: () => ({ get: () => Promise.resolve({ exists: () => false }) }) })
} as any;
const messaging = null as any;
const storage = {} as any;
const analytics = Promise.resolve(null);

export { app, auth, db, messaging, storage, analytics };
