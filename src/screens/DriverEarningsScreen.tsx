import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { OrderService } from '../services/OrderService';
import { Order } from '../types/Order';
import { formatCurrency } from '../utils/formatters';
import { UserUtils } from '../utils/UserUtils';

type FinancialStateKey =
  | 'paid'
  | 'pending'
  | 'failed'
  | 'missing_account'
  | 'legacy'
  | 'unconfirmed'
  | 'not_ready';

type FinancialState = {
  key: FinancialStateKey;
  label: string;
};

const normalizeDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (value && typeof value === 'object') {
    const candidate = value as { toDate?: unknown };
    if (typeof candidate.toDate === 'function') {
      try {
        const converted = (candidate.toDate as () => Date)();
        return converted instanceof Date && !Number.isNaN(converted.getTime())
          ? converted
          : null;
      } catch {
        return null;
      }
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const converted = new Date(value);
    return Number.isNaN(converted.getTime()) ? null : converted;
  }

  return null;
};

const getPayoutAmount = (order: Order): number => {
  if (
    typeof order.courierPayoutAmount === 'number' &&
    Number.isFinite(order.courierPayoutAmount)
  ) {
    return order.courierPayoutAmount;
  }

  if (typeof order.deliveryFee === 'number' && Number.isFinite(order.deliveryFee)) {
    return order.deliveryFee;
  }

  return 0;
};

const getFinancialState = (order: Order): FinancialState => {
  const status = order.courierPayoutStatus;
  const hasTransferId =
    typeof order.courierTransferId === 'string' &&
    order.courierTransferId.trim().length > 0;

  if (status === 'paid' && hasTransferId) {
    return { key: 'paid', label: 'Recebido' };
  }

  if (status === 'paid') {
    return { key: 'unconfirmed', label: 'Pagamento em verifica\u00e7\u00e3o' };
  }

  if (status === 'pending_delivery') {
    return { key: 'pending', label: 'A receber' };
  }

  if (status === 'failed') {
    return { key: 'failed', label: 'Problema no repasse' };
  }

  if (status === 'missing_connected_account') {
    return { key: 'missing_account', label: 'Conta de recebimento pendente' };
  }

  if (order.status === 'delivered') {
    return { key: 'legacy', label: 'Financeiro n\u00e3o confirmado' };
  }

  if (status) {
    return { key: 'unconfirmed', label: 'Estado financeiro n\u00e3o confirmado' };
  }

  return { key: 'not_ready', label: 'Aguardando conclus\u00e3o' };
};

const getDisplayDate = (order: Order): Date | null => {
  const state = getFinancialState(order);

  if (state.key === 'paid') {
    const paidDate = normalizeDate(order.courierPayoutProcessedAt);
    if (paidDate) {
      return paidDate;
    }
  }

  return normalizeDate(order.updatedAt) || normalizeDate(order.createdAt);
};

const formatDisplayDate = (order: Order): string => {
  const date = getDisplayDate(order);
  return date ? date.toLocaleDateString('pt-BR') : 'Data indispon\u00edvel';
};

export const DriverEarningsScreen = () => {
  const { user } = useAuth();
  const orderService = useMemo(() => OrderService.getInstance(), []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadOrders = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

      try {
        const driverId = UserUtils.getUserId(user);
        if (!driverId) {
          throw new Error('DRIVER_ID_UNAVAILABLE');
        }

        const data = await orderService.getOrdersForDriverEarnings(driverId);
        setOrders(data);
      } catch (error) {
        console.error('[DriverEarningsScreen] Falha ao carregar resumo de ganhos', error);
        setErrorMessage(
          'N\u00e3o foi poss\u00edvel carregar o resumo de ganhos agora.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderService, user]
  );

  useEffect(() => {
    void loadOrders(false);
  }, [loadOrders]);

  const financialOrders = useMemo(
    () =>
      orders
        .filter(
          order =>
            Boolean(order.courierPayoutStatus) || order.status === 'delivered'
        )
        .slice()
        .sort((a, b) => {
          const aTime = getDisplayDate(a)?.getTime() || 0;
          const bTime = getDisplayDate(b)?.getTime() || 0;
          return bTime - aTime;
        }),
    [orders]
  );

  const summary = useMemo(() => {
    let received = 0;
    let pending = 0;
    let failed = 0;
    let missingAccount = 0;
    let legacy = 0;
    let unconfirmed = 0;

    for (const order of financialOrders) {
      const state = getFinancialState(order);
      const amount = getPayoutAmount(order);

      if (state.key === 'paid') {
        received += amount;
      } else if (state.key === 'pending') {
        pending += amount;
      } else if (state.key === 'failed') {
        failed++;
      } else if (state.key === 'missing_account') {
        missingAccount++;
      } else if (state.key === 'legacy') {
        legacy++;
      } else if (state.key === 'unconfirmed') {
        unconfirmed++;
      }
    }

    return {
      received,
      pending,
      failed,
      missingAccount,
      legacy,
      unconfirmed,
    };
  }, [financialOrders]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando resumo de ganhos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadOrders(true);
            }}
          />
        }
      >
        <Text style={styles.heading}>Resumo de Ganhos</Text>
        <Text style={styles.subtitle}>
          Valores baseados no estado real do repasse de cada entrega.
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Recebido</Text>
            <Text style={styles.receivedValue}>
              {formatCurrency(summary.received)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>A receber</Text>
            <Text style={styles.pendingValue}>
              {formatCurrency(summary.pending)}
            </Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLine}>
            Repasse com problema: {summary.failed}
          </Text>
          <Text style={styles.statusLine}>
            Conta de recebimento pendente: {summary.missingAccount}
          </Text>
          <Text style={styles.statusLine}>
            {'Hist\u00f3rico financeiro n\u00e3o confirmado: '}{summary.legacy}
          </Text>
          {summary.unconfirmed > 0 && (
            <Text style={styles.statusLine}>
              Pagamentos em verifica\u00e7\u00e3o: {summary.unconfirmed}
            </Text>
          )}
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Entregas</Text>

        {financialOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhum registro financeiro de entrega encontrado.
            </Text>
          </View>
        ) : (
          financialOrders.map(order => {
            const state = getFinancialState(order);
            const amount = getPayoutAmount(order);
            const shortId = order.id.slice(-6).toUpperCase();

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderTitle}>Entrega #{shortId}</Text>
                  <Text style={styles.orderAmount}>
                    {formatCurrency(amount)}
                  </Text>
                </View>

                <Text style={styles.orderState}>{state.label}</Text>
                <Text style={styles.orderDate}>{formatDisplayDate(order)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 12,
    color: '#616161',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: '#616161',
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 8,
  },
  receivedValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
  pendingValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1565C0',
  },
  statusCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  statusLine: {
    color: '#424242',
    marginBottom: 6,
  },
  errorCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
  },
  errorText: {
    color: '#B71C1C',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  emptyCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    color: '#616161',
    textAlign: 'center',
  },
  orderCard: {
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitle: {
    fontWeight: '700',
    color: '#212121',
  },
  orderAmount: {
    fontWeight: '700',
    color: '#2E7D32',
  },
  orderState: {
    marginTop: 8,
    color: '#424242',
  },
  orderDate: {
    marginTop: 4,
    fontSize: 12,
    color: '#757575',
  },
});