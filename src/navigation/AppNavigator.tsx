import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRootNavigationState } from 'expo-router';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PermissionsService } from '@/services/PermissionsService';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { secureLoggingService } from '@/services/SecureLoggingService';

// Telas de autenticação
import LoginScreen from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';

// Telas principais
import { HomeScreen } from '@/screens/HomeScreen';
import CatalogScreen from '@/screens/CatalogScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import CartScreen from '@/screens/CartScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import CustomerProfileScreen from '@/screens/CustomerProfileScreen';
import ProductDetailScreen from '@/screens/ProductDetailScreen';
import CheckoutScreen from '@/screens/CheckoutScreen';
import ScheduleDeliveryScreen from '@/screens/ScheduleDeliveryScreen';
import OrderDetailScreen from '@/screens/OrderDetailScreen';
import { AddressScreen } from '@/screens/AddressScreen';
import { AddressFormScreen } from '@/screens/AddressFormScreen';
import { PaymentMethodsScreen } from '@/screens/PaymentMethodsScreen';
import EditProfileScreen from '@/screens/EditProfileScreen';
import AdminPanelScreen from '@/screens/AdminPanelScreen';
import AdminDeliveryMonitoringScreen from '@/screens/AdminDeliveryMonitoringScreen';
import AdminWithdrawalManagementScreen from '@/screens/AdminWithdrawalManagementScreen';
import { AdminDashboardScreen } from '@/screens/AdminDashboardScreen';
import { ProductManagementScreen } from '@/screens/ProductManagementScreen';
import { OrderManagementScreen } from '@/screens/OrderManagementScreen';
import { AddEditProductScreen } from '@/screens/AddEditProductScreen';
import ProductTechnicalSheetScreen from '@/screens/ProductTechnicalSheetScreen';
import { NotificationSettingsScreen } from '@/screens/NotificationSettingsScreen';
import { NotificationSettingsScreenV2 } from '@/screens/NotificationSettingsScreenV2';
import { NotificationSettingsMigrationScreen } from '@/screens/NotificationSettingsMigrationScreen';
import TwoFactorAuthScreen from '@/screens/TwoFactorAuthScreen';
import { HelpCenterScreen } from '@/screens/HelpCenterScreen';
import { HelpCategoryScreen } from '@/screens/HelpCategoryScreen';
import { HelpArticleScreen } from '@/screens/HelpArticleScreen';
import { StoreListScreen } from '@/screens/StoreListScreen';
import { ShopSettingsScreen } from '@/screens/ShopSettingsScreen';
import { TermsOfUseScreen, PrivacyPolicyScreen } from '@/screens/TermsOfUseScreen';
import { PrivacySettingsScreen } from '@/screens/PrivacySettingsScreen';
import ConfiguracoesScreen from '@/screens/ConfiguracoesScreen';
import VoiceTestScreen from '@/screens/VoiceTestScreen';
import OrderCompletedScreen from '@/screens/OrderCompletedScreen';
import { ReportsScreen } from '@/screens/ReportsScreen';
import { ScheduledOrdersScreen } from '@/screens/ScheduledOrdersScreen';
import { InventoryManagementScreen } from '@/screens/InventoryManagementScreen';
import { CustomerManagementScreen } from '@/screens/CustomerManagementScreen';
import { PromotionManagementScreen } from '@/screens/PromotionManagementScreen';
import AdminRealTimeMonitoringScreen from '@/screens/AdminRealTimeMonitoringScreen';
import { DeliveryDriverProfileScreen } from '@/screens/DeliveryDriverProfileScreen';
import { CustomerFinanceDashboardScreen } from '@/screens/CustomerFinanceDashboardScreen';
import { ProducerFinanceDashboardScreen } from '@/screens/ProducerFinanceDashboardScreen';
import { DriverFinanceDashboardScreen } from '@/screens/DriverFinanceDashboardScreen';
import { DeliveryDriverRegistrationScreen } from '@/screens/DeliveryDriverRegistration';
import { ProducerRegistrationScreen } from '@/screens/ProducerRegistration';
import ChatScreen from '@/screens/ChatScreen';
import { StoreFrontScreen } from '@/screens/StoreFrontScreen';
import { useNotifications } from '@/hooks/useNotifications';
import { mobileNotificationService } from '@/services/MobileNotificationService';
import * as Notifications from 'expo-notifications';
import { LoggingService } from '@/services/LoggingService';
import type { RootStackParamList, MainTabParamList } from '@/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const logger = LoggingService.getInstance();

// Navegador de abas principal
const safe = (C: any) => (process.env.NODE_ENV === 'test' && typeof C !== 'function' ? (() => null) : C);

const ProfileEntryScreen = () => {
  const { user } = useAuth();
  const raw: any = (user as any)?.activeRole ?? (user as any)?.role ?? 'customer';
  const value = String(raw).toLowerCase();
  const isProducer = value === 'producer' || value === 'produtor' || value === 'gerente' || value === 'admin';
  const isCourier = value === 'courier' || value === 'entregador' || value === 'driver';
  if (isProducer || isCourier) {
    return <ProfileScreen />;
  }
  return <CustomerProfileScreen />;
};

