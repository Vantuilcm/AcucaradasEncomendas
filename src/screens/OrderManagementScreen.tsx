import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  Divider,
  Chip,
  Searchbar,
  Menu,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Order, OrderStatus } from '../types/Order';
import { formatCurrency } from '../utils/formatters';

type OrderFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export function OrderManagementScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderFilter>('all');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, filterStatus, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulação de carregamento de dados
      // No futuro, isso seria uma chamada para a API
      setTimeout(() => {
        const mockOrders: Order[] = [
          {
            id: '1',
            status: 'pending',
            items: [
              {
                id: '1',
                name: 'Bolo de Chocolate',
                quantity: 1,
                unitPrice: 45.9,
                totalPrice: 45.9,
              },
            ],
            totalAmount: 45.9,
            deliveryAddress: {
              street: 'Rua das Flores',
              number: '123',
              city: 'São Paulo',
              state: 'SP',
              zipCode: '01234-567',
              neighborhood: 'Jardim das Flores',
            },
            createdAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min atrás
            paymentMethod: { type: 'credit_card' },
          },
          {
            id: '2',
            status: 'confirmed',
            items: [
              {
                id: '2',
                name: 'Cupcake de Baunilha',
                quantity: 6,
                unitPrice: 8.5,
                totalPrice: 51.0,
              },
            ],
            totalAmount: 51.0,
            deliveryAddress: {
              street: 'Av. Paulista',
              number: '1000',
              city: 'São Paulo',
              state: 'SP',
              zipCode: '01310-100',
              neighborhood: 'Bela Vista',
            },
            createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(), // 2 horas atrás
            paymentMethod: { type: 'pix' },
          },
          {
            id: '3',
            status: 'preparing',
            items: [
              { id: '3', name: 'Torta de Limão', quantity: 1, unitPrice: 40.0, totalPrice: 40.0 },
              { id: '4', name: 'Docinhos (50 un)', quantity: 1, unitPrice: 75.0, totalPrice: 75.0 },
            ],
            totalAmount: 115.0,
            deliveryAddress: {
              street: 'Rua Augusta',
              number: '500',
              city: 'São Paulo',
              state: 'SP',
              zipCode: '01305-000',
              neighborhood: 'Consolação',
            },
            createdAt: new Date(Date.now() - 5 * 60 * 60000).toISOString(), // 5 horas atrás
            paymentMethod: { type: 'credit_card' },
          },
          {
            id: '4',
            status: 'delivered',
            items: [
              { id: '5', name: 'Bolo de Morango', quantity: 1, unitPrice: 55.0, totalPrice: 55.0 },
            ],
            totalAmount: 55.0,
            deliveryAddress: {
              street: 'Rua Oscar Freire',
              number: '300',
              city: 'São Paulo',
              state: 'SP',
              zipCode: '01426-000',
              neighborhood: 'Jardim Paulista',
            },
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(), // 2 dias atrás
            paymentMethod: { type: 'money' },
          },
        ];

        setOrders(mockOrders);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filtrar por texto de busca (id do pedido ou endereço)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        order =>
          order.id.toLowerCase().includes(query) ||
          order.deliveryAddress.street.toLowerCase().includes(query) ||
          order.deliveryAddress.neighborhood.toLowerCase().includes(query) ||
          order.items.some(item => item.name.toLowerCase().includes(query))
      );
    }

    // Filtrar por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    setFilteredOrders(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return '#FF9800'; // Laranja
      case 'confirmed':
        return '#2196F3'; // Azul
      case 'preparing':
        return '#9C27B0'; // Roxo
      case 'ready':
        return '#00BCD4'; // Ciano
      case 'delivering':
        return '#FF69B4'; // Rosa
      case 'delivered':
        return '#4CAF50'; // Verde
      case 'cancelled':
        return '#F44336'; // Vermelho
      default:
        return '#9E9E9E'; // Cinza
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

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(
      orders.map(order => {
        if (order.id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      })
    );
    setMenuVisible(null);
  };

  const showStatusOptions = (orderId: string) => {
    setMenuVisible(orderId);
  };

  const handleOrderDetails = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando pedidos..." />;
  }

  // Verificar se o usuário é administrador ou produtor
  if (user?.role !== 'admin' && user?.role !== 'producer') {
    return (
      <ErrorMessage
        message="Você não tem permissão para acessar esta área"
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Gerenciamento de Pedidos
        </Text>

        <Searchbar
          placeholder="Buscar pedidos..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <SegmentedButtons
          value={filterStatus}
          onValueChange={value => setFilterStatus(value as OrderFilter)}
          buttons={[
            { value: 'all', label: 'Todos' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'preparing', label: 'Em Preparo' },
            { value: 'delivered', label: 'Entregues' },
          ]}
          style={styles.filterButtons}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && <ErrorMessage message={error} onRetry={loadOrders} />}

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge">Nenhum pedido encontrado</Text>
            <Button
              mode="contained"
              onPress={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
              style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
            >
              Limpar Filtros
            </Button>
          </View>
        ) : (
          filteredOrders.map(order => (
            <Card key={order.id} style={styles.orderCard}>
              <Card.Content>
                <View style={styles.orderHeader}>
                  <View>
                    <Text variant="titleMedium">Pedido #{order.id}</Text>
                    <Text variant="bodySmall" style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleString('pt-BR')}
                    </Text>
                  </View>

                  <Menu
                    visible={menuVisible === order.id}
                    onDismiss={() => setMenuVisible(null)}
                    anchor={
                      <View style={styles.statusContainer}>
                        <Chip
                          mode="flat"
                          style={[
                            styles.statusChip,
                            { backgroundColor: getStatusColor(order.status) },
                          ]}
                          onPress={() => showStatusOptions(order.id)}
                        >
                          {getStatusLabel(order.status)}
                        </Chip>
                        <IconButton
                          icon="chevron-down"
                          size={20}
                          onPress={() => showStatusOptions(order.id)}
                        />
                      </View>
                    }
                  >
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'pending')}
                      title="Pendente"
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'confirmed')}
                      title="Confirmado"
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'preparing')}
                      title="Em Preparação"
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'ready')}
                      title="Pronto"
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'delivering')}
                      title="Em Entrega"
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'delivered')}
                      title="Entregue"
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'cancelled')}
                      title="Cancelado"
                    />
                  </Menu>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.orderItems}>
                  {order.items.map((item, index) => (
                    <Text key={index} style={styles.orderItem}>
                      {item.quantity}x {item.name} - {formatCurrency(item.totalPrice)}
                    </Text>
                  ))}
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.orderInfo}>
                    <Text variant="bodySmall">
                      <Text style={styles.infoLabel}>Endereço: </Text>
                      {order.deliveryAddress.street}, {order.deliveryAddress.number},{' '}
                      {order.deliveryAddress.neighborhood}
                    </Text>

                    <Text variant="bodySmall">
                      <Text style={styles.infoLabel}>Pagamento: </Text>
                      {order.paymentMethod.type === 'credit_card'
                        ? 'Cartão de Crédito'
                        : order.paymentMethod.type === 'debit_card'
                          ? 'Cartão de Débito'
                          : order.paymentMethod.type === 'pix'
                            ? 'PIX'
                            : 'Dinheiro'}
                    </Text>
                  </View>

                  <Text variant="titleMedium" style={styles.orderTotal}>
                    {formatCurrency(order.totalAmount)}
                  </Text>
                </View>

                <View style={styles.orderActions}>
                  <Button
                    mode="outlined"
                    onPress={() => handleOrderDetails(order.id)}
                    style={styles.detailsButton}
                  >
                    Ver Detalhes
                  </Button>

                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <Button
                      mode="contained"
                      onPress={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                      style={[styles.advanceButton, { backgroundColor: theme.colors.primary }]}
                    >
                      Avançar Status
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Função auxiliar para determinar o próximo status no fluxo do pedido
function getNextStatus(currentStatus: OrderStatus): OrderStatus {
  switch (currentStatus) {
    case 'pending':
      return 'confirmed';
    case 'confirmed':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return 'delivering';
    case 'delivering':
      return 'delivered';
    default:
      return currentStatus;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    color: '#333',
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 12,
  },
  filterButtons: {
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  orderCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    color: '#757575',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    height: 30,
  },
  divider: {
    marginVertical: 12,
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    marginBottom: 4,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  orderInfo: {
    flex: 1,
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  orderTotal: {
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  detailsButton: {
    flex: 1,
    marginRight: 8,
  },
  advanceButton: {
    flex: 1,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyButton: {
    marginTop: 16,
  },
});
