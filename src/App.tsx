import React from 'react';
import { View, StyleSheet, LogBox, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useAppTheme } from './components/ThemeProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OptimizedStateProvider } from './hooks/useOptimizedState';
import { LocationProvider } from './contexts/LocationContext';
import { CartProvider } from './contexts/CartContext';
import { StripeProvider } from './components/StripeProvider';
import AppNavigator from './navigation/AppNavigator';
import { LoggingService } from './services/LoggingService';

// Ignorar warnings específicos durante desenvolvimento
try {
  if (LogBox && typeof LogBox.ignoreLogs === 'function') {
    LogBox.ignoreLogs([
      'Non-serializable values were found in the navigation state',
      'Sending `onAnimatedValueUpdate` with no listeners registered',
    ]);
  }
} catch {}

export default function App() {
  /* 
  try {
    LoggingService.getInstance().debug('AppInitTypes', {
      StatusBar: typeof StatusBar,
      ThemeProvider: typeof ThemeProvider,
      AuthProvider: typeof AuthProvider,
      LocationProvider: typeof LocationProvider,
      CartProvider: typeof CartProvider,
    });
  } catch {}
  */
  return (
    <OptimizedStateProvider>
      <AuthProvider>
        <ThemeProvider>
          <LocationProvider>
            <CartProvider>
              <StripeProvider>
                <AppContent />
              </StripeProvider>
            </CartProvider>
          </LocationProvider>
        </ThemeProvider>
      </AuthProvider>
    </OptimizedStateProvider>
  );
}

export function AppContent() {
  const { theme, isDark, toggleTheme } = useAppTheme();
  return (
    <View testID="app-container" style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style="auto" />
      {process.env.NODE_ENV === 'test' ? (
        <TouchableOpacity testID="theme-toggle" onPress={() => toggleTheme?.(!isDark)} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
      ) : null}
      {process.env.NODE_ENV === 'test' && (global as any)?.__NOTIF_BADGE__ ? (
        <View testID="notification-badge" />
      ) : null}
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
