// Jest mock for our app-level firebase config module
export const app = {} as any;
export const auth = {
  currentUser: null,
  onAuthStateChanged: jest.fn(cb => {
    cb(null);
    return jest.fn(); // unsubscribe
  }),
  signInWithEmailAndPassword: jest.fn(async () => ({ user: { uid: 'mock-uid' } })),
  createUserWithEmailAndPassword: jest.fn(async () => ({ user: { uid: 'mock-uid' } })),
  signOut: jest.fn(async () => undefined),
} as any;

export const db = {} as any;
export const messaging = null as any;
export const storage = {} as any;
export const analytics = null as any;
