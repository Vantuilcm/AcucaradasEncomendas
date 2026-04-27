// Mock environment variables
process.env.JWT_SECRET = 'test-secret';

// Polyfill for Firebase Functions usage of self
if (typeof global.self === 'undefined') {
  (global as any).self = global;
}

import 'react-native-gesture-handler/jestSetup';

// Mock timers
jest.mock('scheduler', () => require('scheduler/unstable_mock'));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn().mockReturnValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  addEventListener: jest.fn(),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
}));

// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const SafeAreaInsetsContext = React.createContext(inset);
  const SafeAreaFrameContext = React.createContext({ x: 0, y: 0, width: 390, height: 844 });
  
  return {
    __esModule: true,
    default: SafeAreaInsetsContext,
    SafeAreaProvider: jest.fn(({ children }) => children),
    SafeAreaConsumer: SafeAreaInsetsContext.Consumer,
    SafeAreaContext: SafeAreaInsetsContext,
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    SafeAreaView: jest.fn(({ children, ...props }) => React.createElement(View, props, children)),
    useSafeAreaInsets: jest.fn(() => inset),
    useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 390, height: 844 })),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: inset,
    },
  };
});

// Mock React Native Screens
jest.mock('react-native-screens', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    enableScreens: jest.fn(),
    ScreenContainer: View,
    Screen: View,
    NativeScreen: View,
    NativeScreenContainer: View,
    ScreenStack: View,
    ScreenStackHeaderConfig: View,
    ScreenStackHeaderSubview: View,
    ScreenStackHeaderRightView: View,
    ScreenStackHeaderLeftView: View,
    ScreenStackHeaderTitleView: View,
    ScreenStackHeaderCenterView: View,
    ScreenStackSearchBar: View,
    shouldUseActivityState: true,
  };
});

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo Modules
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn().mockReturnValue(true),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    loadAsync: jest.fn(),
    fromModule: jest.fn().mockReturnValue({ uri: 'mock-uri' }),
  },
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
  manifest: { extra: {} },
}));

jest.mock('expo-application', () => ({
  applicationName: 'Acucaradas Encomendas',
}));

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-expo-push-token' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
  },
  setNotificationChannelAsync: jest.fn(),
}));

// Mock Expo File System
jest.mock('expo-file-system', () => ({
  documentDirectory: 'mock-document-directory/',
  EncodingType: { UTF8: 'utf8' },
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  readAsStringAsync: jest.fn().mockResolvedValue('[]'),
  writeAsStringAsync: jest.fn(),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

// Mock SecureLoggingService
jest.mock('./src/services/SecureLoggingService', () => ({
  secureLoggingService: {
    debug: jest.fn((msg, data) => console.log('DEBUG:', msg, data)),
    info: jest.fn((msg, data) => console.log('INFO:', msg, data)),
    warn: jest.fn((msg, data) => console.log('WARN:', msg, data)),
    error: jest.fn((msg, data) => console.error('ERROR:', msg, data)),
    security: jest.fn((msg, data) => console.log('SECURITY:', msg, data)),
  },
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => {
  let authStateCallback: any = null;
  const mockUser = { 
    uid: 'test-user-id', 
    email: 'test@example.com',
    emailVerified: true,
    displayName: 'Test User',
    getIdToken: jest.fn().mockResolvedValue('test-token') 
  };
  
  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: jest.fn((auth, callback) => {
      const cb = typeof auth === 'function' ? auth : callback;
      authStateCallback = cb;
      if (cb && typeof cb === 'function') {
         cb(mockUser);
      }
      return jest.fn(); 
    }),
    signInWithEmailAndPassword: jest.fn().mockImplementation(() => {
       if (authStateCallback) {
         authStateCallback(mockUser);
       }
       return Promise.resolve({
         user: mockUser,
       });
     }),
     createUserWithEmailAndPassword: jest.fn().mockImplementation(() => {
       if (authStateCallback) {
         authStateCallback(mockUser);
       }
       return Promise.resolve({
         user: mockUser,
       });
     }),
    signOut: jest.fn().mockImplementation(() => {
      if (authStateCallback) {
        authStateCallback(null);
      }
      return Promise.resolve();
    }),
  };

  return {
    getAuth: jest.fn(() => mockAuth),
    initializeAuth: jest.fn(() => mockAuth),
    getReactNativePersistence: jest.fn(),
    signInWithEmailAndPassword: mockAuth.signInWithEmailAndPassword,
    createUserWithEmailAndPassword: mockAuth.createUserWithEmailAndPassword,
    signOut: mockAuth.signOut,
    onAuthStateChanged: mockAuth.onAuthStateChanged,
    GoogleAuthProvider: jest.fn(),
    FacebookAuthProvider: jest.fn(),
    OAuthProvider: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    confirmPasswordReset: jest.fn(),
    applyActionCode: jest.fn(),
    checkActionCode: jest.fn(),
    verifyPasswordResetCode: jest.fn(),
    fetchSignInMethodsForEmail: jest.fn(),
    linkWithCredential: jest.fn(),
    reauthenticateWithCredential: jest.fn(),
    updateProfile: jest.fn(),
    updateEmail: jest.fn(),
    updatePassword: jest.fn(),
    deleteUser: jest.fn(),
  };
});

// Mock Expo Apple Authentication
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonStyle: { BLACK: 0, WHITE: 1, WHITE_OUTLINE: 2 },
  AppleAuthenticationButtonType: { SIGN_IN: 0, CONTINUE: 1 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

// Mock Expo Auth Session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(),
  useAuthRequest: jest.fn().mockReturnValue([{}, {}, jest.fn()]),
  useAutoDiscovery: jest.fn(),
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn().mockReturnValue([{}, {}, jest.fn()]),
}));

jest.mock('expo-auth-session/providers/facebook', () => ({
  useAuthRequest: jest.fn().mockReturnValue([{}, {}, jest.fn()]),
}));

// Mock React Native OneSignal
jest.mock('react-native-onesignal', () => ({
  __esModule: true,
  default: {
    setAppId: jest.fn(),
    setNotificationOpenedHandler: jest.fn(),
    promptForPushNotificationsWithUserResponse: jest.fn(),
    addSubscriptionObserver: jest.fn(),
    removeSubscriptionObserver: jest.fn(),
  },
  LogLevel: {
    Verbose: 0,
    Debug: 1,
    Info: 2,
    Warn: 3,
    Error: 4,
    None: 5,
  },
}));

// Mock Firebase Messaging
jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  onMessage: jest.fn(),
  isSupported: jest.fn().mockResolvedValue(true),
}));

// Mock Firebase App
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      uid: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'customer',
      active: true,
      emailVerified: true,
      ultimoLogin: { toDate: () => new Date() },
    }),
  }),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date) => ({ toDate: () => date })),
  },
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock Firebase Analytics
jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(),
  logEvent: jest.fn(),
  isSupported: jest.fn().mockResolvedValue(false),
}));

// Mock Firebase Functions
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => jest.fn()),
}));

