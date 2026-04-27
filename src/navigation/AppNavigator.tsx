import React, { useEffect, useState } from 'react';
import { useAppTheme } from '../components/ThemeProvider';
import { NavigationContainer, NavigatorScreenParams, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import usePermissions from '../hooks/usePermissions';
// import { useNotifications } from '../hooks/useNotifications'; // DESLIGADO NA FASE 1194

// Telas de autenticação
import LoginScreen from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';

// Telas principais
import { HomeScreen } from '../screens/HomeScreen';
import CatalogScreen from '../screens/CatalogScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import CartScreen from '../screens/CartScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import { OrderDetailsScreen } from '../screens/OrderDetailsScreen';
import { AddressScreen } from '../screens/AddressScreen';
import { PaymentMethodsScreen } from '../screens/PaymentMethodsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import { ProductManagementScreen } from '../screens/ProductManagementScreen';
import { OrderManagementScreen } from '../screens/OrderManagementScreen';
import { AddEditProductScreen } from '../screens/AddEditProductScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { NotificationSettingsScreenV2 } from '../screens/NotificationSettingsScreenV2';
import { NotificationSettingsMigrationScreen } from '../screens/NotificationSettingsMigrationScreen';
import { DeliveryDriverProfileScreen } from '../screens/DeliveryDriverProfileScreen';
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

export type MainTabParamList = {
  Home: undefined;
  Catalog: undefined;
  Orders: undefined;
  Cart: undefined;
  Profile: undefined;
};

export type DriverTabParamList = {
  DriverDeliveries: undefined;
  DriverProfile: undefined;
};

export type RootStackParamList = {
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ProductDetail: { productId: string };
  Checkout: { scheduledDelivery?: DeliverySchedule } | undefined;
  ScheduleDelivery: undefined;
  OrderCompleted: { order: Order };
  OrderDetail: undefined;
  OrderDetails: { orderId: string };
  Address: undefined;
  PaymentMethods: undefined;
  EditProfile: undefined;
  AdminPanel: undefined;
  ProductManagement: undefined;
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
  DeliveryDriverRegistration: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const DriverTab = createBottomTabNavigator<DriverTabParamList>();

// Navegador de abas principal
const MainTabs = () => {
  const { theme } = useAppTheme();
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
      <Tab.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Pedidos' }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ title: 'Carrinho' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
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

            if (route.name === 'DriverDeliveries') {
              iconName = focused ? 'truck' : 'truck-outline';
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
        name="DriverDeliveries"
        component={OrderManagementScreen}
        options={{ title: 'Entregas' }}
      />
      <DriverTab.Screen
        name="DriverProfile"
        component={DeliveryDriverProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </DriverTab.Navigator>
  );
};

// Navegador principal do aplicativo
const AppNavigator = () => {
  const { user, loading } = useAuth();
  const { isEntregador, isProdutor, isAdmin, loading: permissionsLoading } = usePermissions();
  const [isReady, setIsReady] = useState(false);
  const { isDark, theme } = useAppTheme();
  
  // Mesclar o tema da navegação com o nosso tema customizado
  const navigationTheme = isDark 
    ? { ...NavigationDarkTheme, colors: { ...NavigationDarkTheme.colors, primary: theme.colors.primary, background: theme.colors.background, card: theme.colors.card, text: theme.colors.text.primary, border: theme.colors.border, notification: theme.colors.notification } } 
    : { ...NavigationDefaultTheme, colors: { ...NavigationDefaultTheme.colors, primary: theme.colors.primary, background: theme.colors.background, card: theme.colors.card, text: theme.colors.text.primary, border: theme.colors.border, notification: theme.colors.notification } };
  
  // Inicializar notificações
  // useNotifications(); // DESLIGADO NA FASE 1194

  useEffect(() => {
    // Simular um tempo de carregamento para garantir que o estado de autenticação esteja pronto
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading || permissionsLoading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} testID="app-loading">
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {user ? (
          // Rotas privadas (usuário autenticado)
          <>
            {isEntregador ? (
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
                {/* Telas Administrativas / Produtor */}
                {(isProdutor || isAdmin) && (
                  <>
                    <Stack.Screen
                      name="AdminPanel"
                      component={AdminPanelScreen}
                      options={{ title: 'Painel de Administração' }}
                    />
                    <Stack.Screen
                      name="PremiumTest"
                      component={PremiumTestScreen}
                      options={{ title: 'Testes Premium' }}
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
                      name="AddEditProduct"
                      component={AddEditProductScreen}
                      options={{ title: 'Adicionar/Editar Produto' }}
                    />
                  </>
                )}
                {/* Telas Comuns */}
                <Stack.Screen
                  name="ProductDetail"
                  component={ProductDetailScreen}
                  options={{ title: 'Detalhes do Produto' }}
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
