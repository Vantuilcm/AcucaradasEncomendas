import React from 'react';
import { LogBox, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import { ThemeProvider } from './components/ThemeProvider';

// Ignorar warnings específicos durante desenvolvimento
if (LogBox) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
  ]);
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <CartProvider>
          <ThemeProvider>
            <View style={{ flex: 1 }} testID="app-container">
              <StatusBar style="auto" />
              <AppNavigator />
            </View>
          </ThemeProvider>
        </CartProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
