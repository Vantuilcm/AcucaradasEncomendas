import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Chip, useTheme, Divider, Button, Modal, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SkeletonList } from '../components/base/SkeletonLoading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Order, OrderStatus } from '../types/Order';
import { OrderService } from '../services/OrderService';
import { formatCurrency } from '../utils/formatters';
import { PaymentSplitDetails } from '../components/PaymentSplitDetails';
import { DeliveryTracker } from '../components/DeliveryTracker';
import { Ionicons } from '@expo/vector-icons';
import { PrintOrderButton } from '../components/PrintOrderButton';

type RouteParams = {
  orderId: string;
};

export function OrderDetailsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params as RouteParams;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isTrackingVisible, setIsTrackingVisible] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const orderService = new OrderService();
      const orderData = await orderService.getOrderById(orderId);

      if (!orderData) {
        throw new Error('Pedido não encontrado');
      }

      setOrder(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadOrder().finally(() => setRefreshing(false));
  }, []);

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

  if (loading && !refreshing) {
    return <SkeletonList type="order" count={1} />;
  }

  if (!order && !loading) {
    return <ErrorMessage message="Pedido não encontrado" onRetry={loadOrder} />;
  }

  // Simular a localização da loja e do destino para o rastreamento
  const simulatedStoreAddress = {
    latitude: -23.55052,
    longitude: -46.633309,
    address: 'Av. Paulista, 1000, São Paulo - SP',
  };

  const simulatedDestinationAddress = order?.deliveryAddress
    ? {
        latitude: -23.55752,
        longitude: -46.639309,
        address: `${order.deliveryAddress.street}, ${order.deliveryAddress.number}, ${order.deliveryAddress.city}`,
      }
    : {
        latitude: -23.55752,
        longitude: -46.639309,
        address: 'Endereço de entrega',
      };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {error && <ErrorMessage message={error} onRetry={loadOrder} />}

        {order && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.header}>
                <Text variant="titleLarge">Pedido #{order.id.slice(-6)}</Text>
                <View style={styles.headerActions}>
                  <PrintOrderButton order={order} compact={true} />
                  <Chip
                    textStyle={{ color: '#fff' }}
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusLabel(order.status)}
                  </Chip>
                </View>
              </View>

              <Text variant="bodyMedium" style={styles.date}>
                {new Date(order.createdAt).toLocaleDateString('pt-BR')}
              </Text>

              {order.status === 'delivering' && (
                <Button
                  mode="contained"
                  icon="map-marker-radius"
                  onPress={() => setIsTrackingVisible(true)}
                  style={[styles.trackButton, { backgroundColor: theme.colors.primary }]}
                >
                  Rastrear Entrega
                </Button>
              )}

              <Divider style={styles.divider} />

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Itens do Pedido
              </Text>

              {order.items.map(item => (
                <View key={item.id} style={styles.orderItem}>
                  <View style={styles.orderItemHeader}>
                    <Text variant="bodyLarge">{item.name}</Text>
                    <Text variant="bodyLarge">{formatCurrency(item.totalPrice)}</Text>
                  </View>
                  <Text variant="bodyMedium">Quantidade: {item.quantity}</Text>
                  <Text variant="bodyMedium">Preço unitário: {formatCurrency(item.unitPrice)}</Text>
                  {item.notes && (
                    <Text variant="bodySmall" style={styles.notes}>
                      Observação: {item.notes}
                    </Text>
                  )}
                </View>
              ))}

              <Divider style={styles.divider} />

              {/* Informações de agendamento para pedidos agendados */}
              {order.isScheduledOrder && order.scheduledDelivery && (
                <>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Informações da Entrega Agendada
                  </Text>

                  <View style={styles.scheduleInfo}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#FF69B4"
                      style={styles.infoIcon}
                    />
                    <Text style={styles.infoText}>
                      {new Date(order.scheduledDelivery.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={styles.scheduleInfo}>
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color="#FF69B4"
                      style={styles.infoIcon}
                    />
                    <Text style={styles.infoText}>
                      {order.scheduledDelivery.type === 'scheduled'
                        ? `Entre ${order.scheduledDelivery.timeSlot?.replace(' - ', ' e ')}`
                        : `Horário específico: ${order.scheduledDelivery.customTime}`}
                    </Text>
                  </View>

                  <View style={styles.scheduleInfo}>
                    <Ionicons
                      name="hourglass-outline"
                      size={20}
                      color="#FF69B4"
                      style={styles.infoIcon}
                    />
                    <Text style={styles.infoText}>
                      Tempo de preparo: {order.scheduledDelivery.preparationHours} hora
                      {order.scheduledDelivery.preparationHours > 1 ? 's' : ''}
                    </Text>
                  </View>

                  {order.scheduledDelivery.specialInstructions && (
                    <View style={styles.scheduleInfo}>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color="#FF69B4"
                        style={styles.infoIcon}
                      />
                      <Text style={styles.infoText}>
                        Instruções: {order.scheduledDelivery.specialInstructions}
                      </Text>
                    </View>
                  )}

                  <Divider style={styles.divider} />
                </>
              )}

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Endereço de Entrega
              </Text>

              <Text variant="bodyMedium">
                {order.deliveryAddress.street}, {order.deliveryAddress.number}
                {order.deliveryAddress.complement && ` - ${order.deliveryAddress.complement}`}
              </Text>
              <Text variant="bodyMedium">{order.deliveryAddress.neighborhood}</Text>
              <Text variant="bodyMedium">
                {order.deliveryAddress.city} - {order.deliveryAddress.state}
              </Text>
              <Text variant="bodyMedium">CEP: {order.deliveryAddress.zipCode}</Text>
              {order.deliveryAddress.reference && (
                <Text variant="bodySmall" style={styles.reference}>
                  Referência: {order.deliveryAddress.reference}
                </Text>
              )}

              <Divider style={styles.divider} />

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Forma de Pagamento
              </Text>

              <Text variant="bodyMedium">
                {order.paymentMethod.type === 'credit_card'
                  ? 'Cartão de Crédito'
                  : order.paymentMethod.type === 'debit_card'
                    ? 'Cartão de Débito'
                    : 'PIX'}
              </Text>

              {order.paymentDetails && (
                <PaymentSplitDetails paymentDetails={order.paymentDetails} />
              )}

              <Divider style={styles.divider} />

              {order.deliveryDriver && (
                <>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Entregador
                  </Text>

                  <Text variant="bodyMedium">Nome: {order.deliveryDriver.name}</Text>
                  <Text variant="bodyMedium">Telefone: {order.deliveryDriver.phone}</Text>
                  <Text variant="bodyMedium">Veículo: {order.deliveryDriver.vehicle}</Text>
                  <Text variant="bodyMedium">Placa: {order.deliveryDriver.plate}</Text>
                </>
              )}

              <Divider style={styles.divider} />

              <View style={styles.total}>
                <Text variant="titleLarge">Total</Text>
                <Text
                  variant="titleLarge"
                  style={{ color: theme.colors.primary, fontWeight: 'bold' }}
                >
                  {formatCurrency(order.totalAmount)}
                </Text>
              </View>

              {order.status === 'delivering' && order.deliveryDriver && (
                <Button
                  mode="contained"
                  icon="phone"
                  onPress={() => {
                    /* TODO: Implementar contato com entregador */
                  }}
                  style={[styles.contactButton, { backgroundColor: theme.colors.primary }]}
                >
                  Contatar Entregador
                </Button>
              )}

              <View style={styles.actionsContainer}>
                {order.status === 'delivered' && (
                  <Button
                    mode="contained"
                    icon="star"
                    onPress={() => navigation.navigate('CreateReview', { orderId: order.id })}
                    style={[styles.reviewButton, { backgroundColor: theme.colors.primary }]}
                  >
                    Avaliar Pedido
                  </Button>
                )}

                <PrintOrderButton order={order} />
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={isTrackingVisible}
          onDismiss={() => setIsTrackingVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {order && (
            <DeliveryTracker
              orderId={order.id}
              deliveryPersonId={order.deliveryDriver?.id}
              storeAddress={simulatedStoreAddress}
              deliveryAddress={simulatedDestinationAddress}
              onClose={() => setIsTrackingVisible(false)}
            />
          )}
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
  card: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    opacity: 0.7,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  orderItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notes: {
    fontStyle: 'italic',
    marginTop: 8,
  },
  reference: {
    fontStyle: 'italic',
    marginTop: 8,
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  contactButton: {
    marginTop: 16,
  },
  reviewButton: {
    marginTop: 16,
  },
  trackButton: {
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    margin: 0,
    backgroundColor: 'white',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  actionsContainer: {
    marginTop: 16,
    gap: 12,
  },
});
