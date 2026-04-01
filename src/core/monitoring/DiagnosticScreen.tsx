// 🛠️ src/core/monitoring/DiagnosticScreen.tsx
// Tela técnica de diagnóstico acessível apenas em desenvolvimento (Etapa 11).

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl
} from 'react-native';
import { getLocalLogs, LogEntry } from './logger';
import { runHealthCheck, HealthCheckResult } from './healthCheck';
import { getFullQueue, QueuedLog, clearQueue } from './logQueue';
import { ENV } from '../../config/env';
import { transportManager } from './TransportManager';

export const DiagnosticScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [queue, setQueue] = useState<QueuedLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'HEALTH' | 'QUEUE'>('LOGS');

  const loadData = async () => {
    setRefreshing(true);
    const [localLogs, healthResult, currentQueue] = await Promise.all([
      getLocalLogs(),
      runHealthCheck(ENV),
      getFullQueue()
    ]);
    setLogs(localLogs);
    setHealth(healthResult);
    setQueue(currentQueue);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFlush = async () => {
    await transportManager.flushLogs();
    loadData();
  };

  const handleClear = async () => {
    await clearQueue();
    loadData();
  };

  const renderLogItem = (log: LogEntry | QueuedLog) => (
    <View key={log.id} style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={[styles.severity, { color: getSeverityColor(log.severity) }]}>
          {log.severity}
        </Text>
        <Text style={styles.timestamp}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
      </View>
      <Text style={styles.type}>{log.type}</Text>
      <Text style={styles.message}>{log.message}</Text>
      {log.metadata && (
        <Text style={styles.metadata}>{JSON.stringify(log.metadata, null, 2)}</Text>
      )}
      {'retryCount' in log && (
        <Text style={styles.retry}>Retries: {log.retryCount}</Text>
      )}
    </View>
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#FF0000';
      case 'HIGH': return '#FF4500';
      case 'MEDIUM': return '#FFA500';
      default: return '#1E90FF';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛠️ Diagnóstico Dev</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {(['LOGS', 'HEALTH', 'QUEUE'] as const).map(tab => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {activeTab === 'LOGS' && (
          <View>
            <Text style={styles.sectionTitle}>Últimos Logs Locais ({logs.length})</Text>
            {logs.map(renderLogItem)}
          </View>
        )}

        {activeTab === 'HEALTH' && health && (
          <View>
            <Text style={styles.sectionTitle}>Status do Sistema: {health.status.toUpperCase()}</Text>
            <View style={styles.healthCard}>
              {Object.entries(health.checks).map(([key, value]) => (
                <View key={key} style={styles.checkItem}>
                  <Text style={styles.checkLabel}>{key}:</Text>
                  <Text style={value ? styles.checkOk : styles.checkFail}>
                    {value ? '✅ OK' : '❌ FALHA'}
                  </Text>
                </View>
              ))}
            </View>

            {health.criticalErrors.length > 0 && (
              <View style={styles.errorSection}>
                <Text style={styles.errorTitle}>Erros Críticos:</Text>
                {health.criticalErrors.map((err, i) => <Text key={i} style={styles.errorText}>• {err}</Text>)}
              </View>
            )}

            {health.warnings.length > 0 && (
              <View style={styles.warningSection}>
                <Text style={styles.warningTitle}>Avisos:</Text>
                {health.warnings.map((warn, i) => <Text key={i} style={styles.warningText}>• {warn}</Text>)}
              </View>
            )}
          </View>
        )}

        {activeTab === 'QUEUE' && (
          <View>
            <View style={styles.row}>
              <Text style={styles.sectionTitle}>Fila de Envio ({queue.length})</Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={handleFlush} style={styles.actionButton}>
                  <Text style={styles.actionText}>Flush</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClear} style={[styles.actionButton, { backgroundColor: '#FF4444' }]}>
                  <Text style={styles.actionText}>Limpar</Text>
                </TouchableOpacity>
              </View>
            </View>
            {queue.map(renderLogItem)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', paddingTop: 40 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  closeButton: { padding: 8 },
  closeButtonText: { color: '#007AFF', fontWeight: '600' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F8F8F8' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#007AFF' },
  tabText: { color: '#666', fontWeight: '500' },
  activeTabText: { color: '#007AFF' },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#333' },
  logItem: { 
    padding: 12, 
    backgroundColor: '#F9F9F9', 
    borderRadius: 8, 
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DDD'
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  severity: { fontWeight: '800', fontSize: 12 },
  timestamp: { color: '#999', fontSize: 10 },
  type: { fontWeight: '600', fontSize: 13, marginBottom: 2 },
  message: { fontSize: 14, color: '#444' },
  metadata: { 
    fontSize: 11, 
    color: '#666', 
    backgroundColor: '#EEE', 
    padding: 4, 
    marginTop: 6,
    fontFamily: 'monospace'
  },
  retry: { fontSize: 10, color: '#FF4444', marginTop: 4, fontWeight: 'bold' },
  healthCard: { backgroundColor: '#F0F0F0', borderRadius: 8, padding: 12 },
  checkItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  checkLabel: { fontWeight: '600', color: '#444' },
  checkOk: { color: '#4CAF50', fontWeight: '700' },
  checkFail: { color: '#F44336', fontWeight: '700' },
  errorSection: { marginTop: 16, padding: 12, backgroundColor: '#FFEBEE', borderRadius: 8 },
  errorTitle: { color: '#C62828', fontWeight: 'bold', marginBottom: 4 },
  errorText: { color: '#D32F2F', fontSize: 13 },
  warningSection: { marginTop: 16, padding: 12, backgroundColor: '#FFF3E0', borderRadius: 8 },
  warningTitle: { color: '#EF6C00', fontWeight: 'bold', marginBottom: 4 },
  warningText: { color: '#E65100', fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row' },
  actionButton: { 
    backgroundColor: '#007AFF', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6,
    marginLeft: 8
  },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});
