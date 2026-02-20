import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProductDetailsScreen from '../../screens/ProductDetailsScreen';
import CheckoutScreen from '../../screens/CheckoutScreen';
import { DeliveryDriverRegistrationScreen } from '../../screens/DeliveryDriverRegistration';

const Stack = createNativeStackNavigator();

export function SharedRoutes() {
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
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
        options={{ title: 'Detalhes do Produto' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Finalizar Pedido' }}
      />
      <Stack.Screen
        name="DeliveryDriverRegistration"
        component={DeliveryDriverRegistrationScreen}
        options={{ title: 'Cadastro de Entregador' }}
      />
    </Stack.Navigator>
  );
}
