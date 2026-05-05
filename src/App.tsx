import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';

import AppNavigator from './navigation/AppNavigator';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import { ErrorBoundary } from './core/monitoring/ErrorBoundary';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from './config/stripe';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Versão Estabilizada
 * O app usa Firebase JS-Only e Lazy Loading para máxima compatibilidade no iOS.
 */
function ThemedApp() {
  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar style="light" />
        <AppNavigator />
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 9999 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}>
            Build 1196 | Base 8173a1e
          </Text>
        </View>
      </View>
    </ErrorBoundary>
  );
}

export default function App() {
  // Garantir que publishableKey não seja undefined/vazio para não quebrar o provider
  const stripeKey = STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy';

  return (
    <StripeProvider publishableKey={stripeKey}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              <CartProvider>
                <ThemedApp />
              </CartProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
