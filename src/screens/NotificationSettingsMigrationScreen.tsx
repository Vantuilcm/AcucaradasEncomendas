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

/**
 * Tela para gerenciar a migração das configurações de notificação da versão 1 para a versão 2
 * Esta tela é destinada apenas a administradores do sistema
 */
export const NotificationSettingsMigrationScreen = () => {
  const { user } = useAuth();
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

  // Verificar se as configurações do usuário atual já foram migradas
  useEffect(() => {
    if (user?.uid) {
      checkMigrationStatus();
    }
  }, [user]);

  // Verificar o status da migração para o usuário atual
  const checkMigrationStatus = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const migrated = await checkIfMigrated(user.uid);
      setIsMigrated(migrated);
    } catch (error) {
      loggingService.error('Erro ao verificar status da migração', error);
      Alert.alert('Erro', 'Não foi possível verificar o status da migração.');
    } finally {
      setIsLoading(false);
    }
  };

  // Migrar as configurações do usuário atual
  const handleMigrateCurrentUser = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const success = await migrateUserSettings(user.uid);

      if (success) {
        setIsMigrated(true);
        Alert.alert('Sucesso', 'Suas configurações de notificação foram migradas com sucesso.');
      } else {
        Alert.alert('Erro', 'Não foi possível migrar suas configurações de notificação.');
      }
    } catch (error) {
      loggingService.error('Erro ao migrar configurações do usuário atual', error);
      Alert.alert('Erro', 'Ocorreu um erro durante a migração.');
    } finally {
      setIsLoading(false);
    }
  };

  // Migrar as configurações de todos os usuários
  const handleMigrateAllUsers = async () => {
    Alert.alert(
      'Migrar Todos os Usuários',
      'Tem certeza que deseja migrar as configurações de notificação de todos os usuários? Este processo pode levar algum tempo.',
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
                'Migração Concluída',
                `Migração concluída com ${result.success} sucessos e ${result.failed} falhas.`
              );
            } catch (error) {
              loggingService.error('Erro ao migrar todos os usuários', error);
              Alert.alert('Erro', 'Ocorreu um erro durante a migração de todos os usuários.');
            } finally {
              setIsMigrating(false);
              setProgress(1); // 100%
            }
          },
        },
      ]
    );
  };

  // Limpar o cache de configurações do usuário atual
  const handleClearCache = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      await clearCache(user.uid);
      Alert.alert('Sucesso', 'Cache de configurações limpo com sucesso.');
    } catch (error) {
      loggingService.error('Erro ao limpar cache', error);
      Alert.alert('Erro', 'Não foi possível limpar o cache de configurações.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar se o usuário é administrador
  const isAdmin = user?.isAdmin === true;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Migração de Configurações de Notificação" />
        <Card.Content>
          <Text style={styles.description}>
            Esta tela permite migrar as configurações de notificação da versão 1 para a versão 2,
            que oferece melhor desempenho e novas funcionalidades.
          </Text>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <List.Item
              title="Status da Migração"
              description={
                isMigrated === null ? 'Desconhecido' : isMigrated ? 'Migrado' : 'Não Migrado'
              }
              left={props => (
                <List.Icon {...props} icon={isMigrated ? 'check-circle' : 'alert-circle'} />
              )}
            />
          )}

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Ações Disponíveis</Text>

          <Button
            mode="contained"
            onPress={handleMigrateCurrentUser}
            disabled={isLoading || isMigrating || isMigrated === true}
            style={styles.button}
          >
            Migrar Minhas Configurações
          </Button>

          <Button
            mode="outlined"
            onPress={handleClearCache}
            disabled={isLoading || isMigrating}
            style={styles.button}
          >
            Limpar Cache de Configurações
          </Button>

          {isAdmin && (
            <>
              <Divider style={styles.divider} />

              <Text style={styles.sectionTitle}>Ações de Administrador</Text>

              <Button
                mode="contained"
                onPress={handleMigrateAllUsers}
                disabled={isLoading || isMigrating}
                style={[styles.button, styles.adminButton]}
              >
                Migrar Todos os Usuários
              </Button>

              {isMigrating && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>Migrando configurações...</Text>
                  <ProgressBar progress={progress} style={styles.progressBar} />
                </View>
              )}

              {migrationStats && (
                <Card style={styles.statsCard}>
                  <Card.Content>
                    <Text style={styles.statsTitle}>Resultado da Migração</Text>
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
  adminButton: {
    backgroundColor: theme.colors.error,
  },
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
