import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'

export default function DiagnosticRoot() {
  const [status, setStatus] = React.useState('Iniciando verificação de OTA...')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const attempt = async () => {
      try {
        setStatus('Verificando atualização...')
        const Updates = require('expo-updates')
        if (!Updates || typeof Updates.checkForUpdateAsync !== 'function') {
          setStatus('OTA não suportado neste ambiente')
          return
        }
        const res = await Updates.checkForUpdateAsync()
        if (cancelled) return

        if (res.isAvailable) {
          setStatus('Baixando atualização...')
          if (typeof Updates.fetchUpdateAsync === 'function') {
            await Updates.fetchUpdateAsync()
          }
          if (cancelled) return
          setStatus('Aplicando atualização...')
          if (typeof Updates.reloadAsync === 'function') {
            await Updates.reloadAsync()
          }
        } else {
          setStatus('Sem atualização disponível neste momento')
          setTimeout(() => {
            if (!cancelled) attempt()
          }, 8000)
        }
      } catch (e: any) {
        if (cancelled) return
        setError(String(e?.message ?? 'Falha ao aplicar OTA'))
        setTimeout(() => {
          if (!cancelled) attempt()
        }, 8000)
      }
    }
    attempt()
    return () => {
      cancelled = true
    }
  }, [])
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Açucaradas iniciou o JS 🎉 OTA v2</Text>
      <Text style={styles.subtitle}>Se você está vendo isso, a atualização OTA funcionou.</Text>
      <View style={{ height: 16 }} />
      <ActivityIndicator color="#C2185B" />
      <View style={{ height: 8 }} />
      <Text style={styles.status}>{status}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF0F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#C2185B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  status: {
    fontSize: 12,
    color: '#7a3860',
    textAlign: 'center',
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: '#b00020',
    textAlign: 'center',
  },
})
