import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';

/**
 * 🛡️ ZeroNativeCrashRecoveryAI - Fase 1.3: AuthProvider
 * Reintroduzindo o AuthProvider para testar estabilidade.
 */
function AuthContent() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>Açucaradas - Teste 911</Text>
        <Text style={styles.status}>FASE 1.3.7: FIREBASE LAZY LOAD</Text>
        <Text style={styles.description}>
          Se você vê isso, o Lazy Load contornou o crash de importação nativa.
        </Text>
        <View style={styles.box}>
          <Text style={styles.boxText}>Build: 911</Text>
          <Text style={styles.boxText}>Estratégia: Carregamento Diferido</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PaperProvider>
          <AuthProvider>
            <AuthContent />
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  box: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  boxText: {
    fontSize: 14,
    color: '#444',
    marginVertical: 2,
    fontFamily: 'System',
  },
});
