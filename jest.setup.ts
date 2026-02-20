import '@testing-library/jest-native/extend-expect'
import 'react-native-gesture-handler/jestSetup'

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true })

jest.mock('@/services/LoggingService', () => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  const LoggingService = {
    getInstance: jest.fn(() => logger),
  }

  return {
    __esModule: true,
    loggingService: logger,
    LoggingService,
    default: LoggingService,
  }
})

jest.mock('@react-native-community/netinfo', () => {
  const mockState = {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: null,
  }

  const addEventListener = jest.fn((handler?: any) => {
    if (typeof handler === 'function') handler(mockState)
    return jest.fn()
  })

  const fetch = jest.fn(async () => mockState)

  return {
    __esModule: true,
    default: { addEventListener, fetch },
    addEventListener,
    fetch,
  }
})

jest.mock('expo-constants', () => {
  const AppOwnership = {
    Expo: 'expo',
    Standalone: 'standalone',
    Guest: 'guest',
  }

  const constants = {
    executionEnvironment: 'standalone',
    appOwnership: AppOwnership.Standalone,
    experienceUrl: null,
    __unsafeNoWarnManifest2: null,
    expoConfig: {
      extra: {},
    },
  }

  return {
    __esModule: true,
    AppOwnership,
    default: constants,
    ...constants,
  }
})

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {}

  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => (key in store ? store[key] : null)),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = String(value)
      }),
      removeItem: jest.fn(async (key: string) => {
        delete store[key]
      }),
      clear: jest.fn(async () => {
        Object.keys(store).forEach(k => delete store[k])
      }),
      getAllKeys: jest.fn(async () => Object.keys(store)),
      multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, k in store ? store[k] : null])),
      multiSet: jest.fn(async (pairs: Array<[string, string]>) => {
        pairs.forEach(([k, v]) => {
          store[k] = String(v)
        })
      }),
      multiRemove: jest.fn(async (keys: string[]) => {
        keys.forEach(k => delete store[k])
      }),
    },
  }
})

jest.mock('react-native-onesignal', () => {
  const noop = () => {}
  return {
    __esModule: true,
    OneSignal: {
      initialize: jest.fn(noop),
      login: jest.fn(noop),
      logout: jest.fn(noop),
      Notifications: {
        permission: false,
        requestPermission: jest.fn(async () => true),
        addEventListener: jest.fn(() => ({ remove: jest.fn(noop) })),
      },
      InAppMessages: {
        addEventListener: jest.fn(() => ({ remove: jest.fn(noop) })),
      },
      User: {
        addTag: jest.fn(noop),
        addTags: jest.fn(noop),
        removeTag: jest.fn(noop),
      },
    },
  }
})

jest.mock('expo-router', () => {
  const React = require('react')

  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }

  return {
    __esModule: true,
    router,
    useRouter: jest.fn(() => router),
    usePathname: jest.fn(() => '/'),
    useSegments: jest.fn(() => []),
    useRootNavigationState: jest.fn(() => ({ key: 'root' })),
    useLocalSearchParams: jest.fn(() => ({})),
    useGlobalSearchParams: jest.fn(() => ({})),
    Redirect: ({ href }: any) => React.createElement('Redirect', { href }),
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Slot: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Stack: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Tabs: ({ children }: any) => React.createElement(React.Fragment, null, children),
  }
})

jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: jest.fn(() => 'exp://redirect'),
  startAsync: jest.fn(async () => ({ type: 'dismiss' })),
  getRedirectUrl: jest.fn(() => 'exp://redirect'),
  AuthSessionResultType: {
    Success: 'success',
    Error: 'error',
    Cancel: 'cancel',
    Dismiss: 'dismiss',
    Locked: 'locked',
  },
  ResponseType: {
    Code: 'code',
    Token: 'token',
    IdToken: 'id_token',
  },
}))

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(async () => ({ type: 'dismiss' })),
  openBrowserAsync: jest.fn(async () => ({ type: 'dismiss' })),
  dismissBrowser: jest.fn(),
}))

jest.mock('expo-splash-screen', () => ({
  __esModule: true,
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}))

jest.mock('@react-navigation/native', () => {
  const React = require('react')
  const useNavigation = jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    setOptions: jest.fn(),
  }))

  return {
    __esModule: true,
    NavigationContainer: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useNavigation,
    useRoute: jest.fn(() => ({ key: 'test', name: 'test', params: {} })),
    useFocusEffect: jest.fn((effect: any) => {
      const cleanup = typeof effect === 'function' ? effect() : undefined
      return cleanup
    }),
    useIsFocused: jest.fn(() => true),
  }
})

jest.mock('@stripe/stripe-react-native', () => {
  const React = require('react')
  return {
    __esModule: true,
    StripeProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    initStripe: jest.fn(async () => undefined),
    useStripe: jest.fn(() => ({
      confirmPayment: jest.fn(async () => ({ paymentIntent: {}, error: undefined })),
    })),
  }
})
