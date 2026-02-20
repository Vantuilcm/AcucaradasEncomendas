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
import { Permission } from '../services/PermissionsService';
import { usePermissions } from '../hooks/usePermissions';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { OrderService } from '../services/OrderService';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { Modal, Portal, List, Avatar } from 'react-native-paper';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

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
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderFilter>('all');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<DeliveryDriver[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  useEffect(() => {
    if (!user) { return; }
    setLoading(true);
    const svc = new OrderService();
    const canViewAll =
      hasPermission(Permission.VISUALIZAR_TODOS_PEDIDOS) ||
      hasPermission(Permission.GERENCIAR_PEDIDOS);
    let unsub: (() => void) | null = null;
    if (canViewAll) {
      unsub = svc.subscribeToAllOrders(list => {
        setOrders(list);
        setLoading(false);
      });
    } else {
      unsub = svc.subscribeToUserOrders(user.id, list => {
        setOrders(list);
        setLoading(false);
      });
    }
    return () => { try { unsub?.(); } catch {} };
  }, [user, hasPermission]);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, filterStatus, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const svc = new OrderService();
      const canViewAll =
        hasPermission(Permission.VISUALIZAR_TODOS_PEDIDOS) ||
        hasPermission(Permission.GERENCIAR_PEDIDOS);
      let list: Order[] = [];
      if (canViewAll) {
        list = await svc.getAllOrders();
      } else if (user?.id) {
        list = await svc.getUserOrders(user.id);
      }
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
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

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'delivering') {
      const order = orders.find(o => o.id === orderId);
      if (order && !order.deliveryDriver) {
        setSelectedOrderId(orderId);
        await loadAvailableDrivers();
        setDriverModalVisible(true);
        return;
      }
    }

    try {
      setUpdatingId(orderId);
      const svc = new OrderService();
      const updated = await svc.updateOrderStatus(orderId, newStatus);
      setOrders(
        orders.map(order => (order.id === orderId ? { ...order, status: updated.status as OrderStatus } : order))
      );
      setMenuVisible(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status do pedido';
      setError(msg);
      try { Alert.alert('Erro', msg); } catch {}
    } finally {
      setUpdatingId(null);
    }
  };

  const loadAvailableDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const driverService = DeliveryDriverService.getInstance();
      const drivers = await driverService.getAvailableDrivers();
      setAvailableDrivers(drivers);
    } catch (err) {
      logger.error('Erro ao carregar entregadores:', err instanceof Error ? err : new Error(String(err)));
      Alert.alert('Erro', 'Não foi possível carregar os entregadores disponíveis.');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const assignDriverToOrder = async (driver: DeliveryDriver) => {
    if (!selectedOrderId) return;

    try {
      setUpdatingId(selectedOrderId);
      const orderService = new OrderService();
      
      // 1. Atribuir o entregador
      await orderService.assignDriver(selectedOrderId, {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicle: `${driver.vehicle.brand} ${driver.vehicle.model}`,
        plate: driver.vehicle.plate
      });

      // 2. Atualizar o status para 'delivering'
      const updated = await orderService.updateOrderStatus(selectedOrderId, 'delivering');
      
      setOrders(
        orders.map(order => 
          order.id === selectedOrderId 
            ? { ...order, status: 'delivering' as OrderStatus, deliveryDriver: updated.deliveryDriver } 
            : order
        )
      );
      
      setDriverModalVisible(false);
      setSelectedOrderId(null);
      setMenuVisible(null);
      Alert.alert('Sucesso', `Pedido atribuído ao entregador ${driver.name} e status alterado para Em Entrega.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atribuir entregador';
      Alert.alert('Erro', msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const showStatusOptions = (orderId: string) => {
    setMenuVisible(orderId);
  };

  const handleOrderDetails = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const handleOpenChat = (order: Order) => {
    navigation.navigate('Chat', {
      orderId: order.id,
      orderNumber: order.id,
    });
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando pedidos..." />;
  }

  

  return (
    <ProtectedRoute
      requiredPermissions={[Permission.GERENCIAR_PEDIDOS]}
      requireAllPermissions={true}
      fallbackRoute={undefined}
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryLabel="Voltar" />}
    >
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
                      disabled={updatingId === order.id}
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'confirmed')}
                      title="Confirmado"
                      disabled={updatingId === order.id}
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'preparing')}
                      title="Em Preparação"
                      disabled={updatingId === order.id}
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'ready')}
                      title="Pronto"
                      disabled={updatingId === order.id}
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'delivering')}
                      title="Em Entrega"
                      disabled={updatingId === order.id}
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'delivered')}
                      title="Entregue"
                      disabled={updatingId === order.id}
                    />
                    <Menu.Item
                      onPress={() => updateOrderStatus(order.id, 'cancelled')}
                      title="Cancelado"
                      disabled={updatingId === order.id}
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
                  <IconButton
                    icon="chat"
                    mode="contained"
                    containerColor={theme.colors.primary}
                    iconColor="#fff"
                    onPress={() => handleOpenChat(order)}
                    style={styles.chatButton}
                  />

                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <Button
                      mode="contained"
                      onPress={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                      style={[styles.advanceButton, { backgroundColor: theme.colors.primary }]}
                      loading={updatingId === order.id}
                      disabled={updatingId === order.id}
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

      <Portal>
        <Modal
          visible={driverModalVisible}
          onDismiss={() => setDriverModalVisible(false)}
          contentContainerStyle={styles.driverModal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Selecionar Entregador
          </Text>
          <Divider style={styles.modalDivider} />
          
          <ScrollView style={styles.driverList}>
            {loadingDrivers ? (
              <LoadingState message="Buscando entregadores..." />
            ) : availableDrivers.length === 0 ? (
              <Text style={styles.noDriversText}>Nenhum entregador disponível no momento.</Text>
            ) : (
              availableDrivers.map(driver => (
                <List.Item
                  key={driver.id}
                  title={driver.name}
                  description={`${driver.vehicle.type === 'motorcycle' ? 'Moto' : driver.vehicle.type === 'car' ? 'Carro' : 'Bicicleta'} - ${driver.vehicle.plate}`}
                  left={props => (
                    <Avatar.Icon 
                      {...props} 
                      icon={driver.vehicle.type === 'motorcycle' ? 'bicycle' : 'car'} 
                      size={40}
                      style={{ backgroundColor: theme.colors.primaryContainer }}
                    />
                  )}
                  onPress={() => assignDriverToOrder(driver)}
                  style={styles.driverItem}
                />
              ))
            )}
          </ScrollView>

          <Button 
            mode="outlined" 
            onPress={() => setDriverModalVisible(false)}
            style={styles.closeModalButton}
          >
            Cancelar
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
    </ProtectedRoute>
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
  chatButton: {
    margin: 0,
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
  driverModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  modalDivider: {
    marginBottom: 12,
  },
  driverList: {
    marginBottom: 12,
  },
  driverItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  noDriversText: {
    textAlign: 'center',
    padding: 20,
    color: '#757575',
  },
  closeModalButton: {
    marginTop: 8,
  },
});
