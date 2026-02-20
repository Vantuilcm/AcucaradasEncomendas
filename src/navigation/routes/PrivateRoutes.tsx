import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from '../AppNavigator';
import { OrderDetailsScreen } from '../../screens/OrderDetailsScreen';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { AddressScreen } from '../../screens/AddressScreen';
import { AddressFormScreen } from '../../screens/AddressFormScreen';
import { PaymentMethodsScreen } from '../../screens/PaymentMethodsScreen';
import { PaymentMethodFormScreen } from '../../screens/PaymentMethodFormScreen';
import { NotificationSettingsScreen } from '../../screens/NotificationSettingsScreen';
import { HelpCenterScreen } from '../../screens/HelpCenterScreen';
import { HelpCategoryScreen } from '../../screens/HelpCategoryScreen';
import { HelpArticleScreen } from '../../screens/HelpArticleScreen';
import { ReviewsScreen } from '../../screens/ReviewsScreen';
import { CreateReviewScreen } from '../../screens/CreateReviewScreen';
import { PrivacySettingsScreen } from '../../screens/PrivacySettingsScreen';
import { DeliveryDriverProfileScreen } from '../../screens/DeliveryDriverProfileScreen';
import { NotificationsScreen } from '../../screens/NotificationsScreen';
import { TestNotificationsScreen } from '../../screens/TestNotificationsScreen';

const Stack = createNativeStackNavigator();

export function PrivateRoutes() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
        options={{ title: 'Detalhes do Pedido' }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
      <Stack.Screen
        name="Addresses"
        component={AddressScreen}
        options={{ title: 'Meus Endereços' }}
      />
      <Stack.Screen
        name="AddressForm"
        component={AddressFormScreen}
        options={{ title: 'Endereço' }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ title: 'Métodos de Pagamento' }}
      />
      <Stack.Screen
        name="PaymentMethodForm"
        component={PaymentMethodFormScreen}
        options={{ title: 'Método de Pagamento' }}
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
      <Stack.Screen
        name="HelpCategory"
        component={HelpCategoryScreen}
        options={{ title: 'Categoria' }}
      />
      <Stack.Screen
        name="HelpArticle"
        component={HelpArticleScreen}
        options={{ title: 'Artigo' }}
      />
      <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Avaliações' }} />
      <Stack.Screen
        name="CreateReview"
        component={CreateReviewScreen}
        options={{ title: 'Avaliar Pedido' }}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{ title: 'Configurações de Privacidade' }}
      />
      <Stack.Screen
        name="DeliveryDriverProfile"
        component={DeliveryDriverProfileScreen}
        options={{ title: 'Perfil do Entregador' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notificações' }}
      />
      <Stack.Screen
        name="TestNotifications"
        component={TestNotificationsScreen}
        options={{ title: 'Teste de Notificações' }}
      />
    </Stack.Navigator>
  );
}
