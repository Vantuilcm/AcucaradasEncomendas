import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { AnimacaoExemplo } from '../src/components/AnimacaoExemplo';
import { StatusBar } from 'expo-status-bar';

export default function TesteAnimacao() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Teste de Animações',
          headerStyle: {
            backgroundColor: '#6c5ce7',
          },
          headerTintColor: '#fff',
        }} 
      />
      <StatusBar style="light" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.titulo}>Demonstração de Animações</Text>
        <Text style={styles.subtitulo}>Usando React Native Reanimated</Text>
        
        <AnimacaoExemplo titulo="Animação Básica" />
        
        <AnimacaoExemplo 
          titulo="Toque para Animar" 
          onPress={() => console.log('Animação ativada por toque')}
        />
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitulo}>Informações Técnicas</Text>
          <Text style={styles.infoTexto}>
            Este componente demonstra o uso correto do React Native Reanimated 3.6.0 com Expo SDK 50.
          </Text>
          <Text style={styles.infoTexto}>
            Recursos utilizados:
          </Text>
          <Text style={styles.infoItem}>• useSharedValue para valores animados</Text>
          <Text style={styles.infoItem}>• useAnimatedStyle para estilos dinâmicos</Text>
          <Text style={styles.infoItem}>• withTiming, withSpring para transições</Text>
          <Text style={styles.infoItem}>• withRepeat, withSequence para animações complexas</Text>
          <Text style={styles.infoItem}>• Animações de entrada (FadeIn, ZoomIn, etc.)</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3436',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 18,
    color: '#636e72',
    textAlign: 'center',
    marginBottom: 30,
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 15,
  },
  infoTexto: {
    fontSize: 16,
    color: '#636e72',
    lineHeight: 24,
    marginBottom: 10,
  },
  infoItem: {
    fontSize: 15,
    color: '#636e72',
    lineHeight: 24,
    marginLeft: 10,
  },
});