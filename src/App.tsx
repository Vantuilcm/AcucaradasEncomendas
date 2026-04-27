import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Constants from 'expo-constants';

const Stack = createStackNavigator();

// Tema básico (Cores inspiradas na marca)
const theme = {
  primary: '#E91E63', // Rosa base
  background: '#FDF8F5',
  card: '#FFFFFF',
  text: '#333333',
  textLight: '#888888'
};

function SplashScreen({ navigation }: any) {
  const commitSha = Constants.expoConfig?.extra?.commitSha || 'unknown';
  const buildNumber = Constants.expoConfig?.extra?.buildNumber || '1193';

  useEffect(() => {
    // Splash screen simples simulando carregamento
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary, justifyContent: 'center' }]}>
      <StatusBar style="light" />
      <Text style={[styles.title, { color: '#fff' }]}>Açucaradas Encomendas</Text>
      <Text style={[styles.subtitle, { color: '#fff', opacity: 0.8 }]}>Carregando...</Text>
      <Text style={[styles.footer, { color: 'rgba(255,255,255,0.6)' }]}>Build {buildNumber} | Commit {commitSha}</Text>
    </SafeAreaView>
  );
}

function HomeScreen({ navigation }: any) {
  const commitSha = Constants.expoConfig?.extra?.commitSha || 'unknown';
  const buildNumber = Constants.expoConfig?.extra?.buildNumber || '1193';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.primary }]}>Açucaradas Encomendas</Text>
        <Text style={styles.subtitle}>Fase 2 Real - Navegável</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={styles.statusText}>✅ NavigationContainer</Text>
        <Text style={styles.statusText}>✅ Stack Navigator</Text>
        <Text style={styles.statusText}>✅ Tema Visual Básico</Text>
        <Text style={[styles.statusText, { color: '#FF9800', marginTop: 10, fontWeight: 'bold' }]}>
          ⚠️ Firebase, Auth, Stripe, OneSignal: DESLIGADOS
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('Login')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Build {buildNumber} | Commit {commitSha}</Text>
    </SafeAreaView>
  );
}

function LoginScreen({ navigation }: any) {
  const commitSha = Constants.expoConfig?.extra?.commitSha || 'unknown';
  const buildNumber = Constants.expoConfig?.extra?.buildNumber || '1193';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.primary }]}>Login Simulado</Text>
        <Text style={styles.subtitle}>Autenticação Desativada na Fase 2</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, marginBottom: 30 }]}>
        <Text style={[styles.statusText, { textAlign: 'center', color: '#666' }]}>
          A integração com Firebase Auth e os fluxos reais de login serão ativados na FASE 3.
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#CCCCCC' }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: '#333' }]}>Voltar para Home</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Build {buildNumber} | Commit {commitSha}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 40,
    width: '100%',
  },
  statusText: {
    fontSize: 15,
    marginBottom: 8,
    color: '#333333',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    fontSize: 12,
    color: '#999999',
  },
});

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}