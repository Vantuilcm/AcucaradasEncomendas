import { Redirect, useRootNavigationState } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../src/contexts/AuthContext'
import { consumePendingHref, setPendingHref } from '../src/navigation/pendingNavigation'

export default function Index() {
  const rootNavigationState = useRootNavigationState()
  const { user, loading } = useAuth()
  const disableBootNavFlag = (process.env.EXPO_PUBLIC_DISABLE_BOOT_NAV ?? '').toString().toLowerCase()
  const disableBootNav = disableBootNavFlag === 'true' || disableBootNavFlag === '1' || disableBootNavFlag === 'yes'

  if (!rootNavigationState?.key || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  const pending = consumePendingHref()
  if (disableBootNav) {
    return <Redirect href={(user ? '/src-app' : '/login') as any} />
  }
  if (pending) {
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
      return <Redirect href={'/login' as any} />
    }

    return <Redirect href={pending as any} />
  }

  return <Redirect href={(user ? '/src-app' : '/login') as any} />
}
