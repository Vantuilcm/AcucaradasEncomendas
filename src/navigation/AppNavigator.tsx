import React, { useMemo } from 'react';
import { useAppTheme } from '../components/ThemeProvider';
import { NavigationContainer, NavigatorScreenParams, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import usePermissions from '../hooks/usePermissions';
import { UserUtils } from '../utils/UserUtils';
import { secureLoggingService } from '../services/SecureLoggingService';
import { navigationRef } from '../services/RootNavigation';

// Telas de autenticação
import LoginScreen from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { RoleSelectionScreen } from '../screens/RoleSelectionScreen';

// Telas principais
import { HomeScreen } from '../screens/HomeScreen';
import CatalogScreen from '../screens/CatalogScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import CartScreen from '../screens/CartScreen';
import { CompradorProfileScreen } from '../screens/CompradorProfileScreen';
import { ProdutorProfileScreen } from '../screens/ProdutorProfileScreen';
import { EntregadorProfileScreen } from '../screens/EntregadorProfileScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import { OrderDetailsScreen } from '../screens/OrderDetailsScreen';
import { AddressScreen } from '../screens/AddressScreen';
import { PaymentMethodsScreen } from '../screens/PaymentMethodsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import { StorePreviewScreen } from '../screens/StorePreviewScreen';
import { ProductManagementScreen } from '../screens/ProductManagementScreen';
import { OrderManagementScreen } from '../screens/OrderManagementScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { StoreHoursScreen } from '../screens/StoreHoursScreen';
import { InventoryManagementScreen } from '../screens/InventoryManagementScreen';
import { AddEditProductScreen } from '../screens/AddEditProductScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { NotificationSettingsScreenV2 } from '../screens/NotificationSettingsScreenV2';
import { NotificationSettingsMigrationScreen } from '../screens/NotificationSettingsMigrationScreen';
import { DriverHomeScreen } from '../screens/DriverHomeScreen';
import DeliveryDriverRegistration from '../screens/DeliveryDriverRegistration';
import ScheduleDeliveryScreen from '../screens/ScheduleDeliveryScreen';
import OrderCompletedScreen from '../screens/OrderCompletedScreen';
import { HelpCenterScreen } from '../screens/HelpCenterScreen';
import { PrivacySettingsScreen } from '../screens/PrivacySettingsScreen';
import { TermsOfUseScreen } from '../screens/TermsOfUseScreen';
import { CreateReviewScreen } from '../screens/CreateReviewScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { PremiumTestScreen } from '../screens/PremiumTestScreen';
import type { DeliverySchedule, Order } from '../types/Order';

import { StoreDetailsScreen } from '../screens/StoreDetailsScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { ChartTestScreen } from '../screens/ChartTestScreen';

export type MainTabParamList = {
  Home: undefined;
  Catalog: undefined;
  StoreManager: undefined;
  Orders: undefined;
  Cart: undefined;
  Profile: undefined;
};

export type DriverTabParamList = {
  DriverHome: undefined;
  DriverProfile: undefined;
};

export type RootStackParamList = {
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ProductDetail: { productId: string, product?: any };
  StoreDetails: { storeId: string, storeName?: string };
  Checkout: { scheduledDelivery?: DeliverySchedule } | undefined;
  ScheduleDelivery: undefined;
  OrderCompleted: { order: Order };
  OrderDetail: undefined;
  OrderDetails: { orderId: string };
  Address: undefined;
  PaymentMethods: undefined;
  EditProfile: undefined;
  StorePreview: undefined;
  AdminPanel: undefined;
  AdminDashboard: undefined;
  ProductManagement: undefined;
  StoreHours: undefined;
  InventoryManagement: undefined;
  OrderManagement: undefined;
  AddEditProduct: undefined;
  NotificationSettings: undefined;
  NotificationSettingsV2: undefined;
  NotificationSettingsMigration: undefined;
  HelpCenter: undefined;
  PrivacySettings: undefined;
  TermsOfUse: undefined;
  CreateReview: { orderId: string };
  Chat: { orderId: string, targetName?: string };
  PremiumTest: undefined;
  ChartTest: undefined;
  DeliveryDriverRegistration: undefined;
  OrdersHistory: undefined;
  Favorites: undefined;
  Reports: undefined;
  DriverVehicle: undefined;
  DriverPix: undefined;
  DriverDocuments: undefined;
  DriverEarnings: undefined;
  DriverHistory: undefined;
  Login: undefined;
  Register: { role?: string };
  ForgotPassword: undefined;
  RoleSelection: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const DriverTab = createBottomTabNavigator<DriverTabParamList>();

// Navegador de abas principal
const MainTabs = () => {
  const { theme } = useAppTheme();
  const { isProdutor, isAdmin } = usePermissions();
  const { user } = useAuth();

  // Selecionar tela de perfil baseada na role real do usuário
  const ProfileComponent = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    if (role === 'produtor' || role === 'producer') return ProdutorProfileScreen;
    if (role === 'entregador' || role === 'driver') return EntregadorProfileScreen;
    return CompradorProfileScreen;
  }, [user?.role]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        return {
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = 'home';

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Catalog') {
              iconName = focused ? 'view-grid' : 'view-grid-outline';
            } else if (route.name === 'StoreManager') {
              iconName = focused ? 'store' : 'store-outline';
            } else if (route.name === 'Orders') {
              iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
            } else if (route.name === 'Cart') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'account' : 'account-outline';
            }

            return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.text.disabled,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
          },
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text.primary,
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
      
      {(isProdutor || isAdmin) ? (
        <Tab.Screen name="StoreManager" component={AdminPanelScreen} options={{ title: 'Minha Loja' }} />
      ) : (
        <Tab.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      )}

      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Pedidos' }} />
      
      {!(isProdutor || isAdmin) && (
        <Tab.Screen name="Cart" component={CartScreen} options={{ title: 'Carrinho' }} />
      )}

      <Tab.Screen name="Profile" component={ProfileComponent} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
};

