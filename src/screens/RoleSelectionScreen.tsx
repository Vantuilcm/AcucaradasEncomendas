import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../components/ThemeProvider';
import { secureLoggingService } from '../services/SecureLoggingService';

export const RoleSelectionScreen = () => {
  const { theme } = useAppTheme();
  const { updateUser, logout } = useAuth();

  const handleSelectRole = async (role: string) => {
    try {
      secureLoggingService.security('ROLE_SELECTION_ATTEMPT', { role });
      await updateUser({ role });
      secureLoggingService.security('ROLE_SELECTION_SUCCESS', { role });
    } catch (error) {
      secureLoggingService.error('ROLE_SELECTION_ERROR', { error });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Quase lá!
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Como você deseja utilizar o Açucaradas?
        </Text>

        <Card style={styles.card} onPress={() => handleSelectRole('comprador')}>
          <Card.Title title="Comprador" subtitle="Quero comprar doces deliciosos" />
        </Card>

        <Card style={styles.card} onPress={() => handleSelectRole('produtor')}>
          <Card.Title title="Produtor" subtitle="Quero vender meus produtos" />
        </Card>

        <Card style={styles.card} onPress={() => handleSelectRole('entregador')}>
          <Card.Title title="Entregador" subtitle="Quero realizar entregas" />
        </Card>

        <Button mode="outlined" onPress={logout} style={styles.logoutButton}>
          Sair
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  card: {
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 32,
  },
});
