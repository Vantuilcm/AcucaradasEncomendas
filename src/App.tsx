import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createStackNavigator();

function TestScreen() {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>🧭 FASE 1: OK</Text>
      <Text style={styles.subtitle}>Navigation Loaded Successfully</Text>
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>✅ NavigationContainer: OK</Text>
        <Text style={styles.statusText}>✅ Stack Navigator: OK</Text>
        <Text style={styles.statusText}>✅ SafeAreaProvider: OK</Text>
      </View>
      <Text style={styles.footer}>Build 1177 - Navigation Test</Text>
    </View>
  );
}

// MODO DIAGNÓSTICO FASE 1 - NAVIGATION ONLY
export default function App() {
  console.log('--- BOOT FASE 1: NAVIGATION ---');
  
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator>
          <Stack.Screen 
            name="Test" 
            component={TestScreen} 
            options={{ title: 'Diagnóstico - Fase 1' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
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

