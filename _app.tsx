import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Componente App básico para o expo-router
export function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Açucaradas Encomendas</Text>
      <Text style={styles.subtitle}>Aplicativo carregado com sucesso!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default App;