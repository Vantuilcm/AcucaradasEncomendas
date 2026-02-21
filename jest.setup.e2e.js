import '@testing-library/jest-native/extend-expect';

// Mock do AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock do Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock do Stripe
jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(),
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
  useStripe: jest.fn(() => ({
    initPaymentSheet: jest.fn(),
    presentPaymentSheet: jest.fn(),
  })),
}));

// Mock do OneSignal
// Usando mock direto em vez de jest.mock para evitar erro de módulo não encontrado
global.OneSignal = {
  init: jest.fn(),
  setAppId: jest.fn(),
  promptForPushNotificationsWithUserResponse: jest.fn(),
  setExternalUserId: jest.fn(),
  setEmail: jest.fn(),
  setTags: jest.fn(),
};

// Configurar mock diretamente para o OneSignal sem depender do módulo real
jest.mock('react-native-onesignal', () => global.OneSignal, { virtual: true });

// Mock do Expo Notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  registerForPushNotificationsAsync: jest.fn(),
}));

// Mock completo do react-native-reanimated para evitar problemas com o plugin
jest.mock(
  'react-native-reanimated',
  () => ({
    useAnimatedStyle: () => ({}),
    useSharedValue: val => ({ value: val }),
    useDerivedValue: val => ({ value: val() }),
    useAnimatedScrollHandler: () => ({}),
    useAnimatedGestureHandler: () => ({}),
    useAnimatedRef: () => ({ current: null }),
    useAnimatedProps: () => ({}),
    withTiming: val => val,
    withSpring: val => val,
    withDecay: val => val,
    withDelay: (_, val) => val,
    withSequence: (...val) => val[0],
    withRepeat: val => val,
    Easing: { linear: jest.fn(), ease: jest.fn(), quad: jest.fn() },
    Extrapolation: { CLAMP: 'clamp' },
    interpolate: jest.fn(),
    Animated: {
      View: 'View',
      Text: 'Text',
      Image: 'Image',
      ScrollView: 'ScrollView',
      FlatList: 'FlatList',
    },
    Layout: {
      springify: jest.fn(),
      easing: jest.fn(),
    },
    SlideInRight: jest.fn(),
    SlideOutRight: jest.fn(),
    SlideInLeft: jest.fn(),
    SlideOutLeft: jest.fn(),
    SlideInUp: jest.fn(),
    SlideOutUp: jest.fn(),
    SlideInDown: jest.fn(),
    SlideOutDown: jest.fn(),
    FadeIn: jest.fn(),
    FadeOut: jest.fn(),
    ZoomIn: jest.fn(),
    ZoomOut: jest.fn(),
    default: {
      createAnimatedComponent: component => component,
      addWhitelistedUIProps: jest.fn(),
      addWhitelistedNativeProps: jest.fn(),
    },
  }),
  { virtual: true }
);

// Desabilitar o plugin do reanimated para testes
jest.mock('react-native-reanimated/plugin', () => ({}), { virtual: true });

// Configuração global para testes E2E
global.window = {};
global.window = global;

// Configuração de timeout para testes E2E
jest.setTimeout(30000);

// Configuração de mocks para navegação
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Configuração de mocks para componentes nativos
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native/Libraries/Animated/Animated', () => ({
  Value: jest.fn(),
  event: jest.fn(),
  add: jest.fn(),
  eq: jest.fn(),
  set: jest.fn(),
  cond: jest.fn(),
  interpolate: jest.fn(),
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  StyleSheet: { create: jest.fn() },
}));

// Configuração de mocks para gestos
jest.mock(
  'react-native-gesture-handler',
  () => ({
    PanGestureHandler: 'View',
    TapGestureHandler: 'View',
    State: {},
    ScrollView: 'View',
    GestureHandlerRootView: 'View',
    PanGestureHandlerGestureEvent: jest.fn(),
    PanGestureHandlerStateChangeEvent: jest.fn(),
    TapGestureHandlerStateChangeEvent: jest.fn(),
    createGestureHandler: jest.fn(),
    Directions: {
      RIGHT: 1,
      LEFT: 2,
      UP: 4,
      DOWN: 8,
    },
  }),
  { virtual: true }
);
