import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Searchbar,
  useTheme,
  SegmentedButtons,
  Portal,
  Modal,
  TextInput,
  Switch,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Order, OrderStatus, OrderFilters, OrderSummary } from '../types/Order';
import { OrderService } from '../services/OrderService';
import { formatCurrency } from '../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

export function OrdersScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const orderService = new OrderService();
      const [ordersData, summaryData] = await Promise.all([
        orderService.getUserOrders(user.id, filters),
        orderService.getOrderSummary(user.id),
      ]);

      setOrders(ordersData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, search: query }));
  };

  const handleStatusChange = (status: OrderStatus | 'all') => {
    setSelectedStatus(status);
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : [status],
    }));
  };

  const handleApplyFilters = () => {
    setFilters(prev => ({
      ...prev,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }));
    setShowFilters(false);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'confirmed':
      case 'preparing':
      case 'ready':
        return theme.colors.info;
      case 'delivering':
        return theme.colors.primary;
      case 'delivered':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.disabled;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmado';
      case 'preparing':
        return 'Em Preparação';
      case 'ready':
        return 'Pronto';
      case 'delivering':
        return 'Em Entrega';
      case 'delivered':
        return 'Entregue';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando pedidos..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && <ErrorMessage message={error} onRetry={loadData} />}

        <View style={styles.header}>
          <Searchbar
            placeholder="Buscar pedidos"
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
          />

          <SegmentedButtons
            value={selectedStatus}
            onValueChange={handleStatusChange}
            buttons={[
              { value: 'all', label: 'Todos' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'delivering', label: 'Em Entrega' },
              { value: 'delivered', label: 'Entregues' },
            ]}
            style={styles.statusButtons}
          />

          <Button mode="outlined" onPress={() => setShowFilters(true)} style={styles.filterButton}>
            Filtros
          </Button>
        </View>

        {summary && (
          <View style={styles.summary}>
            <Text variant="titleMedium" style={styles.summaryTitle}>
              Resumo
            </Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text variant="headlineMedium">{summary.total}</Text>
                <Text variant="bodyMedium">Total</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="headlineMedium">{summary.pending}</Text>
                <Text variant="bodyMedium">Pendentes</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="headlineMedium">{summary.delivering}</Text>
                <Text variant="bodyMedium">Em Entrega</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="headlineMedium">{summary.delivered}</Text>
                <Text variant="bodyMedium">Entregues</Text>
              </View>
            </View>

            <View style={styles.scheduledSummary}>
              <Text variant="titleMedium" style={styles.scheduledTitle}>
                <Ionicons name="calendar-outline" size={18} color="#FF69B4" /> Pedidos Agendados
              </Text>
              <Text variant="headlineMedium" style={styles.scheduledCount}>
                {summary.scheduledOrders}
              </Text>
            </View>
          </View>
        )}

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Nenhum pedido encontrado
            </Text>
          </View>
        ) : (
          orders.map(order => (
            <Card
              key={order.id}
              style={styles.orderCard}
              onPress={() => handleOrderPress(order.id)}
            >
              <Card.Content>
                <View style={styles.orderHeader}>
                  <Text variant="titleMedium">Pedido #{order.id.slice(-6)}</Text>
                  <Chip
                    textStyle={{ color: '#fff' }}
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusLabel(order.status)}
                  </Chip>
                </View>

                <Text variant="bodyMedium" style={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </Text>

                {order.isScheduledOrder && (
                  <View style={styles.scheduledFlag}>
                    <Ionicons name="calendar" size={16} color="#FF69B4" />
                    <Text style={styles.scheduledText}>
                      Agendado para{' '}
                      {new Date(order.scheduledDelivery.date).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                )}

                <Text variant="bodyMedium" style={styles.orderTotal}>
                  Total: {formatCurrency(order.totalAmount)}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Filtros
          </Text>

          <TextInput
            label="Data Inicial"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="DD/MM/AAAA"
            style={styles.modalInput}
          />

          <TextInput
            label="Data Final"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="DD/MM/AAAA"
            style={styles.modalInput}
          />

          <View style={styles.switchContainer}>
            <Text variant="bodyLarge">Apenas Pedidos Agendados</Text>
            <Switch
              value={filters.isScheduled}
              onValueChange={value => setFilters(prev => ({ ...prev, isScheduled: value }))}
              color="#FF69B4"
            />
          </View>

          <View style={styles.modalActions}>
            <Button mode="text" onPress={() => setShowFilters(false)} style={styles.modalButton}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleApplyFilters}
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            >
              Aplicar
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
  },
  statusButtons: {
    marginBottom: 16,
  },
  filterButton: {
    marginBottom: 16,
  },
  summary: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
  },
  summaryTitle: {
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  orderCard: {
    margin: 16,
    marginTop: 0,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDate: {
    color: '#666',
    marginBottom: 8,
  },
  orderTotal: {
    color: '#666',
    marginBottom: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
  scheduledSummary: {
    backgroundColor: '#FFF9FB',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduledTitle: {
    color: '#333',
  },
  scheduledCount: {
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  scheduledFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  scheduledText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#FF69B4',
    fontStyle: 'italic',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
});
