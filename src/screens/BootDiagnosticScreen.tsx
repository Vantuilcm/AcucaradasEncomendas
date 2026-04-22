import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';

const BootDiagnosticScreen = () => {
  const { user, profile, loading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🚀 BOOT DIAGNOSTIC</Text>
          <Text style={styles.subtitle}>Missão Zero Tela Branca</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>✅ App Carregado</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Auth Loading:</Text>
          <Text style={styles.value}>{loading ? '⏳ Sim' : '✅ Não'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>UID:</Text>
          <Text style={styles.value}>{user?.uid || '❌ Nulo'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Role:</Text>
          <Text style={styles.value}>{profile?.role || '❌ Nulo'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>isReady:</Text>
          <Text style={styles.value}>✅ True (Screen mounted)</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Current Route:</Text>
          <Text style={styles.value}>{route.name}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Navigation State:</Text>
          <Text style={styles.value}>{JSON.stringify(navigation.getState()?.routes.map(r => r.name), null, 2)}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Se você está vendo esta tela, o bootstrap e a navegação inicial estão funcionando.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D1D1F',
  },
  subtitle: {
    fontSize: 16,
    color: '#86868B',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#86868B',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  footer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E8F2FF',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#0066CC',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BootDiagnosticScreen;
