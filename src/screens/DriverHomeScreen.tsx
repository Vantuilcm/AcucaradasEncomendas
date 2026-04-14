import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Linking, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  Switch,
  Title,
  Paragraph,
  Avatar,
  IconButton,
  List,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../components/ThemeProvider';
import { OrderService } from '../services/OrderService';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { Order, OrderStatus } from '../types/Order';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { formatCurrency } from '../utils/formatters';
import { LoadingState } from '../components/base/LoadingState';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function DriverHomeScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  const driverService = useMemo(() => new DeliveryDriverService(), []);
  const orderService = useMemo(() => OrderService.getInstance(), []);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userId = (user as any).id || (user as any).uid;
      const driverData = await driverService.getDriverByUserId(userId);
      
      if (driverData) {
        setDriver(driverData);
        setIsOnline(driverData.availability?.isAvailable || false);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do entregador:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    // Inscrever para todos os pedidos e filtrar localmente para garantir tempo real
    const unsubscribe = orderService.subscribeToAllOrders((allOrders) => {
      const userId = (user as any).id || (user as any).uid;
      
      // Pedidos disponíveis para retirada (ninguém assumiu ainda)
      const available = allOrders.filter(o => o.status === 'ready' && !o.deliveryDriver);
      
      // Pedidos que eu assumi e não foram finalizados
      const active = allOrders.filter(o => 
        o.deliveryDriver?.id === driver?.id && 
        ['ready', 'delivering'].includes(o.status)
      );

      // Histórico simples: últimos 5 pedidos entregues por mim
      const completed = allOrders
        .filter(o => o.deliveryDriver?.id === driver?.id && o.status === 'delivered')
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, 5);

      setAvailableOrders(available);
      setActiveOrders(active);
      setCompletedOrders(completed);
    });

    return () => unsubscribe();
  }, [user, driver?.id, orderService]);

  const toggleOnline = async (value: boolean) => {
    if (!driver) return;
    try {
      setIsOnline(value);
      await driverService.updateDriverAvailability(driver.id, value);
    } catch (error) {
      setIsOnline(!value);
      Alert.alert('Erro', 'Não foi possível alterar seu status.');
    }
  };

  const handleAcceptOrder = async (order: Order) => {
    if (!driver || !isOnline) {
      Alert.alert('Aviso', 'Fique online para aceitar entregas.');
      return;
    }

    try {
      await orderService.updateOrder(order.id, {
        deliveryDriver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          vehicle: driver.vehicle.model,
          plate: driver.vehicle.plate
        }
      });
      Alert.alert('Sucesso', 'Entrega aceita! Vá até a loja para retirar.');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível aceitar esta entrega.');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, status);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    }
  };

  const openInMaps = (address: any) => {
    const query = `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
    });
    if (url) Linking.openURL(url);
  };

  if (loading) return <LoadingState message="Carregando painel..." />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header de Status */}
        <Surface style={styles.statusHeader} elevation={2}>
          <View style={styles.statusRow}>
            <View>
              <Title style={styles.welcomeText}>Olá, {driver?.name?.split(' ')[0] || 'Entregador'}</Title>
              <Text style={styles.statusLabel}>{isOnline ? 'Você está Online' : 'Você está Offline'}</Text>
            </View>
            <Switch value={isOnline} onValueChange={toggleOnline} color={theme.colors.primary} />
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(driver?.totalEarnings || 0)}</Text>
              <Text style={styles.statLabel}>Ganhos Hoje</Text>
            </View>
            <Divider style={styles.vDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{driver?.totalDeliveries || 0}</Text>
              <Text style={styles.statLabel}>Entregas</Text>
            </View>
          </View>
        </Surface>

        {/* Corrida Ativa */}
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Entrega em Andamento</Title>
            {activeOrders.map(order => (
              <Card key={order.id} style={[styles.card, styles.activeCard]}>
                <Card.Content>
                  <View style={styles.orderHeader}>
                    <Text variant="titleMedium">Pedido #{order.id.substring(0, 6)}</Text>
                    <Chip style={{ backgroundColor: theme.colors.primary }}>{order.status === 'ready' ? 'Retirar' : 'Em Rota'}</Chip>
                  </View>
                  
                  <List.Item
                    title="Origem (Loja)"
                    description="Retirar no endereço da loja"
                    left={props => <List.Icon {...props} icon="store" />}
                  />
                  <List.Item
                    title="Destino (Cliente)"
                    description={`${order.deliveryAddress.street}, ${order.deliveryAddress.number}`}
                    left={props => <List.Icon {...props} icon="map-marker" />}
                  />

                  <View style={styles.actionButtons}>
                    <Button 
                      mode="outlined" 
                      icon="google-maps" 
                      onPress={() => openInMaps(order.deliveryAddress)}
                      style={styles.actionButton}
                    >
                      Mapa
                    </Button>
                    
                    {order.status === 'ready' ? (
                      <Button 
                        mode="contained" 
                        onPress={() => handleUpdateStatus(order.id, 'delivering')}
                        style={styles.actionButton}
                      >
                        Retirei o Pedido
                      </Button>
                    ) : (
                      <Button 
                        mode="contained" 
                        onPress={() => handleUpdateStatus(order.id, 'delivered')}
                        style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                      >
                        Entregue
                      </Button>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* Corridas Disponíveis */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Corridas Disponíveis ({availableOrders.length})</Title>
          {!isOnline ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="sleep" size={48} color={theme.colors.outline} />
                <Text style={styles.emptyText}>Fique online para ver corridas disponíveis</Text>
              </Card.Content>
            </Card>
          ) : availableOrders.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="moped" size={48} color={theme.colors.outline} />
                <Text style={styles.emptyText}>Nenhuma corrida disponível no momento</Text>
              </Card.Content>
            </Card>
          ) : (
            availableOrders.map(order => (
              <Card key={order.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.orderHeader}>
                    <Text variant="titleMedium">Entrega #{order.id.substring(0, 6)}</Text>
                    <Text style={styles.orderValue}>{formatCurrency(15.00)}</Text> 
                  </View>
                  
                  <Paragraph numberOfLines={1}>
                    <MaterialCommunityIcons name="store" /> {order.items[0]?.name || 'Produtos variados'}
                  </Paragraph>
                  <Paragraph numberOfLines={1}>
                    <MaterialCommunityIcons name="map-marker" /> {order.deliveryAddress.neighborhood}
                  </Paragraph>
                  
                  <Button 
                    mode="contained" 
                    onPress={() => handleAcceptOrder(order)}
                    style={styles.acceptButton}
                  >
                    Aceitar Entrega
                  </Button>
                </Card.Content>
              </Card>
            ))
          )}
        </View>

        {/* Histórico Simples */}
        {completedOrders.length > 0 && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Histórico Recente</Title>
            {completedOrders.map(order => (
              <List.Item
                key={order.id}
                title={`Pedido #${order.id.substring(0, 6)}`}
                description={`Entregue em: ${new Date(order.updatedAt || 0).toLocaleDateString()}`}
                left={props => <List.Icon {...props} icon="check-circle" color={theme.colors.success} />}
                right={() => <Text style={{ alignSelf: 'center', fontWeight: 'bold' }}>{formatCurrency(15.00)}</Text>}
                style={styles.historyItem}
              />
            ))}
          </View>
         )}

        <View style={styles.footer}>
          <Text style={styles.versionText}>Versão 1.1.8 (Build 1105)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingBottom: 24 },
  statusHeader: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  welcomeText: { fontSize: 24, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary },
  statLabel: { fontSize: 12, color: '#666' },
  vDivider: { width: 1, height: '100%', backgroundColor: '#eee' },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, marginBottom: 12, fontWeight: 'bold' },
  card: { marginBottom: 12, borderRadius: 12, backgroundColor: '#fff' },
  activeCard: { borderColor: theme.colors.primary, borderWidth: 1 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.success },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  actionButton: { flex: 1, marginHorizontal: 4 },
  acceptButton: { marginTop: 12 },
  emptyCard: { borderRadius: 12, backgroundColor: '#f1f3f5', borderStyle: 'dashed', borderWidth: 1, borderColor: '#dee2e6' },
  emptyContent: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, textAlign: 'center', color: '#666' },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    paddingBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#9E9E9E',
    opacity: 0.8,
  },
});