const DriverTabs = () => {
  const { theme } = useAppTheme();
  return (
    <DriverTab.Navigator
      screenOptions={({ route }) => {
        return {
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = 'truck';

            if (route.name === 'DriverHome') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'DriverProfile') {
              iconName = focused ? 'account' : 'account-outline';
            }

            return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.text.disabled,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
          },
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text.primary,
        };
      }}
    >
      <DriverTab.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{ title: 'Início' }}
      />
      <DriverTab.Screen
        name="DriverProfile"
        component={EntregadorProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </DriverTab.Navigator>
  );
};

// Navegador principal do aplicativo
const AppNavigator = () => {
  const { user, loading: authLoading, profileLoading, isReady, logout } = useAuth();
  const { isProdutor: _isProdutor, isAdmin: _isAdmin, isEntregador, loading: permissionsLoading } = usePermissions();
  const { theme, isDark } = useAppTheme();

  // Mesclar o tema da navegação com o nosso tema customizado
  const navigationTheme = useMemo(() => {
    try {
      return isDark 
        ? { ...NavigationDarkTheme, colors: { ...NavigationDarkTheme.colors, primary: theme?.colors?.primary || '#E91E63', background: theme?.colors?.background || '#FFFFFF', card: theme?.colors?.card || '#FFFFFF', text: theme?.colors?.text?.primary || '#000000', border: theme?.colors?.border || '#E0E0E0', notification: theme?.colors?.notification || '#FF0000' } } 
        : { ...NavigationDefaultTheme, colors: { ...NavigationDefaultTheme.colors, primary: theme?.colors?.primary || '#E91E63', background: theme?.colors?.background || '#FFFFFF', card: theme?.colors?.card || '#FFFFFF', text: theme?.colors?.text?.primary || '#000000', border: theme?.colors?.border || '#E0E0E0', notification: theme?.colors?.notification || '#FF0000' } };
    } catch (e) {
      console.error('Erro ao processar tema de navegação:', e);
      return NavigationDefaultTheme;
    }
  }, [isDark, theme]);

  // Controle de Boot Global Determinístico
  // Esperamos auth, perfil E permissões estarem prontos
  if (!isReady || authLoading || profileLoading || permissionsLoading) {
    return (
      <View 
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: theme?.colors?.background || '#FFFFFF'
        }} 
      >
        <ActivityIndicator size="large" color={theme?.colors?.primary || '#E91E63'} />
      </View>
    );
  }

  // Centralização de Identidade e Redirecionamento Determinístico
  const userId = UserUtils.getUserId(user);
  const userRole = UserUtils.getUserRole(user);
  const isAuthenticated = !!userId;

  // Proteger acesso a profile antes de estar pronto
  if (isAuthenticated && !user) {
    secureLoggingService.error('PROFILE_RECOVERY_NEEDED', { userId });
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          Detectamos um problema ao carregar seu perfil.
        </Text>
        <Button mode="contained" onPress={logout}>
          Tentar Novamente (Logout)
        </Button>
      </View>
    );
  }

  // Log do alvo de navegação
  if (isAuthenticated) {
    const target = UserUtils.getNavigationTarget(userRole);
    secureLoggingService.info('NAVIGATION_TARGET', { userId, role: userRole, target });
  }

  return (
  <NavigationContainer theme={navigationTheme} ref={navigationRef}>
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme?.colors?.card || '#FFFFFF',
        },
        headerTintColor: theme?.colors?.text?.primary || '#000000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {isAuthenticated ? (
        <>
          {/* BootDiagnostic removido como rota inicial */}

          {!userRole ? (
            <Stack.Screen
              name="RoleSelection"
              component={RoleSelectionScreen}
              options={{ title: 'Completar Cadastro', headerShown: false }}
            />
          ) : isEntregador ? (
            <>
              <Stack.Screen
                name="DriverTabs"
                component={DriverTabs}
                options={{ headerShown: false }}
              />
                <Stack.Screen
                  name="OrderDetails"
                  component={OrderDetailsScreen}
                  options={{ title: 'Detalhes do Pedido' }}
                />
                <Stack.Screen
                  name="DeliveryDriverRegistration"
                  component={DeliveryDriverRegistration}
                  options={{ title: 'Cadastro de Entregador' }}
                />
                <Stack.Screen
                  name="NotificationSettings"
                  component={NotificationSettingsScreen}
                  options={{ title: 'Configurações de Notificação' }}
                />
                <Stack.Screen
                  name="HelpCenter"
                  component={HelpCenterScreen}
                  options={{ title: 'Central de Ajuda' }}
                />
              </>
            ) : (
              <>
                <Stack.Screen
                  name="MainTabs"
                  component={MainTabs}
                  options={{ headerShown: false }}
                />
                
                {/* Telas Administrativas / Produtor - Sempre registradas para evitar race conditions no mounting */}
                <Stack.Screen
                  name="AdminPanel"
                  component={AdminPanelScreen}
                  options={{ title: 'Painel de Administração' }}
                />
                <Stack.Screen
                  name="AdminDashboard"
                  component={PlaceholderScreen}
                  options={{ title: 'Dashboard Administrativo' }}
                />
                <Stack.Screen
                  name="PremiumTest"
                  component={PremiumTestScreen}
                  options={{ title: 'Testes Premium' }}
                />
                <Stack.Screen
                  name="ChartTest"
                  component={ChartTestScreen}
                  options={{ title: 'Teste Isolado de Gráfico' }}
                />
                <Stack.Screen
                  name="ProductManagement"
                  component={ProductManagementScreen}
                  options={{ title: 'Gerenciar Produtos' }}
                />
                <Stack.Screen
                  name="OrderManagement"
                  component={OrderManagementScreen}
                  options={{ title: 'Gerenciar Pedidos' }}
                />
                <Stack.Screen
                  name="StorePreview"
                  component={StorePreviewScreen}
                  options={{ title: 'Visualizar Minha Loja' }}
                />
                <Stack.Screen
                  name="Reports"
                  component={ReportsScreen}
                  options={{ title: 'Financeiro e Relatórios' }}
                />
                <Stack.Screen
                  name="StoreHours"
                  component={StoreHoursScreen}
                  options={{ title: 'Horários de Funcionamento' }}
                />
                <Stack.Screen
                  name="InventoryManagement"
                  component={InventoryManagementScreen}
                  options={{ title: 'Gerenciar Estoque' }}
                />
                <Stack.Screen
                  name="AddEditProduct"
                  component={AddEditProductScreen}
                  options={{ title: 'Adicionar/Editar Produto' }}
                />

                {/* Telas Comuns */}
                <Stack.Screen
                  name="ProductDetail"
                  component={ProductDetailScreen}
                  options={{ title: 'Detalhes do Produto' }}
                />
                <Stack.Screen
                  name="StoreDetails"
                  component={StoreDetailsScreen}
                  options={{ title: 'Detalhes da Loja' }}
                />
                <Stack.Screen
                  name="Checkout"
                  component={CheckoutScreen}
                  options={{ title: 'Finalizar Compra' }}
                />
                <Stack.Screen
                  name="ScheduleDelivery"
                  component={ScheduleDeliveryScreen}
                  options={{ title: 'Agendar Entrega' }}
                />
                <Stack.Screen
                  name="OrderCompleted"
                  component={OrderCompletedScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="OrderDetail"
                  component={OrderDetailScreen}
                  options={{ title: 'Detalhes do Pedido' }}
                />
                <Stack.Screen
                  name="OrderDetails"
                  component={OrderDetailsScreen}
                  options={{ title: 'Detalhes do Pedido' }}
                />
                <Stack.Screen
                  name="CreateReview"
                  component={CreateReviewScreen}
                  options={{ title: 'Avaliar Pedido' }}
                />
                <Stack.Screen
                  name="Address"
                  component={AddressScreen}
                  options={{ title: 'Endereços' }}
                />
                <Stack.Screen
                  name="PaymentMethods"
                  component={PaymentMethodsScreen}
                  options={{ title: 'Métodos de Pagamento' }}
                />
                <Stack.Screen
                  name="EditProfile"
                  component={EditProfileScreen}
                  options={{ title: 'Editar Perfil' }}
                />
                <Stack.Screen
                  name="NotificationSettingsV2"
                  component={NotificationSettingsScreenV2}
                  options={{ title: 'Configurações de Notificação V2' }}
                />
                <Stack.Screen
                  name="NotificationSettingsMigration"
                  component={NotificationSettingsMigrationScreen}
                  options={{ title: 'Migração de Notificações' }}
                />
                <Stack.Screen
                  name="HelpCenter"
                  component={HelpCenterScreen}
                  options={{ title: 'Central de Ajuda' }}
                />
                <Stack.Screen
                  name="PrivacySettings"
                  component={PrivacySettingsScreen}
                  options={{ title: 'Privacidade' }}
                />
                <Stack.Screen
                  name="TermsOfUse"
                  component={TermsOfUseScreen}
                  options={{ title: 'Termos de Uso' }}
                />
                <Stack.Screen
                  name="Chat"
                  component={ChatScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="DeliveryDriverRegistration"
                  component={DeliveryDriverRegistration}
                  options={{ title: 'Cadastro de Entregador' }}
                />
                <Stack.Screen name="OrdersHistory" component={PlaceholderScreen} options={{ title: 'Histórico' }} />
                <Stack.Screen name="Favorites" component={PlaceholderScreen} options={{ title: 'Favoritos' }} />
                <Stack.Screen name="DriverVehicle" component={PlaceholderScreen} options={{ title: 'Veículo' }} />
                <Stack.Screen name="DriverPix" component={PlaceholderScreen} options={{ title: 'Pix' }} />
                <Stack.Screen name="DriverDocuments" component={PlaceholderScreen} options={{ title: 'Documentos' }} />
                <Stack.Screen name="DriverEarnings" component={PlaceholderScreen} options={{ title: 'Ganhos' }} />
                <Stack.Screen name="DriverHistory" component={PlaceholderScreen} options={{ title: 'Corridas' }} />
              </>
            )}
          </>
        ) : (
          // Rotas públicas (usuário não autenticado)
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Criar Conta' }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ title: 'Recuperar Senha' }}
            />
            <Stack.Screen
              name="TermsOfUse"
              component={TermsOfUseScreen}
              options={{ title: 'Termos de Uso' }}
            />
            <Stack.Screen
              name="PrivacySettings"
              component={PrivacySettingsScreen}
              options={{ title: 'Privacidade' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
