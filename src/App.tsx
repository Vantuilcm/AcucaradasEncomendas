import React, { useEffect, useRef, useState } from 'react';
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
import { AppVersion } from './utils/AppVersion';
import { OneSignal } from 'react-native-onesignal';
import * as Notifications from 'expo-notifications';
import { initOneSignal } from './config/onesignal';
import { UserUtils } from './utils/UserUtils';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Versão Estabilizada
 * O app usa Firebase JS-Only e Lazy Loading para máxima compatibilidade no iOS.
 */
function ThemedApp() {
  const { user, isReady } = useAuth();
  const userId = UserUtils.getUserId(user);
  const userRole = UserUtils.getUserRole(user);
  const oneSignalInitialized = useRef(false);
  const [oneSignalDiagnostic, setOneSignalDiagnostic] = useState('OS_DIAG waiting');
  const [nativePushProbe, setNativePushProbe] = useState('EXPO_NATIVE not-run');

  useEffect(() => {
    oneSignalInitialized.current = initOneSignal();
  }, []);

  useEffect(() => {
    if (!isReady || !oneSignalInitialized.current) {
      return;
    }

    let active = true;
    let delayedRead: ReturnType<typeof setTimeout> | null = null;
    let pushObserverAdded = false;
    let expoPushTokenSubscription: ReturnType<typeof Notifications.addPushTokenListener> | null = null;

    const readOneSignalDiagnostic = async (source: string) => {
      try {
        const [permission, subscriptionId, token, optedIn, externalId, oneSignalId] =
          await Promise.all([
            OneSignal.Notifications.getPermissionAsync(),
            OneSignal.User.pushSubscription.getIdAsync(),
            OneSignal.User.pushSubscription.getTokenAsync(),
            OneSignal.User.pushSubscription.getOptedInAsync(),
            OneSignal.User.getExternalId(),
            OneSignal.User.getOnesignalId(),
          ]);

        const diagnostic =
          'OS ' + source +
          ' perm=' + String(permission) +
          ' opted=' + String(optedIn) +
          ' sub=' + (subscriptionId || '-') +
          ' token=' + (token ? 'present' : '-') +
          ' ext=' + (externalId || '-') +
          ' osid=' + (oneSignalId || '-');

        console.log('[ONESIGNAL_RUNTIME_DIAGNOSTIC]', diagnostic);

        if (active && userRole === 'entregador') {
          setOneSignalDiagnostic(diagnostic);
        }
      } catch (error) {
        console.error('[ONESIGNAL_RUNTIME_DIAGNOSTIC_FAILED]', error);
        if (active && userRole === 'entregador') {
          setOneSignalDiagnostic(
            'OS diagnostic error=' +
              (error instanceof Error ? error.message : String(error))
          );
        }
      }
    };

    const probeNativeApnsToken = async () => {
      if (active) {
        setNativePushProbe('EXPO_NATIVE pending');
      }

      try {
        const nativeToken = await Notifications.getDevicePushTokenAsync();
        const probeDiagnostic =
          'EXPO_NATIVE type=' + String(nativeToken.type || '-') +
          ' token=' + (nativeToken.data ? 'present' : '-');

        console.log('[EXPO_NATIVE_APNS_PROBE]', probeDiagnostic);

        if (active) {
          setNativePushProbe(probeDiagnostic);
        }

        await readOneSignalDiagnostic('after-expo-native');
      } catch (error) {
        const probeDiagnostic =
          'EXPO_NATIVE error=' +
          (error instanceof Error ? error.message : String(error));

        console.error('[EXPO_NATIVE_APNS_PROBE_FAILED]', error);

        if (active) {
          setNativePushProbe(probeDiagnostic);
        }
      }
    };

    const handlePushSubscriptionChange = () => {
      console.log('[ONESIGNAL_PUSH_SUBSCRIPTION_CHANGE]');
      void readOneSignalDiagnostic('change');
    };

    const syncOneSignalIdentity = async () => {
      try {
        if (userId) {
          await OneSignal.login(userId);
          if (userRole === 'entregador') {
            expoPushTokenSubscription = Notifications.addPushTokenListener((token) => {
              const listenerDiagnostic =
                'EXPO_LISTENER type=' + String(token.type || '-') +
                ' token=' + (token.data ? 'present' : '-');

              console.log('[EXPO_NATIVE_PUSH_TOKEN_CHANGE]', listenerDiagnostic);

              if (active) {
                setNativePushProbe(listenerDiagnostic);
              }

              void readOneSignalDiagnostic('expo-native-listener');
            });

            OneSignal.User.pushSubscription.addEventListener(
              'change',
              handlePushSubscriptionChange
            );
            pushObserverAdded = true;

            await readOneSignalDiagnostic('pre-optin');
            await OneSignal.User.pushSubscription.optIn();
            await readOneSignalDiagnostic('post-optin');
            void probeNativeApnsToken();

            delayedRead = setTimeout(() => {
              void readOneSignalDiagnostic('post-optin-5s');
            }, 5000);
          }
          console.log('[ONESIGNAL_IDENTITY_LOGIN_OK]');
        } else {
          await OneSignal.logout();
          console.log('[ONESIGNAL_IDENTITY_LOGOUT_OK]');
        }
      } catch (error) {
        console.error('[ONESIGNAL_IDENTITY_SYNC_FAILED]', error);
        Sentry.captureException(error);
      }
    };

    void syncOneSignalIdentity();

    return () => {
      active = false;

      if (delayedRead) {
        clearTimeout(delayedRead);
      }

      if (expoPushTokenSubscription) {
        expoPushTokenSubscription.remove();
      }

      if (pushObserverAdded) {
        OneSignal.User.pushSubscription.removeEventListener(
          'change',
          handlePushSubscriptionChange
        );
      }
    };
  }, [isReady, userId, userRole]);
  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar style="light" />
        <AppNavigator />
        {userRole === 'entregador' && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 48,
              left: 8,
              right: 8,
              padding: 6,
              backgroundColor: 'rgba(0,0,0,0.78)',
              zIndex: 9999,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 9 }}>
              {oneSignalDiagnostic}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 9 }}>
              {nativePushProbe}
            </Text>
          </View>
        )}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 9999 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}>
            {AppVersion.getDisplayString()}
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
