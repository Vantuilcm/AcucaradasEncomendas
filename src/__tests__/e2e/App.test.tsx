import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import App from '../../App';
import usePermissions from '../../hooks/usePermissions';

// Mock usePermissions moved to line 532

jest.mock('../../hooks/useNotifications', () => ({
  __esModule: true,
  useNotifications: jest.fn().mockReturnValue({
    unreadCount: 0,
    notifications: [],
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    loadNotifications: jest.fn(),
  }),
}));

jest.mock('expo-font');
jest.mock('expo-asset');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const { View } = require('react-native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      addListener: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: jest.fn().mockReturnValue(true),
    NavigationContainer: ({ children }: any) => <View>{children}</View>,
  };
});

// Mock @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => {
  const { View } = require('react-native');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: any) => <View>{children}</View>,
      Screen: ({ name, component: Component, children }: any) => {
        if (children) return <View>{children}</View>;
        return <Component />;
      },
    }),
  };
});

// Mock @react-navigation/stack
jest.mock('@react-navigation/stack', () => {
  return {
    createStackNavigator: () => {
      const { View } = require('react-native');
      return {
        Navigator: ({ children }: any) => {
          return <View>{children}</View>;
        },
        Screen: ({ name, component: Component, children }: any) => {
          if (children) return <View>{children}</View>;
          return <Component />;
        },
      };
    },
  };
});

// Mock expo-constants
jest.mock('expo-constants', () => ({
  manifest: { extra: {} },
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => 'StatusBar',
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => 'Icon',
  Ionicons: () => 'Icon',
  FontAwesome: () => 'Icon',
}));

// Mock das dependências externas
jest.mock('../../config/onesignal', () => ({
  initOneSignal: jest.fn().mockReturnValue(true),
  requestOneSignalPermission: jest.fn().mockResolvedValue(true),
  setOneSignalTags: jest.fn(),
  integrateWithExistingNotifications: jest.fn(),
  OneSignalNotificationType: {},
  OneSignalUserTag: {},
  default: {
    init: jest.fn(),
  },
}));

jest.mock('../../services/LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock PerformanceService to prevent intervals
jest.mock('../../services/PerformanceService', () => ({
  PerformanceService: {
    getInstance: jest.fn().mockReturnValue({
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      startOperation: jest.fn().mockReturnValue('op-id'),
      endOperation: jest.fn(),
    }),
  },
  performanceService: {
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    startOperation: jest.fn().mockReturnValue('op-id'),
    endOperation: jest.fn(),
  },
}));

// Mock LocationService
jest.mock('../../services/LocationService', () => {
  return {
    LocationService: jest.fn().mockImplementation(() => ({
      requestLocationPermission: jest.fn().mockResolvedValue(true),
      getCurrentLocation: jest.fn().mockResolvedValue({ latitude: 0, longitude: 0 }),
      getAddressFromCoordinates: jest.fn().mockResolvedValue('Test Address'),
      saveUserLocation: jest.fn().mockResolvedValue(true),
    })),
  };
});

// Mock SecureStorageService
jest.mock('../../services/SecureStorageService', () => ({
  SecureStorageService: {
    getData: jest.fn().mockResolvedValue(null),
    storeData: jest.fn().mockResolvedValue(true),
    removeData: jest.fn().mockResolvedValue(true),
  },
}));

// Mock SecureLoggingService
jest.mock('../../services/SecureLoggingService', () => ({
  secureLoggingService: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    security: jest.fn(),
    setUserId: jest.fn(),
  },
}));

// Mock ScreenshotProtection
jest.mock('../../components/ScreenshotProtection', () => ({
  ScreenshotProtection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock SocialAuthButtons
jest.mock('../../components/SocialAuthButtons', () => {
  const { View } = require('react-native');
  return () => <View testID="social-auth-buttons" />;
});

// Mock AppNavigator (remove mock to use real one)
// jest.mock('../../navigation/AppNavigator', () => {
//   const { View } = require('react-native');
//   return () => <View testID="app-navigator-mock" />;
// });

// Mock screens
jest.mock('../../screens/HomeScreen', () => ({
  HomeScreen: () => {
    const { View } = require('react-native');
    return <View testID="home-screen" />;
  },
}));
jest.mock('../../screens/CatalogScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="catalog-screen" />;
});
jest.mock('../../screens/OrdersScreen', () => ({
  OrdersScreen: () => {
    const { View } = require('react-native');
    return <View testID="orders-screen" />;
  },
}));
jest.mock('../../screens/CartScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="cart-screen" />;
});
jest.mock('../../screens/ProfileScreen', () => ({
  ProfileScreen: () => {
    const { View } = require('react-native');
    return <View testID="profile-screen" />;
  },
}));
// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: jest.fn().mockReturnValue(Insets),
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View } = require('react-native');
  return {
    Text: ({ children }: any) => <View>{children}</View>,
    Button: ({ children, onPress }: any) => <View onTouchEnd={onPress}>{children}</View>,
    IconButton: () => <View />,
    Provider: ({ children }: any) => <View>{children}</View>,
    MD3LightTheme: { colors: {} },
    useTheme: () => ({ colors: {} }),
  };
});

