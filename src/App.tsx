import React from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Ignorar warnings específicos durante desenvolvimento
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>🍰 Açucaradas Encomendas</Text>
      <Text style={styles.subtitle}>Aplicativo de Delivery de Doces</Text>
      <Text style={styles.description}>
        ✅ Aplicativo iniciado com sucesso!{'\n'}
        🚀 Pronto para desenvolvimento
      </Text>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>📱 Status: Online</Text>
        <Text style={styles.statusText}>🔧 Modo: Desenvolvimento</Text>
        <Text style={styles.statusText}>⚡ Node.js: v20.18.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#D2691E',
    marginBottom: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 16,
    color: '#8B4513',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  statusContainer: {
    backgroundColor: '#F0F8FF',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D2691E',
    width: '100%',
    maxWidth: 300,
  },
  statusText: {
    fontSize: 14,
    color: '#2E8B57',
    marginBottom: 5,
    textAlign: 'center',
    fontWeight: '500',
  },
});
