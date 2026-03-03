import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Chip, Divider, List, useTheme, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Tipos para pedidos
interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
}

interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

interface Order {
  id: string;
  date: string;
  status: 'pending' | 'preparing' | 'shipping' | 'delivered' | 'canceled';
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  address: Address;
  deliveryFee: number;
  estimatedDelivery?: string;
  trackingCode?: string;
}

// Dados de exemplo para o pedido
const sampleOrder: Order = {
  id: 'ORD-12345',
  date: '2023-06-15T14:30:00',
  status: 'preparing',
  items: [
    {
      id: 'item-1',
      productId: '1',
      productName: 'Bolo de Chocolate',
      quantity: 1,
      price: 45.99,
      image: 'https://via.placeholder.com/100',
    },
    {
      id: 'item-2',
      productId: '4',
      productName: 'Brigadeiro Gourmet (12 unidades)',
      quantity: 2,
      price: 24.99,
      image: 'https://via.placeholder.com/100',
    },
  ],
  total: 95.97,
  paymentMethod: 'Cartão de Crédito',
  address: {
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 45',
    neighborhood: 'Jardim Primavera',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
  },
  deliveryFee: 10.00,
  estimatedDelivery: '2023-06-16T16:00:00',
  trackingCode: 'TRACK-987654',
};

// Função para formatar data
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Função para obter cor do status
const getStatusColor = (status: Order['status'], theme: any) => {
  switch (status) {
    case 'pending':
      return theme.colors.warning;
    case 'preparing':
      return theme.colors.primary;
    case 'shipping':
      return theme.colors.info;
    case 'delivered':
      return theme.colors.success;
    case 'canceled':
      return theme.colors.error;
    default:
      return theme.colors.surface;
  }
};

// Função para obter texto do status
const getStatusText = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'preparing':
      return 'Em Preparação';
    case 'shipping':
      return 'Em Transporte';
    case 'delivered':
      return 'Entregue';
    case 'canceled':
      return 'Cancelado';
    default:
      return status;
  }
};

export default function OrderDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Simular carregamento do pedido
  useEffect(() => {
    const loadOrder = async () => {
      // Aqui você faria uma chamada API real usando o orderId da rota
      // const { orderId } = route.params;
      
      // Simulando delay de carregamento
      setTimeout(() => {
        setOrder(sampleOrder);
        setLoading(false);
      }, 1000);
    };

    loadOrder();
  }, []);

  const handleContactSupport = () => {
    // Implementar lógica para contato com suporte
    console.log('Contatar suporte');
  };

  const handleCancelOrder = () => {
    // Implementar lógica para cancelamento de pedido
    console.log('Cancelar pedido');
  };

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando detalhes do pedido...</Text>
      </SafeAreaView>
    );
  }

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

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
            Pedido {order.id}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusRow}>
              <Text variant="titleMedium">Status</Text>
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(order.status, theme) + '20' }]}
                textStyle={{ color: getStatusColor(order.status, theme) }}
              >
                {getStatusText(order.status)}
              </Chip>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text variant="bodyMedium">Data do Pedido</Text>
              <Text variant="bodyMedium">{formatDate(order.date)}</Text>
            </View>
            
            {order.estimatedDelivery && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium">Entrega Estimada</Text>
                <Text variant="bodyMedium">{formatDate(order.estimatedDelivery)}</Text>
              </View>
            )}
            
            {order.trackingCode && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium">Código de Rastreio</Text>
                <Text variant="bodyMedium">{order.trackingCode}</Text>
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
                <Card.Cover source={{ uri: item.image }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                  <Text variant="titleSmall">{item.productName}</Text>
                  <Text variant="bodyMedium">Quantidade: {item.quantity}</Text>
                  <Text variant="bodyMedium" style={styles.itemPrice}>
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
            
            <Divider style={styles.divider} />
            
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">Subtotal</Text>
                <Text variant="bodyMedium">R$ {subtotal.toFixed(2)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">Taxa de Entrega</Text>
                <Text variant="bodyMedium">R$ {order.deliveryFee.toFixed(2)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text variant="titleMedium">Total</Text>
                <Text variant="titleMedium" style={styles.totalPrice}>
                  R$ {order.total.toFixed(2)}
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
              {order.address.street}, {order.address.number}
              {order.address.complement ? `, ${order.address.complement}` : ''}
            </Text>
            <Text variant="bodyMedium">
              {order.address.neighborhood}
            </Text>
            <Text variant="bodyMedium">
              {order.address.city} - {order.address.state}
            </Text>
            <Text variant="bodyMedium">
              CEP: {order.address.zipCode}
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
                {order.paymentMethod}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            icon="headset"
            onPress={handleContactSupport}
            style={styles.actionButton}
          >
            Contatar Suporte
          </Button>
          
          {(order.status === 'pending' || order.status === 'preparing') && (
            <Button
              mode="outlined"
              icon="close-circle"
              onPress={handleCancelOrder}
              style={[styles.actionButton, styles.cancelButton]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  statusCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  card: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusChip: {
    height: 30,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  itemContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemPrice: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryContainer: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  totalPrice: {
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    marginLeft: 8,
  },
  actionsContainer: {
    margin: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  actionButton: {
    marginVertical: 8,
  },
  cancelButton: {
    borderColor: '#f44336',
  },
});