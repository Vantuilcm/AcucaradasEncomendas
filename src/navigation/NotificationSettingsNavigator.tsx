import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { useTheme } from 'react-native-paper';

const Stack = createStackNavigator();

/**
 * Navegador para as configurações de notificação
 * Permite navegar entre diferentes telas relacionadas a notificações
 */
export function NotificationSettingsNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: 'Configurações de Notificação',
        }}
      />
    </Stack.Navigator>
  );
}
