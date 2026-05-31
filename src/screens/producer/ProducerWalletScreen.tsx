import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { ActivityIndicator, Surface, Text, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { ProducerAccountService } from '../../services/ProducerAccountService';
import { ProducerWalletEntry, ProducerWalletSummary } from '../../types/ProducerAccount';
import { formatCurrency } from '../../utils/formatters';

const service = ProducerAccountService.getInstance();

export const ProducerWalletScreen = () => {
  const { user } = useAuth();
  const uid = (user as any)?.uid || (user as any)?.id;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<ProducerWalletSummary | null>(null);

  const loadData = useCallback(async () => {
    if (!uid) {
      setSummary(null);
      setLoading(false);
      return;
    }
    try {
      const data = await service.getWalletSummary(uid);
      setSummary(data);
    } catch (error) {
      console.error('[PRODUCER_WALLET] load error', error);
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </SafeAreaView>
    );
  }

  const empty = !summary?.hasMovements;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {empty ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <MaterialCommunityIcons name="wallet-outline" size={48} color="#9C27B0" />
            <Text style={styles.emptyText}>Você ainda não possui movimentações financeiras.</Text>
          </Surface>
        ) : (
          <>
            <View style={styles.grid}>
              <Surface style={styles.statCard} elevation={1}>
                <Text style={styles.statLabel}>Saldo disponível</Text>
                <Text style={styles.statValue}>{formatCurrency(summary?.availableBalance || 0)}</Text>
              </Surface>
              <Surface style={styles.statCard} elevation={1}>
                <Text style={styles.statLabel}>Saldo pendente</Text>
                <Text style={styles.statValue}>{formatCurrency(summary?.pendingBalance || 0)}</Text>
              </Surface>
            </View>

            <Surface style={styles.infoCard} elevation={1}>
              <InfoRow label="Próximo repasse" value={summary?.nextPayoutLabel || '—'} />
              <Divider style={styles.divider} />
              <InfoRow label="Último repasse" value={summary?.lastPayoutLabel || '—'} />
            </Surface>

            <Text style={styles.sectionTitle}>Histórico financeiro</Text>
            {(summary?.entries || []).map((entry: ProducerWalletEntry) => (
              <Surface key={entry.id} style={styles.historyItem} elevation={1}>
                <View style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyLabel}>{entry.label}</Text>
                    <Text style={styles.historyMeta}>
                      {entry.status === 'paid'
                        ? 'Repasse confirmado'
                        : entry.status === 'pending'
                          ? 'Repasse pendente'
                          : 'Em processamento'}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>{formatCurrency(entry.amount)}</Text>
                </View>
              </Surface>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fff',
  },
  statLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  infoCard: { borderRadius: 16, padding: 16, backgroundColor: '#fff', marginBottom: 20 },
  infoRow: { paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: '#888' },
  infoValue: { fontSize: 15, color: '#333', marginTop: 4, fontWeight: '600' },
  divider: { marginVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  historyItem: { borderRadius: 12, padding: 14, backgroundColor: '#fff', marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  historyLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  historyMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
