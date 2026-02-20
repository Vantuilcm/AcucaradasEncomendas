import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from '../components/base';
import LoginScreen from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import MainTabs from './AppNavigator';
import TwoFactorAuthScreen from '../screens/TwoFactorAuthScreen';

const Stack = createNativeStackNavigator();

export function AppRoutes() {
  const { user, loading, is2FAEnabled, is2FAVerified } = useAuth();

  if (loading) {
    return <LoadingState message="Carregando..." />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!user ? (
        // Rotas públicas
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : user && is2FAEnabled && !is2FAVerified ? (
        // Rota para verificação 2FA
        <Stack.Screen
          name="TwoFactorAuth"
          component={TwoFactorAuthScreen}
          options={{ gestureEnabled: false }}
        />
      ) : (
        // Rotas privadas (usuário autenticado)
        <Stack.Screen name="MainApp" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
