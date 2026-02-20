import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { useRootNavigationState, useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { Button } from '../../src/components/base/Button'
import { spacing, fontSize, wp } from '../../src/utils/responsive'
import { LoadingSpinner, useLoading } from '../../src/components/Loading/LoadingSpinner'
import { setPendingHref } from '../../src/navigation/pendingNavigation'

export default function DetalhesPedido() {
  const router = useRouter()
  const rootNavigationState = useRootNavigationState()
  const params = useLocalSearchParams()
  const { logout } = useAuth()
  const { isLoading, withLoading } = useLoading()

  const safeReplace = (href: string) => {
    if (!rootNavigationState?.key) {
      setPendingHref(href)
      return
    }
    router.replace(href as any)
  }

  const sair = async () => {
    await withLoading(
      (async () => {
        await logout()
        safeReplace('/login')
      })(),
      'Saindo...'
    )
  }

  const voltar = () => {
    safeReplace('/pedidos')
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Detalhes do Pedido</Text>
        <Button title="Sair" onPress={sair} variant="outline" size="small" disabled={isLoading} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>ID:</Text>
        <Text style={styles.value}>{String(params.id || '')}</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Voltar" onPress={voltar} variant="primary" disabled={isLoading} />
      </View>
      <LoadingSpinner visible={isLoading} type="dots" size="medium" color="#007bff" overlay />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing(20), backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(16) },
  title: { fontSize: fontSize(24), fontWeight: 'bold', color: '#333' },
  content: { padding: spacing(16), borderRadius: wp(10), backgroundColor: 'white' },
  label: { fontSize: fontSize(14), color: '#666' },
  value: { fontSize: fontSize(16), color: '#333', fontWeight: '600', marginTop: spacing(6) },
  actions: { marginTop: spacing(20), alignItems: 'flex-start' },
})
