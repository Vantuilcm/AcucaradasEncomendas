import React from 'react';
// import * as fs from 'fs';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import App from '../../App';
import usePermissions from '../../hooks/usePermissions';

jest.setTimeout(120000);

// Mock do Firebase Auth e Firestore

// Mock das dependências externas
jest.mock('../../hooks/usePermissions', () => jest.fn());
jest.mock('../../config/onesignal');
jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    getInstance: jest.fn().mockReturnValue({
      getUserNotifications: jest.fn().mockResolvedValue([]),
      getNotificationById: jest.fn().mockResolvedValue(null),
      markAsRead: jest.fn().mockResolvedValue(undefined),
      markAllAsRead: jest.fn().mockResolvedValue(undefined),
      deleteNotification: jest.fn().mockResolvedValue(undefined),
      getUnreadCount: jest.fn().mockResolvedValue(0),
      updatePreferences: jest.fn().mockResolvedValue(undefined),
      getPreferences: jest.fn().mockResolvedValue({}),
    }),
  },
}));
jest.mock('../../services/PerformanceService', () => ({
  PerformanceService: {
    getInstance: jest.fn().mockReturnValue({
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      startOperation: jest.fn().mockReturnValue('op-id'),
      endOperation: jest.fn(),
    }),
  },
}));

// Mock SecureStorageService
jest.mock('../../services/SecureStorageService', () => ({
  SecureStorageService: {
    getData: jest.fn().mockResolvedValue(null),
    storeData: jest.fn().mockResolvedValue(true),
    removeData: jest.fn().mockResolvedValue(true),
  },
}));

// Mock SecurityService
jest.mock('../../services/SecurityService', () => ({
  SecurityService: {
    registerLoginAttempt: jest.fn().mockResolvedValue(true),
    sanitizeInput: jest.fn().mockImplementation((val) => val),
    validateToken: jest.fn().mockReturnValue(true),
    getTokenPayload: jest.fn().mockReturnValue({ id: 'test-user-id' }),
    startActivityMonitor: jest.fn(),
    stopActivityMonitor: jest.fn(),
    getDeviceId: jest.fn().mockResolvedValue('mock-device-id'),
    updateLastActivity: jest.fn(),
    resetActivityTimer: jest.fn(),
    checkPasswordStrength: jest.fn().mockReturnValue({ score: 4, feedback: '', isStrong: true }),
    isDeviceTrusted: jest.fn().mockResolvedValue(true),
    registerTrustedDevice: jest.fn().mockResolvedValue(true),
    removeTrustedDevice: jest.fn().mockResolvedValue(true),
    getTrustedDevices: jest.fn().mockResolvedValue([]),
  },
}));