// Mock LoginScreen to isolate the issue
jest.mock('../../screens/LoginScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="login-screen" />;
});
jest.mock('../../screens/RegisterScreen', () => ({
  RegisterScreen: () => {
    const { View } = require('react-native');
    return <View testID="register-screen" />;
  },
}));
jest.mock('../../screens/ForgotPasswordScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="forgot-password-screen" />;
});
jest.mock('../../screens/ProductDetailScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="product-detail-screen" />;
});
jest.mock('../../screens/CheckoutScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="checkout-screen" />;
});
jest.mock('../../screens/OrderDetailScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="order-detail-screen" />;
});
jest.mock('../../screens/OrderDetailsScreen', () => ({
  OrderDetailsScreen: () => {
    const { View } = require('react-native');
    return <View testID="order-details-screen" />;
  },
}));
jest.mock('../../screens/AddressScreen', () => ({
  AddressScreen: () => {
    const { View } = require('react-native');
    return <View testID="address-screen" />;
  },
}));
jest.mock('../../screens/PaymentMethodsScreen', () => ({
  PaymentMethodsScreen: () => {
    const { View } = require('react-native');
    return <View testID="payment-methods-screen" />;
  },
}));
jest.mock('../../screens/EditProfileScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="edit-profile-screen" />;
});
jest.mock('../../screens/AdminPanelScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="admin-panel-screen" />;
});
jest.mock('../../screens/ProductManagementScreen', () => ({
  ProductManagementScreen: () => {
    const { View } = require('react-native');
    return <View testID="product-management-screen" />;
  },
}));
jest.mock('../../screens/OrderManagementScreen', () => ({
  OrderManagementScreen: () => {
    const { View } = require('react-native');
    return <View testID="order-management-screen" />;
  },
}));
jest.mock('../../screens/AddEditProductScreen', () => ({
  AddEditProductScreen: () => {
    const { View } = require('react-native');
    return <View testID="add-edit-product-screen" />;
  },
}));
jest.mock('../../screens/NotificationSettingsScreen', () => ({
  NotificationSettingsScreen: () => {
    const { View } = require('react-native');
    return <View testID="notification-settings-screen" />;
  },
}));
jest.mock('../../screens/NotificationSettingsScreenV2', () => ({
  NotificationSettingsScreenV2: () => {
    const { View } = require('react-native');
    return <View testID="notification-settings-screen-v2" />;
  },
}));
jest.mock('../../screens/NotificationSettingsMigrationScreen', () => ({
  NotificationSettingsMigrationScreen: () => {
    const { View } = require('react-native');
    return <View testID="notification-settings-migration-screen" />;
  },
}));
jest.mock('../../screens/DeliveryDriverProfileScreen', () => ({
  DeliveryDriverProfileScreen: () => {
    const { View } = require('react-native');
    return <View testID="delivery-driver-profile-screen" />;
  },
}));
jest.mock('../../screens/DeliveryDriverRegistration', () => {
  const { View } = require('react-native');
  return () => <View testID="delivery-driver-registration-screen" />;
});
jest.mock('../../screens/ScheduleDeliveryScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="schedule-delivery-screen" />;
});
jest.mock('../../screens/OrderCompletedScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="order-completed-screen" />;
});
jest.mock('../../screens/HelpCenterScreen', () => ({
  HelpCenterScreen: () => {
    const { View } = require('react-native');
    return <View testID="help-center-screen" />;
  },
}));
jest.mock('../../screens/PrivacySettingsScreen', () => ({
  PrivacySettingsScreen: () => {
    const { View } = require('react-native');
    return <View testID="privacy-settings-screen" />;
  },
}));
jest.mock('../../screens/TermsOfUseScreen', () => ({
  TermsOfUseScreen: () => {
    const { View } = require('react-native');
    return <View testID="terms-of-use-screen" />;
  },
}));
jest.mock('../../screens/CreateReviewScreen', () => ({
  CreateReviewScreen: () => {
    const { View } = require('react-native');
    return <View testID="create-review-screen" />;
  },
}));

// Mock other auth screens
jest.mock('../../screens/RegisterScreen', () => ({
  RegisterScreen: () => {
    const { View } = require('react-native');
    return <View testID="register-screen" />;
  },
}));

