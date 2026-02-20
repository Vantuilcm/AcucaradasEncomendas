// Ambient module declarations to satisfy TypeScript when certain dependencies are not installed
// or when using platform-specific modules in a cross-platform codebase.

declare module 'react-native-svg';
declare module '@stripe/stripe-react-native';
declare module 'react-native-onesignal';
declare module 'expo-image-picker';
declare module 'expo-clipboard';
// Common React Native modules used by screens
declare module 'lottie-react-native';
declare module 'react-native-calendars';
declare module '@react-native-community/datetimepicker';
declare module 'react-native-paper-dates';

// Server-side libraries used in example/controllers code
// Removed express and stripe to use actual types from node_modules

// Firebase v9 modular SDK helpers (fallback typings)
declare module 'firebase/auth' {
  export const getAuth: any;
  export const onAuthStateChanged: any;
  export type Auth = any;
}

declare module 'firebase/firestore' {
  export const getFirestore: any;
  export type Firestore = any;
  export const onSnapshot: any;
}

// Jest global for typechecking in non-test builds
declare const jest: any;

// Allow custom JSX test/mocks elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mock-switch': any;
      'mock-button': any;
      'mock-activity-indicator': any;
      'mock-list-item': any;
      'mock-list-section': any;
      'mock-list-subheader': any;
      'mock-list-icon': any;
      'mock-modal': any;
      'mock-portal': any;
      'mock-provider': any;
      'mock-text': any;
      'mock-card': any;
      'mock-divider': any;
      'mock-segmented-buttons': any;
      'mock-segmented-button': any;
      'mock-timepicker-modal': any;
    }
  }
}