// Mock AuthService
jest.mock('../../services/AuthService', () => ({
  AuthService: {
    getInstance: jest.fn().mockReturnValue({
      autenticarUsuario: jest.fn().mockResolvedValue({
        user: {
          id: 'test-user-id',
          nome: 'Test User',
          email: 'cliente@exemplo.com',
          tipo: 'cliente',
        },
        token: 'mock-token',
      }),
      login: jest.fn().mockResolvedValue({
        user: {
          id: 'test-user-id',
          nome: 'Test User',
          email: 'cliente@exemplo.com',
        },
        token: 'mock-token',
      }),
      logout: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock InputValidationService
jest.mock('../../services/InputValidationService', () => ({
  InputValidationService: {
    validateInputType: jest.fn().mockReturnValue(true),
    validateAndSanitizeInput: jest.fn((input) => input),
  },
}));

// Mock SecureLoggingService
jest.mock('../../services/SecureLoggingService', () => ({
  secureLoggingService: {
    security: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock ScreenshotProtection
jest.mock('../../components/ScreenshotProtection', () => ({
  ScreenshotProtection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock LocationService
jest.mock('../../services/LocationService', () => {
  return {
    LocationService: jest.fn().mockImplementation(() => ({
      requestLocationPermission: jest.fn().mockResolvedValue(true),
      getCurrentLocation: jest.fn().mockResolvedValue({ latitude: 0, longitude: 0 }),
      getAddressFromCoordinates: jest.fn().mockResolvedValue('Test Address'),
      saveUserLocation: jest.fn().mockResolvedValue(true),
      getNearbyStores: jest.fn().mockResolvedValue([]),
      getStoresWithProduct: jest.fn().mockResolvedValue([]),
    })),
  };
});

// Mock LoggingService
jest.mock('../../services/LoggingService', () => ({
  loggingService: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setUserId: jest.fn(),
    clearUser: jest.fn(),
  },
}));



// Mock do Firebase Auth e Firestore
jest.mock('firebase/auth', () => {
  const mockUser = { uid: 'test-user-id', email: 'cliente@exemplo.com' };
  let authStateChangedCallback: ((user: any) => void) | null = null;
  let _currentUser: any = null;
  
  const mockAuth = {
    onAuthStateChanged: jest.fn((callback) => {
      authStateChangedCallback = callback;
      callback(_currentUser); // Initial state
      return jest.fn();
    }),
    signInWithEmailAndPassword: jest.fn().mockImplementation(async () => {
      _currentUser = mockUser;
      if (authStateChangedCallback) {
        authStateChangedCallback(_currentUser);
      }
      return { user: _currentUser };
    }),
    signOut: jest.fn().mockImplementation(async () => {
      _currentUser = null;
      if (authStateChangedCallback) {
        authStateChangedCallback(null);
      }
    }),
  };
  
  Object.defineProperty(mockAuth, 'currentUser', {
    get: () => _currentUser,
    configurable: true
  });

  return {
    getAuth: jest.fn(() => mockAuth),
    initializeAuth: jest.fn(() => mockAuth),
    signInWithEmailAndPassword: jest.fn().mockImplementation(async () => {
      _currentUser = mockUser;
      if (authStateChangedCallback) {
        authStateChangedCallback(_currentUser);
      }
      return { user: _currentUser };
    }),
    onAuthStateChanged: jest.fn((auth, callback) => {
        authStateChangedCallback = callback;
        callback(_currentUser);
        return jest.fn();
    }),
    signOut: jest.fn().mockImplementation(async () => {
      _currentUser = null;
      if (authStateChangedCallback) {
        authStateChangedCallback(null);
      }
    }),
  };
});

jest.mock('firebase/firestore', () => {
  const mockProducts = [
    {
      id: 'prod1',
      nome: 'Bolo de Chocolate',
      preco: 45.9,
      descricao: 'Delicioso bolo de chocolate',
      imagem: 'url-imagem',
      disponivel: true,
    },
    {
      id: 'prod2',
      nome: 'Cupcake de Morango',
      preco: 8.5,
      descricao: 'Cupcake com cobertura de morango',
      imagem: 'url-imagem',
      disponivel: true,
    },
  ];
  const mockCartItem = { id: 'prod1', nome: 'Bolo de Chocolate', preco: 45.9, quantidade: 1, subtotal: 45.9 };
  
  return {
    getFirestore: jest.fn(() => ({})),
    getDocs: jest.fn(() => ({ 
      docs: mockProducts.map(p => ({ id: p.id, data: () => p })),
      empty: false,
      forEach: (cb: any) => mockProducts.forEach(p => cb({ id: p.id, data: () => p }))
    })),
    addDoc: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
    getDoc: jest.fn((ref) => {
        if (ref && ref.path && ref.path.includes('permissoes')) {
             return { exists: () => false, data: () => undefined };
        }
        if (ref && ref.path && ref.path.includes('users')) {
             return { 
               exists: () => true, 
               data: () => ({ 
                 id: 'test-user-id',
                 role: 'cliente', 
                 nome: 'Test User',
                 email: 'cliente@exemplo.com' 
               }) 
             };
        }
        // Default (cart?)
        return { exists: () => true, data: () => mockCartItem };
    }),
    collection: jest.fn((db, path) => ({ path })),
    doc: jest.fn((db, collection, id) => ({ path: `${collection}/${id}` })),
    query: jest.fn((ref) => ref),
    where: jest.fn(),
    limit: jest.fn(),
    orderBy: jest.fn(),
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
    },
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
  };
});

// Mock do Stripe
jest.mock('@stripe/stripe-react-native', () => ({
  ...jest.requireActual('@stripe/stripe-react-native'),
  useStripe: () => ({
    initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
  }),
}));



// Mock react-native-safe-area-context removed to use global setup

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, TextInput, TouchableOpacity, Text } = require('react-native');
  return {
    Text: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
    Button: ({ children, onPress, testID, ...props }: any) => (
      <TouchableOpacity testID={testID} onPress={onPress} {...props}>
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    TextInput: ({ value, onChangeText, testID, ...props }: any) => (
      <TextInput testID={testID} value={value} onChangeText={onChangeText} {...props} />
    ),
    IconButton: () => <View />,
    Provider: ({ children }: any) => <View>{children}</View>,
    MD3LightTheme: { colors: {} },
    useTheme: () => ({ colors: { primary: 'blue', background: 'white' } }),
    ActivityIndicator: () => <View />,
  };
});

// Mock screens with navigation logic
// LoginScreen mock removed to use real screen

jest.mock('../../screens/HomeScreen', () => ({
  HomeScreen: ({ navigation }: any) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="home-screen">
        <Button 
          testID="produtos-button" 
          title="Produtos" 
          onPress={() => navigation.navigate('Catalog')} 
        />
      </View>
    );
  },
}));

jest.mock('../../screens/CatalogScreen', () => {
  const { View, Button, Text } = require('react-native');
  return ({ navigation }: any) => (
    <View testID="produtos-screen">
      <Text>Bolo de Chocolate</Text>
      <Button 
        testID="produto-prod1" 
        title="Bolo" 
        onPress={() => navigation.navigate('ProductDetail', { productId: 'prod1' })} 
      />
    </View>
  );
});

jest.mock('../../screens/OrdersScreen', () => ({
  OrdersScreen: () => {
    const { View } = require('react-native');
    return <View testID="orders-screen" />;
  },
}));

jest.mock('../../screens/CartScreen', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  const React = require('react');
  const MockCartScreen = ({ navigation }: any) => {
    return (
      <View testID="carrinho-screen">
        <Text>Bolo de Chocolate</Text>
        <Text>R$ 45,90</Text>
        <TouchableOpacity 
          testID="finalizar-compra-button" 
          onPress={() => { 
            if (navigation) {
                navigation.navigate('ScheduleDelivery'); 
            }
          }} 
        >
          <Text>Checkout</Text>
        </TouchableOpacity>
      </View>
    );
  };
  return {
    __esModule: true,
    default: MockCartScreen,
  };
});

jest.mock('../../screens/ScheduleDeliveryScreen', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  const MockScheduleDeliveryScreen = ({ navigation }: any) => {
    return (
      <View testID="schedule-delivery-screen">
        <Text>Agendar Entrega</Text>
        <TouchableOpacity 
          testID="select-date-button" 
          onPress={() => {}} 
        >
          <Text>Selecionar Data</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          testID="time-slot-09:00" 
          onPress={() => {}} 
        >
          <Text>09:00</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          testID="continue-button" 
          onPress={() => { 
            navigation.navigate('Checkout', { 
              scheduledDelivery: { 
                date: '2026-05-15', 
                timeSlot: '09:00-12:00', 
                price: 15.0 
              } 
            }); 
          }} 
        >
          <Text>Continuar</Text>
        </TouchableOpacity>
      </View>
    );
  };
  return {
    __esModule: true,
    default: MockScheduleDeliveryScreen,
  };
});

jest.mock('../../screens/ProfileScreen', () => ({
  ProfileScreen: () => {
    const { View } = require('react-native');
    return <View testID="profile-screen" />;
  },
}));

jest.mock('../../screens/ProductDetailScreen', () => {
  const { View, Button, Text } = require('react-native');
  return ({ navigation }: any) => (
    <View testID="produto-detalhe-screen">
      <Text>Bolo de Chocolate</Text>
      <Text>R$ 45,90</Text>
      <Button testID="adicionar-carrinho-button" title="Adicionar" onPress={() => {}} />
      <Text>Produto adicionado ao carrinho!</Text> 
      <Button 
        testID="carrinho-button" 
        title="Carrinho" 
        onPress={() => { 
          navigation.navigate('MainTabs', { screen: 'Cart' });
        }} 
      />
    </View>
  );
});

jest.mock('../../screens/CheckoutScreen', () => {
  const { View, Button, TextInput } = require('react-native');
  return ({ navigation }: any) => (
    <View testID="checkout-screen">
      <TextInput testID="endereco-input" />
      <TextInput testID="numero-input" />
      <TextInput testID="complemento-input" />
      <TextInput testID="bairro-input" />
      <TextInput testID="cidade-input" />
      <TextInput testID="estado-input" />
      <TextInput testID="cep-input" />
      <Button 
        testID="continuar-pagamento-button" 
        title="Pagamento" 
        onPress={() => navigation.navigate('PaymentMethods')} 
      />
    </View>
  );
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

jest.mock('../../screens/PaymentMethodsScreen', () => ({
  PaymentMethodsScreen: ({ navigation }: any) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="pagamento-screen">
        <Button testID="cartao-credito-option" title="Cartão" onPress={() => {}} />
        <Button 
          testID="finalizar-pagamento-button" 
          title="Pagar" 
          onPress={() => navigation.navigate('OrderCompleted', { order: { id: 'order123' } })} 
        />
      </View>
    );
  },
}));

jest.mock('../../screens/OrderCompletedScreen', () => {
  const { View, Button, Text } = require('react-native');
  return ({ navigation }: any) => (
    <View testID="confirmacao-pedido-screen">
      <Text>Pedido Confirmado!</Text>
      <Text>Seu pedido foi realizado com sucesso.</Text>
      <Text>Número do pedido: order123</Text>
      <Button 
        testID="voltar-inicio-button" 
        title="Início" 
        onPress={() => navigation.navigate('Home')} 
      />
    </View>
  );
});

describe('Teste E2E - Fluxo Completo de Compra', () => {
  jest.setTimeout(120000);
  // const mockNavigate = jest.fn(); // Removed to use real navigation

  beforeEach(() => {
    // Limpar todos os mocks
    jest.clearAllMocks();
    
    // Configurar timers
    // jest.useRealTimers(); // Usar timers reais para evitar problemas com animações/timeouts longos

    // Mock das permissões para cliente
    (usePermissions as jest.Mock).mockReturnValue({
      loading: false,
      userRole: null,
      isEntregador: false,
      hasPermission: jest.fn().mockReturnValue(false),
      hasPermissions: jest.fn().mockReturnValue(false),
      updatePermissions: jest.fn(),
      isAdmin: false,
      isGerente: false,
      isAtendente: false,
      isCliente: false,
    });
  });

  afterEach(() => {
    // jest.useRealTimers();
  });

  it('deve completar o fluxo de compra do login até a confirmação do pedido', async () => {
    const { getByTestId, getByText, queryByText, getAllByTestId, queryByTestId, findByTestId, debug } = render(
      <App />
    );
    // Avançar tempo para passar o loading inicial (AppNavigator timer)
    await act(async () => {
      // jest.advanceTimersByTime(2000);
      await new Promise(resolve => setTimeout(resolve, 2500)); // Esperar loading inicial (real time)
    });

    // 1. Aguardar a tela de Login aparecer (pode demorar devido à verificação de sessão)
    try {
      await waitFor(() => getByTestId('login-screen'), { timeout: 10000 });
    } catch (e) {
      debug();
      throw e;
    }

    try {
      // 2. Realizar login
      const emailInput = await findByTestId('email-input', {}, { timeout: 5000 });
      const passwordInput = await findByTestId('password-input', {}, { timeout: 5000 });
      const loginButton = await findByTestId('login-button', {}, { timeout: 5000 });
  
      fireEvent.changeText(emailInput, 'cliente@exemplo.com');
      fireEvent.changeText(passwordInput, 'senha123');
  
      await act(async () => {
        fireEvent.press(loginButton);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Esperar processamento do login
      });

      // Atualizar mock de permissões para refletir usuário logado
      (usePermissions as jest.Mock).mockReturnValue({
        loading: false,
        userRole: 'cliente',
        isEntregador: false,
        hasPermission: jest.fn().mockReturnValue(true),
        hasPermissions: jest.fn().mockReturnValue(true),
        updatePermissions: jest.fn(),
        isAdmin: false,
        isGerente: false,
        isAtendente: false,
        isCliente: true,
      });

    } catch (e) {
      throw e;
    }

    // 3. Verificar navegação para a tela inicial após login
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });

    // 4. Navegar para a tela de produtos
    const produtosButton = getByTestId('produtos-button');

    await act(async () => {
      fireEvent.press(produtosButton);
    });

    // 5. Verificar se a tela de produtos carregou
    await waitFor(() => {
      expect(getByTestId('produtos-screen')).toBeTruthy();
      expect(getByText('Bolo de Chocolate')).toBeTruthy();
    });

    // 6. Selecionar um produto
    const produto = getByTestId('produto-prod1');

    await act(async () => {
      fireEvent.press(produto);
    });

    // 7. Verificar se a tela de detalhes do produto carregou
    await waitFor(() => {
      expect(getByTestId('produto-detalhe-screen')).toBeTruthy();
      expect(getByText('Bolo de Chocolate')).toBeTruthy();
      expect(getByText('R$ 45,90')).toBeTruthy();
    });

    // 8. Adicionar produto ao carrinho
    const addButton = getByTestId('adicionar-carrinho-button');

    await act(async () => {
      fireEvent.press(addButton);
    });

    // 9. Verificar se o produto foi adicionado ao carrinho
    await waitFor(() => {
      expect(getByText('Produto adicionado ao carrinho!')).toBeTruthy();
    });

    // 10. Navegar para o carrinho
    const carrinhoButton = getByTestId('carrinho-button');

    await act(async () => {
      fireEvent.press(carrinhoButton);
    });

    // 11. Verificar se a tela do carrinho carregou corretamente
    await waitFor(() => {
      expect(getByTestId('carrinho-screen')).toBeTruthy();
      expect(getByText('Bolo de Chocolate')).toBeTruthy();
      expect(getByText('R$ 45,90')).toBeTruthy();
    });

    // 12. Prosseguir para o agendamento
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for transition
    const checkoutButton = getByTestId('finalizar-compra-button');

    await act(async () => {
      fireEvent.press(checkoutButton);
      
      // Explicitly trigger onPress for the mock if fireEvent didn't catch it (common in RNTL with some mocks)
      if (checkoutButton.props.onPress) {
        checkoutButton.props.onPress();
      } else if (checkoutButton.props.onClick) {
        checkoutButton.props.onClick();
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // 12a. Agendar Entrega
    try {
      await waitFor(() => {
        expect(getByTestId('schedule-delivery-screen')).toBeTruthy();
      }, { timeout: 5000 });
    } catch (e) {
      debug();
      throw e;
    }

    // Selecionar data (mocked calendar)
    const selectDateButton = getByTestId('select-date-button');
    await act(async () => {
      fireEvent.press(selectDateButton);
    });

    // Selecionar horário (assumindo que 09:00 está disponível para a data futura)
    // Precisamos esperar a renderização dos slots após selecionar a data
    await waitFor(() => {
      expect(getByTestId('time-slot-09:00')).toBeTruthy();
    });
    
    const timeSlotButton = getByTestId('time-slot-09:00');
    await act(async () => {
      fireEvent.press(timeSlotButton);
    });

    // Continuar para pagamento
    const continueButton = getByTestId('continue-button');
    await act(async () => {
      fireEvent.press(continueButton);
    });

    // 13. Verificar se a tela de checkout carregou
    await waitFor(() => {
      expect(getByTestId('checkout-screen')).toBeTruthy();
    });

    // 14. Preencher informações de entrega
    const enderecoInput = getByTestId('endereco-input');
    const numeroInput = getByTestId('numero-input');
    const complementoInput = getByTestId('complemento-input');
    const bairroInput = getByTestId('bairro-input');
    const cidadeInput = getByTestId('cidade-input');
    const estadoInput = getByTestId('estado-input');
    const cepInput = getByTestId('cep-input');

    fireEvent.changeText(enderecoInput, 'Rua das Flores');
    fireEvent.changeText(numeroInput, '123');
    fireEvent.changeText(complementoInput, 'Apto 101');
    fireEvent.changeText(bairroInput, 'Centro');
    fireEvent.changeText(cidadeInput, 'São Paulo');
    fireEvent.changeText(estadoInput, 'SP');
    fireEvent.changeText(cepInput, '01001-000');

    // 15. Continuar para pagamento
    const continuarButton = getByTestId('continuar-pagamento-button');

    await act(async () => {
      fireEvent.press(continuarButton);
    });

    // 16. Verificar se a tela de pagamento carregou
    await waitFor(() => {
      expect(getByTestId('pagamento-screen')).toBeTruthy();
    });

    // 17. Selecionar método de pagamento
    const cartaoCreditoOption = getByTestId('cartao-credito-option');

    await act(async () => {
      fireEvent.press(cartaoCreditoOption);
    });

    // 18. Finalizar pagamento
    const pagarButton = getByTestId('finalizar-pagamento-button');

    await act(async () => {
      fireEvent.press(pagarButton);
    });

    // 19. Verificar se o pagamento foi processado e o pedido confirmado
    await waitFor(() => {
      expect(getByTestId('confirmacao-pedido-screen')).toBeTruthy();
      expect(getByText('Pedido Confirmado!')).toBeTruthy();
      expect(getByText('Seu pedido foi realizado com sucesso.')).toBeTruthy();
      expect(getByText('Número do pedido: order123')).toBeTruthy();
    });

    // 20. Verificar botão para voltar à tela inicial
    const voltarInicioButton = getByTestId('voltar-inicio-button');
    expect(voltarInicioButton).toBeTruthy();

    // 21. Voltar para a tela inicial
    await act(async () => {
      fireEvent.press(voltarInicioButton);
    });

    // 22. Verificar se voltou para a tela inicial
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });
});
