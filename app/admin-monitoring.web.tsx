import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { MonitoringStatusBadge } from '../src/components/monitoring/MonitoringStatusBadge';

export default function AdminMonitoringWeb() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Admin Monitoring (Web)' }} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard de Monitoramento (Web)</Text>
        <MonitoringStatusBadge />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text>
          Esta é uma versão simplificada da tela administrativa para web.
          Recursos de testes de performance e integrações nativas foram desabilitados.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 12,
  },
});