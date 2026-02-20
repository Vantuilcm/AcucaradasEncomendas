import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Button,
  Text,
  Card,
  ProgressBar,
  List,
  Divider,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useNotificationSettingsMigration } from '../utils/notificationSettingsMigration';
import { useAuth } from '../contexts/AuthContext';
import { loggingService } from '../services/LoggingService';
import { useNavigation } from '@react-navigation/native';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Permission } from '../services/PermissionsService';
import { ErrorMessage } from '../components/ErrorMessage';

/**
 * Tela para gerenciar a migraÃ§Ã£o das configuraÃ§Ãµes de notificaÃ§Ã£o da versÃ£o 1 para a versÃ£o 2
 * Esta tela Ã© destinada apenas a administradores do sistema
 */
export const NotificationSettingsMigrationScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { migrateUserSettings, migrateAllUsers, checkIfMigrated, clearCache } =
    useNotificationSettingsMigration();

  const [isMigrated, setIsMigrated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStats, setMigrationStats] = useState<{ success: number; failed: number } | null>(
    null
  );
  const [progress, setProgress] = useState(0);

  // Verificar se as configuraÃ§Ãµes do usuÃ¡rio atual jÃ¡ foram migradas
  useEffect(() => {
    if (user?.uid) {
      checkMigrationStatus();
    }
  }, [user]);

  // Verificar o status da migraÃ§Ã£o para o usuÃ¡rio atual
  const checkMigrationStatus = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const migrated = await checkIfMigrated(user.uid);
      setIsMigrated(migrated);
    } catch (error) {
      loggingService.error('Erro ao verificar status da migração', error instanceof Error ? error : undefined);
      Alert.alert('Erro', 'NÃ£o foi possÃ­vel verificar o status da migraÃ§Ã£o.');
    } finally {
      setIsLoading(false);
    }
  };

  // Migrar as configuraÃ§Ãµes do usuÃ¡rio atual
  const handleMigrateCurrentUser = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const success = await migrateUserSettings(user.uid);

      if (success) {
        setIsMigrated(true);
        Alert.alert('Sucesso', 'Suas configuraÃ§Ãµes de notificaÃ§Ã£o foram migradas com sucesso.');
      } else {
        Alert.alert('Erro', 'NÃ£o foi possÃ­vel migrar suas configuraÃ§Ãµes de notificaÃ§Ã£o.');
      }
    } catch (error) {
      loggingService.error('Erro ao migrar configurações do usuário atual', error instanceof Error ? error : undefined);
      Alert.alert('Erro', 'Ocorreu um erro durante a migraÃ§Ã£o.');
    } finally {
      setIsLoading(false);
    }
  };

  // Migrar as configuraÃ§Ãµes de todos os usuÃ¡rios
  const handleMigrateAllUsers = async () => {
    Alert.alert(
      'Migrar Todos os UsuÃ¡rios',
      'Tem certeza que deseja migrar as configuraÃ§Ãµes de notificaÃ§Ã£o de todos os usuÃ¡rios? Este processo pode levar algum tempo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Migrar',
          onPress: async () => {
            setIsMigrating(true);
            setProgress(0);
            setMigrationStats(null);

            try {
              const result = await migrateAllUsers();
              setMigrationStats(result);

              const total = result.success + result.failed;
              Alert.alert(
                'MigraÃ§Ã£o ConcluÃ­da',
                `MigraÃ§Ã£o concluÃ­da com ${result.success} sucessos e ${result.failed} falhas.`
              );
            } catch (error) {
              loggingService.error('Erro ao migrar configurações de todos os usuários', error instanceof Error ? error : undefined);
              Alert.alert('Erro', 'Ocorreu um erro durante a migraÃ§Ã£o de todos os usuÃ¡rios.');
            } finally {
              setIsMigrating(false);
              setProgress(1); // 100%
            }
          },
        },
      ]
    );
  };

  // Limpar o cache de configuraÃ§Ãµes do usuÃ¡rio atual
  const handleClearCache = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      await clearCache(user.uid);
      Alert.alert('Sucesso', 'Cache de configuraÃ§Ãµes limpo com sucesso.');
    } catch (error) {
      loggingService.error('Erro ao limpar cache de configurações', error instanceof Error ? error : undefined);
      Alert.alert('Erro', 'NÃ£o foi possÃ­vel limpar o cache de configuraÃ§Ãµes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar se o usuÃ¡rio Ã© administrador
  const isAdmin = user?.isAdmin === true;

  return (
    <ProtectedRoute
      requiredPermissions={[Permission.CONFIGURAR_SISTEMA]}
      requireAllPermissions={true}
      fallbackRoute={undefined}
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryLabel="Voltar" />}
    >
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="MigraÃ§Ã£o de ConfiguraÃ§Ãµes de NotificaÃ§Ã£o" />
        <Card.Content>
          <Text style={styles.description}>
            Esta tela permite migrar as configuraÃ§Ãµes de notificaÃ§Ã£o da versÃ£o 1 para a versÃ£o 2,
            que oferece melhor desempenho e novas funcionalidades.
          </Text>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <List.Item
              title="Status da MigraÃ§Ã£o"
              description={
                isMigrated === null ? 'Desconhecido' : isMigrated ? 'Migrado' : 'NÃ£o Migrado'
              }
              left={props => (
                <List.Icon {...props} icon={isMigrated ? 'check-circle' : 'alert-circle'} />
              )}
            />
          )}

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>AÃ§Ãµes DisponÃ­veis</Text>

          <Button
            mode="contained"
            onPress={handleMigrateCurrentUser}
            disabled={isLoading || isMigrating || isMigrated === true}
            style={styles.button}
          >
            Migrar Minhas ConfiguraÃ§Ãµes
          </Button>

          <Button
            mode="outlined"
            onPress={handleClearCache}
            disabled={isLoading || isMigrating}
            style={styles.button}
          >
            Limpar Cache de ConfiguraÃ§Ãµes
          </Button>

          {isAdmin && (
            <>
              <Divider style={styles.divider} />

              <Text style={styles.sectionTitle}>AÃ§Ãµes de Administrador</Text>

              <Button
                mode="contained"
                onPress={handleMigrateAllUsers}
                disabled={isLoading || isMigrating}
                style={[styles.button, styles.adminButton]}
              >
                Migrar Todos os UsuÃ¡rios
              </Button>

              {isMigrating && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>Migrando configuraÃ§Ãµes...</Text>
                  <ProgressBar progress={progress} style={styles.progressBar} />
                </View>
              )}

              {migrationStats && (
                <Card style={styles.statsCard}>
                  <Card.Content>
                    <Text style={styles.statsTitle}>Resultado da MigraÃ§Ã£o</Text>
                    <View style={styles.statsRow}>
                      <Text style={styles.statsLabel}>Sucesso:</Text>
                      <Text style={styles.statsValue}>{migrationStats.success}</Text>
                    </View>
                    <View style={styles.statsRow}>
                      <Text style={styles.statsLabel}>Falhas:</Text>
                      <Text style={styles.statsValue}>{migrationStats.failed}</Text>
                    </View>
                    <View style={styles.statsRow}>
                      <Text style={styles.statsLabel}>Total:</Text>
                      <Text style={styles.statsValue}>
                        {migrationStats.success + migrationStats.failed}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              )}
            </>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
    </ProtectedRoute>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  description: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  loader: {
    marginVertical: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  button: {
    marginBottom: 12,
  },
  adminButton: {},
  progressContainer: {
    marginTop: 16,
  },
  progressText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  statsCard: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsLabel: {
    fontWeight: 'bold',
  },
  statsValue: {
    fontSize: 16,
  },
});

export default NotificationSettingsMigrationScreen;

