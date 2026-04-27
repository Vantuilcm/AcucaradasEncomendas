import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';

// MODO DIAGNÓSTICO ATIVADO - ISOLAMENTO DE CRASH
export default function App() {
  console.log('--- BOOT DIAGNOSTICO: START ---');
  const commitSha = Constants.expoConfig?.extra?.commitSha || 'unknown';
  const buildNumber = Constants.expoConfig?.extra?.buildNumber || '1191';
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>🚀 BOOT OK</Text>
        <Text style={styles.subtitle}>Modo Diagnóstico Ativado</Text>
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>✅ React Native: OK</Text>
          <Text style={styles.statusText}>✅ UI Thread: OK</Text>
          <Text style={styles.statusText}>✅ Bundle Load: OK</Text>
        </View>
        <Text style={styles.footer}>Build {buildNumber} | Commit: {commitSha} - Missão Zero Crash</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 40,
  },
  statusBox: {
    backgroundColor: '#F0F0F0',
    padding: 20,
    borderRadius: 15,
    width: '100%',
  },
  statusText: {
    fontSize: 16,
    color: '#333333',
    marginVertical: 5,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: '#999999',
  },
});

