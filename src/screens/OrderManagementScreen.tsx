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
    let active = true;

    const loadOrdersOnce = async () => {
      try {
        const realtimeOrders = await orderService.getOrders();
        if (active) {
          setOrders(realtimeOrders);
        }
      } catch (error) {
        console.error('[ORDER_MANAGEMENT_DEBUG] Falha ao carregar pedidos via getOrders:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadOrdersOnce();
    return () => {
      active = false;
    };
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

  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    actorContext?: { uid?: string; role?: string; isAdmin?: boolean }
  ) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus, actorContext);
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

  // Lógica de Alertas Inteligentes (Fase 2)
  const getSmartAlert = () => {
    if (!orders || orders.length === 0) {
      return {
        type: 'success',
        title: '🤖 Assistente Açucaradas',
        text: 'Nenhum pedido no momento. Divulgue sua loja!',
        color: '#5E35B1',
        bgColor: '#E8EAF6'
      };
    }

    const now = new Date();
    const delayedOrders = orders.filter(o => {
      if (o.status !== 'pending' && o.status !== 'preparing' && o.status !== 'ready') return false;
      if (!o.updatedAt) return false;
      const updated = new Date(o.updatedAt);
      const diffMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
      return diffMinutes > 30;
    });

    if (delayedOrders.length > 0) {
      return {
        type: 'danger',
        title: '⚠️ Atenção aos Atrasos',
        text: `Você tem ${delayedOrders.length} pedido(s) sem atualização há mais de 30 minutos. Verifique a cozinha!`,
        color: '#D32F2F',
        bgColor: '#FFEBEE'
      };
    }

    const pendingOrders = orders.filter(o => o.status === 'pending');
    if (pendingOrders.length > 0) {
      return {
        type: 'warning',
        title: '🔔 Novos Pedidos',
        text: `Você tem ${pendingOrders.length} pedido(s) pendente(s) aguardando confirmação.`,
        color: '#F57C00',
        bgColor: '#FFF3E0'
      };
    }

    return {
      type: 'success',
      title: '🤖 Alertas Inteligentes',
      text: 'Tudo sob controle! Nenhum pedido está atrasado no momento.',
      color: '#5E35B1',
      bgColor: '#E8EAF6'
    };
  };

  const smartAlert = getSmartAlert();
  const statusAdvanceRole: 'producer' | 'admin' | 'courier' | 'other' = isAdmin
    ? 'admin'
    : isProdutor
      ? 'producer'
      : isEntregador
        ? 'courier'
        : 'other';
  /** Admin-only: delivering/delivered on this screen. Producer stops at ready. */
  const canSetDeliveryStatuses = isAdmin;

  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
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
        // WARNING: still uses updateOrder({ deliveryDriver }) — dual-ID/acceptOrderAtomic migration deferred
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

    const nextStatus = getNextStatus(currentStatus, statusAdvanceRole);
    if (nextStatus !== currentStatus) {
      updateOrderStatus(orderId, nextStatus);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Pedidos
        </Text>

        <View style={styles.quickSummaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{orders.filter(o => o.status === 'pending').length}</Text>
            <Text style={styles.summaryLabel}>Novos</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{orders.filter(o => o.status === 'preparing').length}</Text>
            <Text style={styles.summaryLabel}>Em Preparo</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{orders.filter(o => o.status === 'ready' || o.status === 'delivering').length}</Text>
            <Text style={styles.summaryLabel}>Agendados</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>{orders.filter(o => o.status === 'delivered').length}</Text>
            <Text style={styles.summaryLabel}>Finalizados</Text>
          </View>
        </View>

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

      <View style={styles.aiInsightContainer}>
        <Card style={[styles.aiInsightSurface, { backgroundColor: smartAlert.bgColor }]}>
          <View style={styles.aiHeader}>
            <Text style={[styles.aiTitle, { color: smartAlert.color }]}>{smartAlert.title}</Text>
          </View>
          <Text style={[styles.aiText, { color: smartAlert.color }]}>
            {smartAlert.text}
          </Text>
        </Card>
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
                    {canSetDeliveryStatuses && (
                      <Menu.Item
                        onPress={() => updateOrderStatus(order.id, 'delivering')}
                        title="Em Entrega"
                      />
                    )}
                    {canSetDeliveryStatuses && (
                      <Menu.Item
                        onPress={() =>
                          updateOrderStatus(order.id, 'delivered', {
                            uid: (user as any)?.id || (user as any)?.uid,
                            isAdmin: true,
                          })
                        }
                        title="Entregue (suporte)"
                      />
                    )}
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

                  {order.status !== 'delivered' &&
                    order.status !== 'cancelled' &&
                    getNextStatus(order.status, statusAdvanceRole) !== order.status && (
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
function getNextStatus(
  currentStatus: OrderStatus,
  role: 'producer' | 'admin' | 'courier' | 'other' = 'other'
): OrderStatus {
  if (role === 'producer') {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'preparing';
      case 'preparing':
        return 'ready';
      default:
        return currentStatus;
    }
  }

  if (role === 'courier') {
    // Delivered happens on DriverHome, not here
    if (currentStatus === 'ready') {
      return 'delivering';
    }
    return currentStatus;
  }

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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    color: '#1a1a1a',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  quickSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  aiInsightContainer: { paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  aiInsightSurface: { borderRadius: 12, backgroundColor: '#E8EAF6', padding: 12, elevation: 0 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  aiTitle: { fontSize: 13, fontWeight: 'bold', color: '#5E35B1' },
  aiText: { fontSize: 13, color: '#4527A0' },
  searchBar: {
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    elevation: 0,
    borderWidth: 1,
    borderColor: '#eee',
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
