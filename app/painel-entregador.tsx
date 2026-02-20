import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { setPendingHref } from '../src/navigation/pendingNavigation';

export default function PainelEntregador() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { user } = useAuth();

  const safeReplace = (href: string) => {
    if (!rootNavigationState?.key) {
      setPendingHref(href);
      return;
    }
    router.replace(href as any);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Painel do Entregador</Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Minhas Entregas</Text>
          <Text variant="bodyMedium" style={styles.description}>
            Em breve: lista de entregas atribuídas, status e rotas.
          </Text>
          <Button mode="contained" onPress={() => safeReplace('/pedidos')}>Voltar</Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { marginBottom: 16 },
  card: { marginBottom: 12 },
  description: { marginVertical: 8 },
});
