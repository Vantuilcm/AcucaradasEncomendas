import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';

import AppNavigator from './navigation/AppNavigator';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Versão Estabilizada
 * O app usa Firebase JS-Only e Lazy Loading para máxima compatibilidade no iOS.
 */
function ThemedApp() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <AppNavigator />
    </View>
  );
}

export default function App() {
  return (
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
  );
}
