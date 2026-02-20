/**
 * Dashboard de Monitoramento em Tempo Real
 * Componente React que exibe mÃ©tricas, alertas e status do sistema de busca
 * em tempo real usando WebSocket
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { searchMonitor, MetricType, AlertLevel } from '../../monitoring/SearchMonitoring';
import LoggingService from '../../services/LoggingService';

const logger = LoggingService.getInstance();

// Interfaces para os dados do dashboard
interface DashboardMetrics {
  [key: string]: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    p95: number | null;
  };
}

interface DashboardAlert {
  id: string;
  metric: MetricType;
  level: AlertLevel;
  value: number;
  threshold: number;
  timestamp: number;
  message: string;
  acknowledged: boolean;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: Record<string, 'healthy' | 'warning' | 'critical'>;
  uptime: number;
  lastCheck: number;
}

interface RealTimeData {
  metrics: DashboardMetrics;
  alerts: DashboardAlert[];
  systemHealth: SystemHealth;
  timestamp: number;
}

const RealTimeMonitoringDashboard: React.FC = () => {
  const [realTimeData, setRealTimeData] = useState<RealTimeData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Conectar ao WebSocket para dados em tempo real
  const connectWebSocket = (): (() => void) | void => {
    try {
      // Em um ambiente real, vocÃª usaria uma URL WebSocket real
      // Para este exemplo, vamos simular a conexÃ£o
      const mockWebSocket = {
        send: (data: string) => {
          if (__DEV__) {
            logger.debug('Enviando dados via WebSocket:', { data });
          }
        },
        close: () => {
          setIsConnected(false);
        },
        readyState: 1, // WebSocket.OPEN
      };

      // Adicionar conexÃ£o ao sistema de monitoramento
      searchMonitor.addWebSocketConnection(mockWebSocket as any);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;

      // Simular recebimento de dados em tempo real
      const interval = setInterval(() => {
        const mockData: RealTimeData = {
          metrics: generateMockMetrics(),
          alerts: generateMockAlerts(),
          systemHealth: generateMockSystemHealth(),
          timestamp: Date.now(),
        };
        setRealTimeData(mockData);
      }, 5000);

      // Cleanup function
      return () => {
        clearInterval(interval);
        searchMonitor.removeWebSocketConnection(mockWebSocket as any);
      };
    } catch (error) {
      logger.error('Erro ao conectar WebSocket:', error instanceof Error ? error : new Error(String(error)));
      setConnectionError('Falha na conexão WebSocket');
      setIsConnected(false);

      // Tentar reconectar
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000 * reconnectAttempts.current); // Backoff exponencial
      }
      return undefined;
    }
  };

  // Gerar mÃ©tricas mock para demonstraÃ§Ã£o
  const generateMockMetrics = (): DashboardMetrics => {
    const metrics: DashboardMetrics = {};

    Object.values(MetricType).forEach(metric => {
      const baseValue = Math.random() * 100;
      metrics[metric] = {
        count: Math.floor(Math.random() * 1000) + 100,
        min: baseValue * 0.5,
        max: baseValue * 1.5,
        avg: baseValue,
        p95: baseValue * 1.2,
      };
    });

    return metrics;
  };

  // Gerar alertas mock para demonstraÃ§Ã£o
  const generateMockAlerts = (): DashboardAlert[] => {
    const alerts: DashboardAlert[] = [];

    if (Math.random() > 0.7) {
      alerts.push({
        id: `alert_${Date.now()}`,
        metric: MetricType.SEARCH_LATENCY,
        level: AlertLevel.WARNING,
        value: 750,
        threshold: 500,
        timestamp: Date.now(),
        message: 'LatÃªncia de busca acima do limite',
        acknowledged: false,
      });
    }

    return alerts;
  };

  // Gerar status de saÃºde mock para demonstraÃ§Ã£o
  const generateMockSystemHealth = (): SystemHealth => {
    const components: Record<string, 'healthy' | 'warning' | 'critical'> = {};

    Object.values(MetricType).forEach(metric => {
      const rand = Math.random();
      if (rand > 0.9) {
        components[metric] = 'critical';
      } else if (rand > 0.7) {
        components[metric] = 'warning';
      } else {
        components[metric] = 'healthy';
      }
    });

    const criticalCount = Object.values(components).filter(c => c === 'critical').length;
    const warningCount = Object.values(components).filter(c => c === 'warning').length;

    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (warningCount > 0) {
      overall = 'warning';
    }

    return {
      overall,
      components,
      uptime: Date.now() - (Date.now() - 24 * 60 * 60 * 1000), // 24 horas
      lastCheck: Date.now(),
    };
  };

  // Conectar ao WebSocket quando o componente monta
  useEffect(() => {
    const cleanup = connectWebSocket();

    return () => {
      if (cleanup) cleanup();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // FunÃ§Ã£o para atualizar dados manualmente
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Obter dados atuais do sistema de monitoramento
      const report = searchMonitor.generatePerformanceReport();
      const systemHealth = searchMonitor.getSystemHealth();
      const recentAlerts = searchMonitor.getRecentAlerts(300000); // Ãšltimos 5 minutos

      setRealTimeData({
        metrics: report,
        alerts: recentAlerts as DashboardAlert[],
        systemHealth,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Erro ao atualizar dados:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Falha ao atualizar dados do dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  // FunÃ§Ã£o para reconhecer um alerta
  const acknowledgeAlert = (alertId: string) => {
    const success = searchMonitor.acknowledgeAlert(alertId, 'dashboard_user');
    if (success) {
      Alert.alert('Sucesso', 'Alerta reconhecido com sucesso');
      onRefresh(); // Atualizar dados
    } else {
      Alert.alert('Erro', 'Falha ao reconhecer alerta');
    }
  };

  // FunÃ§Ã£o para formatar tempo de atividade
  const formatUptime = (uptime: number): string => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // FunÃ§Ã£o para obter cor baseada no status
  const getStatusColor = (status: 'healthy' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'healthy':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'critical':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  // FunÃ§Ã£o para obter cor baseada no nÃ­vel do alerta
  const getAlertColor = (level: AlertLevel): string => {
    switch (level) {
      case AlertLevel.INFO:
        return '#2196F3';
      case AlertLevel.WARNING:
        return '#FF9800';
      case AlertLevel.CRITICAL:
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  if (!realTimeData) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando dashboard...</Text>
          {connectionError && <Text style={styles.errorText}>{connectionError}</Text>}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header com status de conexÃ£o */}
      <View style={styles.header}>
        <Text style={styles.title}>Monitoramento em Tempo Real</Text>
        <View
          style={[
            styles.connectionStatus,
            { backgroundColor: isConnected ? '#4CAF50' : '#F44336' },
          ]}
        >
          <Text style={styles.connectionText}>{isConnected ? 'Conectado' : 'Desconectado'}</Text>
        </View>
      </View>

      {/* Status geral do sistema */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status do Sistema</Text>
        <View
          style={[
            styles.systemStatus,
            { backgroundColor: getStatusColor(realTimeData.systemHealth.overall) },
          ]}
        >
          <Text style={styles.systemStatusText}>
            {realTimeData.systemHealth.overall.toUpperCase()}
          </Text>
          <Text style={styles.uptimeText}>
            Uptime: {formatUptime(realTimeData.systemHealth.uptime)}
          </Text>
        </View>
      </View>

      {/* MÃ©tricas principais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MÃ©tricas Principais</Text>
        {Object.entries(realTimeData.metrics).map(([metric, data]) => (
          <View key={metric} style={styles.metricCard}>
            <Text style={styles.metricName}>{metric.replace(/_/g, ' ').toUpperCase()}</Text>
            <View style={styles.metricValues}>
              <Text style={styles.metricValue}>MÃ©dia: {data.avg?.toFixed(2) || 'N/A'}</Text>
              <Text style={styles.metricValue}>P95: {data.p95?.toFixed(2) || 'N/A'}</Text>
              <Text style={styles.metricValue}>Contagem: {data.count}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Alertas ativos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alertas Ativos ({realTimeData.alerts.length})</Text>
        {realTimeData.alerts.length === 0 ? (
          <Text style={styles.noAlertsText}>Nenhum alerta ativo</Text>
        ) : (
          realTimeData.alerts.map(alert => (
            <View
              key={alert.id}
              style={[styles.alertCard, { borderLeftColor: getAlertColor(alert.level) }]}
            >
              <View style={styles.alertHeader}>
                <Text style={[styles.alertLevel, { color: getAlertColor(alert.level) }]}>
                  {alert.level.toUpperCase()}
                </Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertDetails}>
                MÃ©trica: {alert.metric} | Valor: {alert.value.toFixed(2)} | Limite:{' '}
                {alert.threshold.toFixed(2)}
              </Text>
              {!alert.acknowledged && (
                <Text style={styles.acknowledgeButton} onPress={() => acknowledgeAlert(alert.id)}>
                  Reconhecer
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Componentes do sistema */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status dos Componentes</Text>
        {Object.entries(realTimeData.systemHealth.components).map(([component, status]) => (
          <View key={component} style={styles.componentCard}>
            <Text style={styles.componentName}>{component.replace(/_/g, ' ').toUpperCase()}</Text>
            <View style={[styles.componentStatus, { backgroundColor: getStatusColor(status) }]}>
              <Text style={styles.componentStatusText}>{status.toUpperCase()}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Timestamp da Ãºltima atualizaÃ§Ã£o */}
      <View style={styles.footer}>
        <Text style={styles.lastUpdate}>
          Ãšltima atualizaÃ§Ã£o: {new Date(realTimeData.timestamp).toLocaleString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  systemStatus: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  systemStatusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  uptimeText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  metricCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  metricName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  metricValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 12,
    color: '#666',
  },
  noAlertsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  alertCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertLevel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  alertDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  acknowledgeButton: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  componentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  componentName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  componentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  componentStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default RealTimeMonitoringDashboard;