const MainTabs = () => {
  const { user } = useAuth();
  const rawRole: any = (user as any)?.activeRole ?? (user as any)?.role ?? 'customer';
  const initialTab: any = PermissionsService.getInstance().getDefaultTabForRole(rawRole);
  return (
    <Tab.Navigator
      key={initialTab}
      initialRouteName={initialTab}
      screenOptions={({ route }) => {
        return {
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any = 'help-circle-outline';
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
            const IconComponent: any = typeof (MaterialCommunityIcons as any) === 'function'
              ? (MaterialCommunityIcons as any)
              : ((props: any) => null);
            return <IconComponent name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF6B6B',
          tabBarInactiveTintColor: 'gray',
        };
      }}
    >
      <Tab.Screen name="Home" component={safe(HomeScreen)} options={{ title: 'Início' }} />
      <Tab.Screen name="Catalog" component={safe(CatalogScreen)} options={{ title: 'Catálogo' }} />
      <Tab.Screen name="Orders" component={safe(OrdersScreen)} options={{ title: 'Pedidos' }} />
      <Tab.Screen name="Cart" component={safe(CartScreen)} options={{ title: 'Carrinho' }} />
      <Tab.Screen name="Profile" component={safe(ProfileEntryScreen)} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
};

// Componente auxiliar para lidar com notificações dentro do NavigationContainer
const NotificationHandler = ({ isReady }: { isReady: boolean }) => {
  const navigation = useNavigation();
  useNotifications(navigation, isReady);
  return null;
};

// Navegador principal do aplicativo
const AppNavigator = () => {
  const { user, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const rootNavigationState = useRootNavigationState();
  
  useEffect(() => {
    // Sincronizar isReady com o rootNavigationState do Expo Router
    // Isso garante que o NotificationHandler só inicie quando o Navigator estiver estável
    if (!rootNavigationState?.key) return;

    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [rootNavigationState?.key]);

  if (loading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <>
      <NotificationHandler isReady={isReady} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FF6B6B',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {user ? (
          // Rotas privadas (usuário autenticado)
          <>
            <Stack.Screen name="MainTabs" component={safe(MainTabs)} options={{ headerShown: false }} />
            <Stack.Screen
              name="TwoFactorAuth"
              component={safe(TwoFactorAuthScreen)}
              options={{ title: 'Autenticação 2FA' }}
            />
            <Stack.Screen
              name="StoreList"
              component={safe(StoreListScreen)}
              options={{ title: 'Lojas' }}
            />
            <Stack.Screen
              name="StoreFront"
              component={safe(StoreFrontScreen)}
              options={{ title: 'Loja' }}
            />
            <Stack.Screen
              name="HelpCenter"
              component={safe(HelpCenterScreen)}
              options={{ title: 'Central de Ajuda' }}
            />
            <Stack.Screen
              name="HelpCategory"
              component={safe(HelpCategoryScreen)}
              options={{ title: 'Categoria' }}
            />
            <Stack.Screen
              name="HelpArticle"
              component={safe(HelpArticleScreen)}
              options={{ title: 'Artigo' }}
            />
            <Stack.Screen
              name="TermsOfUse"
              component={safe(TermsOfUseScreen)}
              options={{ title: 'Termos de Uso' }}
            />
          <Stack.Screen
            name="PrivacyPolicy"
            component={safe(PrivacyPolicyScreen)}
            options={{ title: 'Política de Privacidade' }}
          />
            <Stack.Screen
              name="PrivacySettings"
              component={safe(PrivacySettingsScreen)}
              options={{ title: 'Privacidade' }}
            />
            <Stack.Screen
              name="Configuracoes"
              component={safe(ConfiguracoesScreen)}
              options={{ title: 'Configurações' }}
            />
            <Stack.Screen
              name="VoiceTest"
              component={safe(VoiceTestScreen)}
              options={{ title: 'Teste de Voz' }}
            />
            <Stack.Screen
              name="ProductDetails"
              component={safe(ProductDetailScreen)}
              options={{ title: 'Detalhes do Produto' }}
            />
            <Stack.Screen
              name="Checkout"
              component={safe(CheckoutScreen)}
              options={{ title: 'Finalizar Compra' }}
            />
            <Stack.Screen
              name="ScheduleDelivery"
              component={safe(ScheduleDeliveryScreen)}
              options={{ title: 'Agendar Entrega' }}
            />
            <Stack.Screen
              name="OrderCompleted"
              component={safe(OrderCompletedScreen)}
              options={{ title: 'Pedido Concluído' }}
            />
            <Stack.Screen
              name="OrderDetails"
              component={safe(OrderDetailScreen)}
              options={{ title: 'Detalhes do Pedido' }}
            />
            <Stack.Screen
              name="Address"
              component={safe(AddressScreen)}
              options={{ title: 'Endereços' }}
            />
            <Stack.Screen
              name="AddressForm"
              component={safe(AddressFormScreen)}
              options={{ title: 'Endereço' }}
            />
            <Stack.Screen
              name="PaymentMethods"
              component={safe(PaymentMethodsScreen)}
              options={{ title: 'Métodos de Pagamento' }}
            />
            <Stack.Screen
              name="EditProfile"
              component={safe(EditProfileScreen)}
              options={{ title: 'Editar Perfil' }}
            />
            <Stack.Screen
              name="AdminPanel"
              component={safe(AdminPanelScreen)}
              options={{ title: 'Painel Administrativo' }}
            />
            <Stack.Screen
              name="ShopSettings"
              component={safe(ShopSettingsScreen)}
              options={{ title: 'Configurações da Loja' }}
            />
            <Stack.Screen
              name="AdminDeliveryMonitoring"
              component={safe(AdminDeliveryMonitoringScreen)}
              options={{ title: 'Monitoramento de Entregas' }}
            />
            <Stack.Screen
              name="AdminWithdrawalManagement"
              component={safe(AdminWithdrawalManagementScreen)}
              options={{ title: 'Gestão de Saques' }}
            />
          <Stack.Screen
            name="AdminDashboard"
            component={safe(AdminDashboardScreen)}
            options={{ title: 'Painel Administrativo' }}
          />
          <Stack.Screen
            name="ProductManagement"
            component={safe(ProductManagementScreen)}
            options={{ title: 'Gerenciar Produtos' }}
          />
          <Stack.Screen
            name="InventoryManagement"
            component={safe(InventoryManagementScreen)}
            options={{ title: 'Gerenciar Estoque' }}
          />
          <Stack.Screen
            name="CustomerManagement"
            component={safe(CustomerManagementScreen)}
            options={{ title: 'Gerenciar Clientes' }}
          />
          <Stack.Screen
            name="PromotionManagement"
            component={safe(PromotionManagementScreen)}
            options={{ title: 'Gerenciar Promoções' }}
          />
          <Stack.Screen
            name="OrderManagement"
            component={safe(OrderManagementScreen)}
            options={{ title: 'Gerenciar Pedidos' }}
          />
          <Stack.Screen
            name="ReportsScreen"
            component={safe(ReportsScreen)}
            options={{ title: 'Relatórios' }}
          />
          <Stack.Screen
            name="ProductTechnicalSheet"
            component={safe(ProductTechnicalSheetScreen)}
            options={{ title: 'Ficha técnica do produto' }}
          />
          <Stack.Screen
            name="AddEditProduct"
            component={safe(AddEditProductScreen)}
            options={{ title: 'Adicionar/Editar Produto' }}
          />
          <Stack.Screen
              name="NotificationSettings"
              component={safe(NotificationSettingsScreen)}
              options={{ title: 'Configurações de Notificação' }}
            />
            <Stack.Screen
              name="NotificationSettingsV2"
              component={safe(NotificationSettingsScreenV2)}
              options={{ title: 'Configurações de Notificação V2' }}
            />
            <Stack.Screen
              name="NotificationSettingsMigration"
              component={safe(NotificationSettingsMigrationScreen)}
              options={{ title: 'Migração de Notificações' }}
            />
            <Stack.Screen
              name="ScheduledOrders"
              component={safe(ScheduledOrdersScreen)}
              options={{ title: 'Pedidos Agendados' }}
            />
            <Stack.Screen
              name="AdminRealTimeMonitoring"
              component={safe(AdminRealTimeMonitoringScreen)}
              options={{ title: 'Monitoramento em Tempo Real' }}
            />
            <Stack.Screen
              name="DeliveryDriverProfile"
              component={safe(DeliveryDriverProfileScreen)}
              options={{ title: 'Perfil do Entregador' }}
            />
            <Stack.Screen
              name="CustomerFinanceDashboard"
              component={safe(CustomerFinanceDashboardScreen)}
              options={{ title: 'Meu Financeiro' }}
            />
            <Stack.Screen
              name="ProducerFinanceDashboard"
              component={safe(ProducerFinanceDashboardScreen)}
              options={{ title: 'Painel Financeiro' }}
            />
            <Stack.Screen
              name="DriverFinanceDashboard"
              component={safe(DriverFinanceDashboardScreen)}
              options={{ title: 'Painel Financeiro' }}
            />
            <Stack.Screen
              name="DeliveryDriverRegistration"
              component={safe(DeliveryDriverRegistrationScreen)}
              options={{ title: 'Cadastro de Entregador' }}
            />
            <Stack.Screen
              name="ProducerRegistration"
              component={safe(ProducerRegistrationScreen)}
              options={{ title: 'Cadastro de Produtor' }}
            />
            <Stack.Screen
              name="Chat"
              component={safe(ChatScreen)}
              options={{ title: 'Chat' }}
            />
          </>
        ) : (
          // Rotas públicas (usuário não autenticado)
          <>
            <Stack.Screen name="Login" component={safe(LoginScreen)} options={{ headerShown: false }} />
            <Stack.Screen
              name="Register"
              component={safe(RegisterScreen)}
              options={{ title: 'Criar Conta' }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={safe(ForgotPasswordScreen)}
              options={{ title: 'Recuperar Senha' }}
            />
          </>
        )}
      </Stack.Navigator>
    </>
  );
};

export default AppNavigator;