jest.mock('../../screens/ForgotPasswordScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="forgot-password-screen" />;
});

// Mock other screens that use route params or complex logic
jest.mock('../../screens/ProductDetailScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="ProductDetailScreen-mock" />;
});
jest.mock('../../screens/CheckoutScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="CheckoutScreen-mock" />;
});
jest.mock('../../screens/OrderCompletedScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="OrderCompletedScreen-mock" />;
});
jest.mock('../../screens/OrderDetailScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="OrderDetailScreen-mock" />;
});
jest.mock('../../screens/OrderDetailsScreen', () => ({
  OrderDetailsScreen: () => {
    const { View } = require('react-native');
    return <View testID="OrderDetailsScreen-mock" />;
  },
}));
jest.mock('../../screens/CreateReviewScreen', () => ({
  CreateReviewScreen: () => {
    const { View } = require('react-native');
    return <View testID="CreateReviewScreen-mock" />;
  },
}));
jest.mock('../../screens/AddEditProductScreen', () => ({
  AddEditProductScreen: () => {
    const { View } = require('react-native');
    return <View testID="AddEditProductScreen-mock" />;
  },
}));
jest.mock('../../screens/NotificationSettingsScreen', () => ({
  NotificationSettingsScreen: () => {
    const { View } = require('react-native');
    return <View testID="NotificationSettingsScreen-mock" />;
  },
}));
jest.mock('../../screens/NotificationSettingsScreenV2', () => ({
  NotificationSettingsScreenV2: () => {
    const { View } = require('react-native');
    return <View testID="NotificationSettingsScreenV2-mock" />;
  },
}));
jest.mock('../../screens/NotificationSettingsMigrationScreen', () => ({
  NotificationSettingsMigrationScreen: () => {
    const { View } = require('react-native');
    return <View testID="NotificationSettingsMigrationScreen-mock" />;
  },
}));
jest.mock('../../screens/ScheduleDeliveryScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="ScheduleDeliveryScreen-mock" />;
});
jest.mock('../../screens/AddressScreen', () => ({
  AddressScreen: () => {
    const { View } = require('react-native');
    return <View testID="AddressScreen-mock" />;
  },
}));
jest.mock('../../screens/PaymentMethodsScreen', () => ({
  PaymentMethodsScreen: () => {
    const { View } = require('react-native');
    return <View testID="PaymentMethodsScreen-mock" />;
  },
}));
jest.mock('../../screens/EditProfileScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="EditProfileScreen-mock" />;
});
jest.mock('../../screens/AdminPanelScreen', () => {
  const { View } = require('react-native');
  return () => <View testID="AdminPanelScreen-mock" />;
});
jest.mock('../../screens/ProductManagementScreen', () => ({
  ProductManagementScreen: () => {
    const { View } = require('react-native');
    return <View testID="ProductManagementScreen-mock" />;
  },
}));
jest.mock('../../screens/OrderManagementScreen', () => ({
  OrderManagementScreen: () => {
    const { View } = require('react-native');
    return <View testID="OrderManagementScreen-mock" />;
  },
}));
jest.mock('../../screens/HelpCenterScreen', () => ({
  HelpCenterScreen: () => {
    const { View } = require('react-native');
    return <View testID="HelpCenterScreen-mock" />;
  },
}));
jest.mock('../../screens/PrivacySettingsScreen', () => ({
  PrivacySettingsScreen: () => {
    const { View } = require('react-native');
    return <View testID="PrivacySettingsScreen-mock" />;
  },
}));
jest.mock('../../screens/TermsOfUseScreen', () => ({
  TermsOfUseScreen: () => {
    const { View } = require('react-native');
    return <View testID="TermsOfUseScreen-mock" />;
  },
}));
jest.mock('../../screens/DeliveryDriverRegistration', () => {
  const { View } = require('react-native');
  return () => <View testID="DeliveryDriverRegistration-mock" />;
});
jest.mock('../../screens/DeliveryDriverProfileScreen', () => ({
  DeliveryDriverProfileScreen: () => {
    const { View } = require('react-native');
    return <View testID="DeliveryDriverProfileScreen-mock" />;
  },
}));

// Mock usePermissions hook
jest.mock('../../hooks/usePermissions', () => {
  const mockUsePermissions = () => ({
    loading: false,
    isEntregador: false,
    userRole: 'cliente',
    hasPermission: jest.fn().mockReturnValue(true),
    hasPermissions: jest.fn().mockReturnValue(true),
    updatePermissions: jest.fn(),
    isAdmin: false,
    isGerente: false,
    isAtendente: false,
    isCliente: true,
    isEntregador: false,
  });
  return {
    __esModule: true,
    default: mockUsePermissions,
    usePermissions: mockUsePermissions,
  };
});

