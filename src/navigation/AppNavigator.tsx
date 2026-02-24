import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Telas de autenticação
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';

// Telas principais
import { HomeScreen } from '../screens/HomeScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { CartScreen } from '../screens/CartScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { AddressScreen } from '../screens/AddressScreen';
import { PaymentMethodsScreen } from '../screens/PaymentMethodsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { AdminPanelScreen } from '../screens/AdminPanelScreen';
import { ProductManagementScreen } from '../screens/ProductManagementScreen';
import { OrderManagementScreen } from '../screens/OrderManagementScreen';
import { AddEditProductScreen } from '../screens/AddEditProductScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { NotificationSettingsScreenV2 } from '../screens/NotificationSettingsScreenV2';
import { NotificationSettingsMigrationScreen } from '../screens/NotificationSettingsMigrationScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navegador de abas principal
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        return {
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

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
          tabBarActiveTintColor: '#FF6B6B',
          tabBarInactiveTintColor: 'gray',
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

// Navegador principal do aplicativo
const AppNavigator = () => {
  const { user, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simular um tempo de carregamento para garantir que o estado de autenticação esteja pronto
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
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
              name="OrderDetail"
              component={OrderDetailScreen}
              options={{ title: 'Detalhes do Pedido' }}
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
              name="AdminPanel"
              component={AdminPanelScreen}
              options={{ title: 'Painel de Administração' }}
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
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ title: 'Configurações de Notificação' }}
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
