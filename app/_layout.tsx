import 'react-native-gesture-handler'
import { Stack, useRootNavigationState, useRouter } from 'expo-router'
import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { ThemeProvider } from '../src/components/ThemeProvider'
import { AuthProvider, useAuth } from '../src/contexts/AuthContext'
import { CartProvider } from '../src/contexts/CartContext'
import { LocationProvider } from '../src/contexts/LocationContext'
import { StripeProvider } from '../src/components/StripeProvider'
import { OptimizedStateProvider } from '../src/hooks/useOptimizedState'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import ErrorBoundary from '../src/components/ErrorBoundary'
import AppStartupService from '../src/services/AppStartupService'
import { LoggingService } from '../src/services/LoggingService'
import { consumePendingHref, setPendingHref } from '../src/navigation/pendingNavigation'

SplashScreen.preventAutoHideAsync().catch(() => {})

function PendingNavigationConsumer() {
  const router = useRouter()
  const rootNavigationState = useRootNavigationState()
  const { user, loading } = useAuth()
  const disableBootNavFlag = (process.env.EXPO_PUBLIC_DISABLE_BOOT_NAV ?? '').toString().toLowerCase()
  const disableBootNav = disableBootNavFlag === 'true' || disableBootNavFlag === '1' || disableBootNavFlag === 'yes'

  useEffect(() => {
    if (disableBootNav) return
    if (!rootNavigationState?.key || loading) return

    const pending = consumePendingHref()
    if (!pending) return

    const pendingFirst = pending.replace(/^\/+/, '').split('/')[0] ?? ''
    const publicSegments = new Set([
      'login',
      'register',
      'two-factor-auth',
      'ajuda',
      'termos-uso',
      'politica-privacidade',
    ])

    if (!user && pending !== '/login' && !publicSegments.has(pendingFirst)) {
      setPendingHref(pending)
      try {
        router.replace('/login' as any)
      } catch {
        setPendingHref('/login')
      }
      return
    }

    try {
      router.replace(pending as any)
    } catch {
      setPendingHref(pending)
    }
  }, [disableBootNav, loading, rootNavigationState?.key, router, user])

  return null
}

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {})
    }, 50)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    try {
      const isTestEnv =
        typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID)
      if (isTestEnv) return

      const Updates = require('expo-updates')
      const createdAt = Updates?.createdAt
      const extras = {
        channel: Updates?.channel,
        runtimeVersion: Updates?.runtimeVersion,
        updateId: Updates?.updateId,
        isEmbeddedLaunch: Updates?.isEmbeddedLaunch,
        isEmergencyLaunch: Updates?.isEmergencyLaunch,
        createdAt: createdAt?.toISOString ? createdAt.toISOString() : createdAt,
      }

      LoggingService.getInstance().info('Expo Updates state', extras)
    } catch {}
  }, [])

  useEffect(() => {
    AppStartupService.initializeApp({ skipSplashScreen: true }).catch(() => {})
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <OptimizedStateProvider>
          <AuthProvider>
            <ThemeProvider>
              <LocationProvider>
                <CartProvider>
                  <StripeProvider>
                    <PendingNavigationConsumer />
                    <Stack screenOptions={{ headerShown: false }} />
                  </StripeProvider>
                </CartProvider>
              </LocationProvider>
            </ThemeProvider>
          </AuthProvider>
        </OptimizedStateProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}