// Mock useNotifications hook
jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: jest.fn().mockReturnValue({
    pushToken: null,
    isLoading: false,
    error: null,
    requestPermissions: jest.fn().mockResolvedValue(true),
    getExpoPushToken: jest.fn().mockResolvedValue('test-token'),
    registerForPushNotifications: jest.fn().mockResolvedValue('test-token'),
    unregisterPushNotifications: jest.fn(),
    sendPushNotification: jest.fn(),
    scheduleLocalNotification: jest.fn(),
    cancelLocalNotification: jest.fn(),
    cancelAllLocalNotifications: jest.fn(),
  }),
}));

// Mock ProductService
jest.mock('../../services/ProductService', () => {
  return {
    ProductService: jest.fn().mockImplementation(() => ({
      getFeaturedProducts: jest.fn().mockResolvedValue([]),
    })),
  };
});

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: jest.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';
const mockUseAuth = useAuth as jest.Mock;
const mockLogin = jest.fn();

// Mock LocationContext
jest.mock('../../contexts/LocationContext', () => ({
  LocationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocation: jest.fn().mockReturnValue({
    currentLocation: null,
    currentAddress: null,
    updateLocation: jest.fn(),
  }),
}));

// Mock CartContext
jest.mock('../../contexts/CartContext', () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCart: jest.fn().mockReturnValue({
    cart: { items: [] },
    isLoading: false,
    addItem: jest.fn(),
  }),
}));

// Mock ThemeProvider
jest.mock('../../components/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAppTheme: jest.fn().mockReturnValue({
    theme: {
      colors: {
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        background: '#FFFFFF',
        text: { primary: '#000000', secondary: '#666666' },
        card: '#FFFFFF',
        border: '#E0E0E0',
        notification: '#FF6B6B',
        error: '#FF0000',
        success: '#00FF00',
        warning: '#FFFF00',
        info: '#0000FF',
      },
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    },
    isDark: false,
    toggleTheme: jest.fn(),
  }),
}));

// Mock ScreenCapture
jest.mock('../../compat/expoScreenCapture', () => ({
  preventScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  allowScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  addScreenshotListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  usePreventScreenCapture: jest.fn(),
}));

// Mock UserService
jest.mock('../../services/UserService', () => ({
  getUserInfo: jest.fn().mockReturnValue({ id: 'test-user' }),
}));

// Mock InputValidationService
jest.mock('../../services/InputValidationService', () => ({
  InputValidationService: {
    validateInputType: jest.fn().mockReturnValue(true),
    validateAndSanitizeInput: jest.fn().mockImplementation((val) => val),
  },
}));

describe('App E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementation for useAuth
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      login: mockLogin,
      logout: jest.fn(),
      register: jest.fn(),
      validateSession: jest.fn().mockResolvedValue(true),
      refreshUserActivity: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve renderizar o aplicativo sem erros', async () => {
    const { getByTestId } = render(<App />);
    
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      expect(getByTestId('app-container')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('deve navegar para a tela de login quando não autenticado', async () => {
    // Garantir que o mock retorna o estado correto
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      login: mockLogin,
      logout: jest.fn(),
      register: jest.fn(),
      validateSession: jest.fn().mockResolvedValue(true),
      refreshUserActivity: jest.fn(),
    });

    const { getByTestId, queryByTestId, debug } = render(<App />);

    // Verificar se está carregando inicialmente
    expect(getByTestId('app-loading')).toBeTruthy();

    // Avançar tempo para passar o loading inicial (AppNavigator timer)
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Verificar se o loading sumiu
    expect(queryByTestId('app-loading')).toBeNull();

    // Verificar se a tela de login está visível
    expect(queryByTestId('login-screen')).toBeTruthy();
  }, 30000);

  it('deve mostrar notificações quando recebidas', async () => {
    // Setup authenticated user
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id', email: 'test@example.com', nome: 'Test User' },
      loading: false,
      isAuthenticated: true,
      login: mockLogin,
      logout: jest.fn(),
      register: jest.fn(),
      validateSession: jest.fn().mockResolvedValue(true),
      refreshUserActivity: jest.fn(),
    });

    const { getByTestId, queryByTestId } = render(<App />);

    // Avançar o tempo para disparar o setTimeout do AppNavigator
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Verificar se o loading sumiu
    await waitFor(() => {
      expect(queryByTestId('app-loading')).toBeNull();
    }, { timeout: 10000 });

    // Wait for the user to be loaded (and thus useNotifications to be called)
    await waitFor(() => {
      const { useNotifications } = require('../../hooks/useNotifications');
      expect(useNotifications).toHaveBeenCalled();
    }, { timeout: 5000 });
  }, 30000);
});
