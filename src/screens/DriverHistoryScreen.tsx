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

const getUpdatedAtTime = (order: Order): number =>
  normalizeDate(order.updatedAt)?.getTime() || 0;

const formatUpdatedAt = (order: Order): string => {
  const date = normalizeDate(order.updatedAt);
  return date ? date.toLocaleDateString('pt-BR') : 'Data indispon\u00edvel';
};

export const DriverHistoryScreen = () => {
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
        console.error('[DriverHistoryScreen] Falha ao carregar hist\u00f3rico de corridas', error);
        setErrorMessage(
          'N\u00e3o foi poss\u00edvel carregar o hist\u00f3rico de corridas agora.'
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

  const deliveredOrders = useMemo(
    () =>
      orders
        .filter(order => order.status === 'delivered')
        .slice()
        .sort((a, b) => getUpdatedAtTime(b) - getUpdatedAtTime(a)),
    [orders]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Carregando hist\u00f3rico...</Text>
        </View>
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
            onRefresh={() => void loadOrders(true)}
          />
        }
      >
        {errorMessage ? (
          <View style={styles.messageCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : deliveredOrders.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.emptyText}>Nenhuma corrida conclu\u00edda.</Text>
          </View>
        ) : (
          deliveredOrders.map(order => (
            <View key={order.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.orderTitle}>
                  Pedido #{order.id.substring(0, 6)}
                </Text>
                <Text style={styles.amount}>
                  {formatCurrency(order.deliveryFee || 0)}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatUpdatedAt(order)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  errorText: {
    color: '#B00020',
    textAlign: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTitle: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '700',
  },
  dateText: {
    color: '#666',
    fontSize: 13,
    marginTop: 8,
  },
});