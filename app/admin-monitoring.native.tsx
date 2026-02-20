import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import RealTimeMonitoringDashboard from '../src/components/monitoring/RealTimeMonitoringDashboard';
import { useSearchMonitoring } from '../src/hooks/useSearchMonitoring';
import { searchMonitor } from '../src/monitoring/SearchMonitoring';
type PerformanceTestSummary = {
  totalTests: number;
  successRate: number;
};

/**
 * Tela administrativa para monitoramento do sistema
 * Permite visualizar métricas, alertas e executar testes
 */
export default function AdminMonitoringScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [performanceTestRunning, setPerformanceTestRunning] = useState(false);
  const [performanceResults, setPerformanceResults] = useState<PerformanceTestSummary | null>(null);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  const {
    isConnected,
    metrics,
    alerts,
    systemHealth,
    isLoading,
    error,
    refreshData,
    getPerformanceReport,
  } = useSearchMonitoring(realTimeEnabled, 5000);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar os dados');
    } finally {
      setRefreshing(false);
    }
  };

  const runPerformanceTests = async () => {
    setPerformanceTestRunning(true);
    try {
      if (__DEV__ && Platform.OS !== 'web') {
        const mod = await import('../src/monitoring/MonitoringPerformanceRuntime');
        const results: PerformanceTestSummary = await mod.runMonitoringPerformanceTests();
        setPerformanceResults(results);
        Alert.alert(
          'Testes Concluídos',
          `Executados ${results.totalTests} testes.\nTaxa de sucesso: ${results.successRate}%`
        );
      } else {
        Alert.alert('Indisponível', 'Testes de performance só estão disponíveis em desenvolvimento');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao executar testes de performance');
    } finally {
      setPerformanceTestRunning(false);
    }
  };

  const generateReport = () => {
    try {
      const report = getPerformanceReport();
      Alert.alert(
        'Relatório de Performance',
        `Métricas coletadas: ${Object.keys(report.metrics || {}).length}\nAlertas ativos: ${(report.alerts || []).length}\nStatus: ${report.systemHealth?.status || 'Desconhecido'}`
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o relatório');
    }
  };

  const clearMetrics = () => {
    Alert.alert('Limpar Métricas', 'Tem certeza que deseja limpar todas as métricas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: () => {
          try {
            searchMonitor.clearMetrics();
            Alert.alert('Sucesso', 'Métricas limpas com sucesso');
            refreshData();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível limpar as métricas');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Monitoramento Admin',
          headerStyle: { backgroundColor: '#2196F3' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status de Conexão */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Status do Sistema</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Conexão WebSocket:</Text>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: isConnected ? '#4CAF50' : '#F44336' },
              ]}
            />
            <Text style={[styles.statusText, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Sistema:</Text>
            <Text style={styles.statusValue}>{systemHealth?.status || 'Carregando...'}</Text>
          </View>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Erro: {error}</Text>
            </View>
          )}
        </View>

        {/* Controles */}
        <View style={styles.controlsCard}>
          <Text style={styles.cardTitle}>Controles</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Monitoramento Ativo</Text>
            <Switch
              value={monitoringEnabled}
              onValueChange={setMonitoringEnabled}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={monitoringEnabled ? '#2196F3' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Tempo Real</Text>
            <Switch
              value={realTimeEnabled}
              onValueChange={setRealTimeEnabled}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={realTimeEnabled ? '#2196F3' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Ações */}
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Ações</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={runPerformanceTests}
            disabled={performanceTestRunning}
          >
            {performanceTestRunning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Executar Testes de Performance</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={generateReport}
          >
            <Text style={[styles.buttonText, { color: '#2196F3' }]}>Gerar Relatório</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={clearMetrics}
          >
            <Text style={styles.buttonText}>Limpar Métricas</Text>
          </TouchableOpacity>
        </View>

        {/* Resultados dos Testes */}
        {performanceResults && (
          <View style={styles.resultsCard}>
            <Text style={styles.cardTitle}>Últimos Resultados de Performance</Text>
            <Text style={styles.resultText}>
              Testes executados: {performanceResults.totalTests}
            </Text>
            <Text style={styles.resultText}>
              Taxa de sucesso: {performanceResults.successRate}%
            </Text>
          </View>
        )}

        {/* Dashboard de Monitoramento */}
        <View style={styles.dashboardCard}>
          <Text style={styles.cardTitle}>Dashboard em Tempo Real</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Carregando dados...</Text>
            </View>
          ) : (
            <RealTimeMonitoringDashboard />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  controlsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  actionButton: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
});
