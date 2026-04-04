import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  Chip,
  Searchbar,
  Menu,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { OrderService } from '../services/OrderService';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { Order, OrderStatus } from '../types/Order';
import { formatCurrency } from '../utils/formatters';
import { useAppTheme } from '../components/ThemeProvider';
import type { RootStackParamList } from '../navigation/AppNavigator';

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
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { isProdutor, isAdmin, isEntregador } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderFilter>('all');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const orderService = useMemo(() => OrderService.getInstance(), []);

  useEffect(() => {
    const unsubscribe = orderService.subscribeToAllOrders((realtimeOrders) => {
      setOrders(realtimeOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderService]);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, filterStatus, orders, user]);

  const loadOrders = async () => {
    setRefreshing(true);
    // Simular refresh manual
    setTimeout(() => setRefreshing(false), 500);
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

    // Filtrar por papel do usuário
    if (!isAdmin && user) {
      const userId = (user as any).id || (user as any).uid;
      
      if (isProdutor) {
        // Produtor só vê pedidos vinculados a ele
        filtered = filtered.filter(order => order.producerId === userId);
      } else if (isEntregador) {
        // Entregador só vê pedidos prontos (disponíveis para todos)
        // OU pedidos em que ele já está atribuído como motorista
        filtered = filtered.filter(order => 
          order.status === 'ready' || 
          (order.deliveryDriver?.id === userId)
        );
      }
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
        return theme.colors.warning;
      case 'confirmed':
        return theme.colors.info;
      case 'preparing':
        return theme.colors.secondary;
      case 'ready':
        return theme.colors.tertiary;
      case 'delivering':
        return theme.colors.primary;
      case 'delivered':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.outline;
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

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      // O onSnapshot cuidará de atualizar a lista de pedidos automaticamente
      setMenuVisible(null);
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status do pedido.');
    }
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

  // Verificar se o usuário é administrador, produtor ou entregador
  if (!isAdmin && !isProdutor && !isEntregador) {
    return (
      <ErrorMessage 
        message="Você não tem permissão para acessar esta área" 
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    // Lógica especial para entregador assumir pedido
    if (isEntregador && currentStatus === 'ready' && user) {
      try {
        const userId = (user as any).id || (user as any).uid;
        const driverService = new DeliveryDriverService();
        const driverData = await driverService.getDriverByUserId(userId);
        
        if (!driverData) {
          Alert.alert('Erro', 'Perfil de entregador não encontrado');
          return;
        }

        // Atribuir entregador ao pedido antes de avançar
        await orderService.updateOrder(orderId, {
          deliveryDriver: {
            id: driverData.id,
            name: driverData.name,
            phone: driverData.phone,
            vehicle: driverData.vehicle.model,
            plate: driverData.vehicle.plate
          }
        });
      } catch (err) {
        console.error('Erro ao atribuir entregador:', err);
        Alert.alert('Erro', 'Não foi possível assumir a entrega');
        return;
      }
    }

    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus !== currentStatus) {
      updateOrderStatus(orderId, nextStatus);
    }
  };

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
                      onPress={() => handleAdvanceStatus(order.id, order.status)}
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

const createStyles = (theme: { colors: any }) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text.primary,
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
    backgroundColor: theme.colors.card,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    color: theme.colors.text.secondary,
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
    color: theme.colors.primary,
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
