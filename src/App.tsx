import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { initSentry } from './config/sentry';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import AppNavigator from './navigation/AppNavigator';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import { ErrorBoundary } from './core/monitoring/ErrorBoundary';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { STRIPE_PUBLISHABLE_KEY } from './config/stripe';
import { initOneSignal } from './config/onesignal';

function resolveAuthUid(user: any): string | null {
  if (!user) return null;
  const uid = user.uid || user.id;
  return typeof uid === 'string' && uid.length > 0 ? uid : null;
}

/**
 * A01_017 — Minimal auth-gated OneSignal bootstrap.
 * Renders nothing. Calls initOneSignal once per app lifecycle after Auth is ready.
 * Does not mount the full notifications hook; initOneSignal owns the native permission request.
 */
export function OneSignalAuthInit() {
  const { user, loading, profileLoading, isReady } = useAuth();
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    if (!isReady || loading || profileLoading) return;
    if (!resolveAuthUid(user)) return;

    didInitRef.current = true;
    try {
      initOneSignal();
    } catch (error) {
      console.warn('[ONESIGNAL_AUTH_INIT] non-fatal init failure');
      if (__DEV__) {
        console.warn(error);
      }
    }
  }, [user, loading, profileLoading, isReady]);

  return null;
}

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
  useEffect(() => {
    try {
      console.log('[APP_STARTUP_RUNNING]');
    } catch (e) {
      console.error('[ALERT_ERROR]', e);
    }

    initSentry();

    try {
      Sentry.captureMessage('SENTRY_RUNTIME_TEST_BUILD_1279');
      console.log('[SENTRY_TEST_SENT]');
    } catch (error) {
      console.error('[SENTRY_TEST_FAILED]', error);
    }
  }, []);

  // Garantir que publishableKey não seja undefined/vazio para não quebrar o provider
  const stripeKey = STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy';

  return (
    <StripeProvider publishableKey={stripeKey}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <OneSignalAuthInit />
            <LocationProvider>
              <CartProvider>
                <PaperProvider>
                  <ThemedApp />
                </PaperProvider>
              </CartProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
