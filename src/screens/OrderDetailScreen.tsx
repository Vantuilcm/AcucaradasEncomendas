import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, Button, Card, Chip, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { OrderService } from '../services/OrderService';
import { Order, OrderStatus } from '../types/Order';
import { useAppTheme } from '../components/ThemeProvider';
import { formatCurrency } from '../utils/formatters';
import type { RootStackParamList } from '../navigation/AppNavigator';

type OrderDetailRouteProp = RouteProp<RootStackParamList, 'OrderDetails'>;

export default function OrderDetailScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId } = route.params;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const orderService = useMemo(() => OrderService.getInstance(), []);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        const data = await orderService.getOrderById(orderId);
        if (data) {
          setOrder(data);
        } else {
          Alert.alert('Erro', 'Pedido não encontrado');
          navigation.goBack();
        }
      } catch (err) {
        console.error('Erro ao carregar pedido:', err);
        Alert.alert('Erro', 'Não foi possível carregar os detalhes do pedido');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, orderService, navigation]);

  const handleContactSupport = () => {
    Alert.alert('Suporte', 'Funcionalidade de chat com suporte em desenvolvimento.');
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    Alert.alert(
      'Cancelar Pedido',
      'Tem certeza que deseja cancelar este pedido?',
      [
        { text: 'Não', style: 'cancel' },
        { 
          text: 'Sim, Cancelar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await orderService.cancelOrder(order.id);
              const updatedOrder = await orderService.getOrderById(order.id);
              setOrder(updatedOrder);
              Alert.alert('Sucesso', 'Pedido cancelado com sucesso');
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Não foi possível cancelar o pedido');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !order) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando detalhes do pedido...</Text>
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return theme.colors.warning;
      case 'confirmed': return theme.colors.info;
      case 'preparing': return theme.colors.secondary;
      case 'ready': return theme.colors.tertiary;
      case 'delivering': return theme.colors.primary;
      case 'delivered': return theme.colors.success;
      case 'cancelled': return theme.colors.error;
      default: return theme.colors.outline;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Em Preparação';
      case 'ready': return 'Pronto';
      case 'delivering': return 'Em Entrega';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Pedido #{order.id.substring(0, 8)}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusRow}>
              <Text variant="titleMedium">Status</Text>
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) + '20' }]}
                textStyle={{ color: getStatusColor(order.status) }}
              >
                {getStatusLabel(order.status)}
              </Chip>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text variant="bodyMedium">Data do Pedido</Text>
              <Text variant="bodyMedium">{new Date(order.createdAt).toLocaleString('pt-BR')}</Text>
            </View>
            
            {order.estimatedDeliveryTime && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium">Entrega Estimada</Text>
                <Text variant="bodyMedium">{new Date(order.estimatedDeliveryTime).toLocaleString('pt-BR')}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Itens do Pedido
            </Text>
            
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemContainer}>
                <View style={styles.itemDetails}>
                  <Text variant="titleSmall">{item.name}</Text>
                  <Text variant="bodyMedium">Quantidade: {item.quantity}</Text>
                  <Text variant="bodyMedium" style={styles.itemPrice}>
                    {formatCurrency(item.totalPrice)}
                  </Text>
                </View>
              </View>
            ))}
            
            <Divider style={styles.divider} />
            
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">Subtotal</Text>
                <Text variant="bodyMedium">{formatCurrency(subtotal)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">Taxa de Entrega</Text>
                <Text variant="bodyMedium">{formatCurrency(order.deliveryFee || 0)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text variant="titleMedium">Total</Text>
                <Text variant="titleMedium" style={styles.totalPrice}>
                  {formatCurrency(order.totalAmount)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Endereço de Entrega
            </Text>
            
            <Text variant="bodyMedium">
              {order.deliveryAddress.street}, {order.deliveryAddress.number}
              {order.deliveryAddress.complement ? `, ${order.deliveryAddress.complement}` : ''}
            </Text>
            <Text variant="bodyMedium">
              {order.deliveryAddress.neighborhood}
            </Text>
            <Text variant="bodyMedium">
              {order.deliveryAddress.city} - {order.deliveryAddress.state}
            </Text>
            <Text variant="bodyMedium">
              CEP: {order.deliveryAddress.zipCode}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Pagamento
            </Text>
            
            <View style={styles.paymentRow}>
              <Ionicons name="card-outline" size={24} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={styles.paymentMethod}>
                {order.paymentMethod.type === 'credit_card' ? 'Cartão de Crédito' : 'PIX'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleContactSupport}
            style={styles.supportButton}
            icon="chat"
          >
            Suporte
          </Button>
          
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <Button
              mode="outlined"
              onPress={handleCancelOrder}
              style={styles.cancelButton}
              textColor={theme.colors.error}
            >
              Cancelar Pedido
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  statusCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    borderRadius: 8,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  card: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemPrice: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryContainer: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalPrice: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    marginLeft: 12,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  supportButton: {
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: theme.colors.error,
  },
});