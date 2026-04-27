import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';

export default function App() {
  const commitSha = Constants.expoConfig?.extra?.commitSha || 'unknown';
  const buildNumber = Constants.expoConfig?.extra?.buildNumber || '1194';

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <View style={styles.container}>
              <StatusBar style="auto" />
              <AppNavigator />
              
              {/* Rodapé Diagnóstico Obrigatório */}
              <View style={styles.footerContainer} pointerEvents="none">
                <Text style={styles.footer}>Build {buildNumber} | Commit {commitSha}</Text>
              </View>
            </View>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 4,
    zIndex: 9999,
  },
  footer: {
    fontSize: 12,
    color: '#333333',
    fontWeight: 'bold',
  },
});
