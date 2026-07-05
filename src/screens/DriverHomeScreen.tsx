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
  List,
  Surface,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../components/ThemeProvider';
import { OrderService } from '../services/OrderService';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { Order, OrderStatus } from '../types/Order';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { formatCurrency } from '../utils/formatters';
import {
  canAcceptOrders,
  canGoOnline,
  canViewAvailableOrders,
} from '../utils/driverStatusPolicy';
import { AppVersion } from '../utils/AppVersion';
import { LoadingState } from '../components/base/LoadingState';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const isDriverToggleDiagnosticEnv =
  __DEV__ ||
  process.env.EXPO_PUBLIC_APP_ENV === 'preview' ||
  process.env.APP_ENV === 'preview' ||
  Constants.expoConfig?.extra?.env === 'preview';

const isDriverLoadForensicEnv = isDriverToggleDiagnosticEnv;

export function DriverHomeScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, _setRefreshing] = useState(false);
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
      const documentPath = `delivery_drivers/${userId}`;

      if (isDriverLoadForensicEnv) {
        console.error('[DRIVER_LOAD_FORENSIC]', {
          uid: userId,
          documentPath,
          authUserId: (user as any).id ?? null,
          authUserUid: (user as any).uid ?? null,
          phase: 'before_getDriverByUserId',
        });
      }

      const driverData = await driverService.getDriverByUserId(userId);

      if (isDriverLoadForensicEnv) {
        console.error('[DRIVER_LOAD_FORENSIC]', {
          uid: userId,
          documentPath,
          documentExists: Boolean(driverData),
          documentId: driverData?.id ?? null,
          driverId: driverData?.id ?? null,
          driverUserId: driverData?.userId ?? null,
          driverStatus: driverData?.status ?? null,
          phase: 'after_getDriverByUserId',
        });
      }
      
      if (driverData) {
        setDriver(driverData);
        setIsOnline(driverData.availability?.isAvailable || false);
      } else {
        console.error('[TOGGLE_AVAILABILITY_FORENSIC] driver not found on load', {
          uid: userId,
          driverDocumentPath: documentPath,
        });
      }
    } catch (error) {
      const loadError = error as Error & { code?: string };
      console.error('Erro ao carregar dados do entregador:', loadError);
      if (isDriverLoadForensicEnv) {
        console.error('[DRIVER_LOAD_FORENSIC]', {
          uid: (user as any)?.id || (user as any)?.uid || null,
          documentPath: `delivery_drivers/${(user as any)?.id || (user as any)?.uid || 'unknown'}`,
          documentExists: false,
          documentId: null,
          driverId: null,
          driverUserId: null,
          phase: 'load_error',
          message: loadError?.message,
          code: loadError?.code ?? 'sem código',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    let active = true;

    const loadOrdersOnce = async () => {
      if (!user) return;
      try {
        setLoading(true);

        if (!canViewAvailableOrders(driver?.status)) {
          console.error('[DRIVER_STATUS_POLICY]', {
            driverId: driver?.id ?? null,
            status: driver?.status ?? null,
            action: 'viewAvailableOrders',
          });
          setAvailableOrders([]);
          return;
        }

        const allOrders = await orderService.getOrders();

        if (!active) return;

        const available = allOrders.filter(o => o.status === 'ready' && !o.deliveryDriver);
        const activeOrders = allOrders.filter(o => 
          o.deliveryDriver?.id === driver?.id && 
          ['ready', 'delivering'].includes(o.status)
        );

        const completed = allOrders
          .filter(o => o.deliveryDriver?.id === driver?.id && o.status === 'delivered')
          .sort((a, b) => {
            const tA = (a.updatedAt as any) instanceof Date ? (a.updatedAt as any).getTime() : (a.updatedAt || 0);
            const tB = (b.updatedAt as any) instanceof Date ? (b.updatedAt as any).getTime() : (b.updatedAt || 0);
            return (tB as number) - (tA as number);
          })
          .slice(0, 5);

        setAvailableOrders(available);
        setActiveOrders(activeOrders);
        setCompletedOrders(completed);
      } catch (error) {
        console.error('[DRIVER_HOME_DEBUG] Falha ao carregar pedidos via getOrders:', error);
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
  }, [user, driver?.id, orderService]);

  const toggleOnline = async (value: boolean) => {
    const uid = (user as any)?.uid || (user as any)?.id;
    const driverDocumentPath = driver?.id
      ? `delivery_drivers/${driver.id}`
      : uid
        ? `delivery_drivers/${uid}`
        : 'delivery_drivers/unknown';
    const availabilityField = 'availability.isAvailable';

    console.error('[TOGGLE_AVAILABILITY_FORENSIC]', {
      uid,
      driverDocumentPath,
      driverStatus: driver?.status ?? 'sem driver',
      field: availabilityField,
      value,
      driverLoaded: Boolean(driver),
      driverId: driver?.id ?? null,
      switchDisabled: loading || !driver,
    });

    if (!driver?.id) {
      console.warn('[DRIVER_ONLINE_STATUS] Perfil de entregador não encontrado no estado local');
      if (isDriverToggleDiagnosticEnv) {
        Alert.alert(
          'Erro Técnico',
          [
            'Fase: toggleAvailability',
            'Mensagem: Perfil de entregador não carregado (driver.id ausente)',
            'Código: sem código',
          ].join('\n')
        );
      } else {
        Alert.alert('Erro', 'Perfil de entregador não carregado. Puxe a tela para baixo para atualizar.');
      }
      return;
    }

    if (value && !canGoOnline(driver.status)) {
      console.error('[DRIVER_STATUS_POLICY]', {
        driverId: driver.id,
        status: driver.status,
        action: 'goOnline',
      });
      Alert.alert(
        'Cadastro em análise',
        'Seu cadastro precisa ser aprovado antes de ficar online.'
      );
      return;
    }

    try {
      setIsOnline(value);
      console.log('[DRIVER_ONLINE_STATUS] Atualizando Firestore para o driver:', driver.id);
      await driverService.updateDriverAvailability(driver.id, value);
      console.log('[DRIVER_ONLINE_STATUS] Atualizado com sucesso no Firestore');
    } catch (error) {
      const toggleError = error as Error & { code?: string };
      console.error('[DRIVER_ONLINE_STATUS] Erro no Firestore:', toggleError);
      console.error('[TOGGLE_AVAILABILITY_FORENSIC_ERROR]', {
        uid,
        driverDocumentPath,
        driverStatus: driver?.status,
        field: availabilityField,
        value,
        message: toggleError?.message,
        code: toggleError?.code,
        stack: toggleError?.stack,
      });
      setIsOnline(!value);
      if (isDriverToggleDiagnosticEnv) {
        Alert.alert(
          'Erro Técnico',
          [
            'Fase: toggleAvailability',
            `Mensagem: ${toggleError?.message || 'sem mensagem'}`,
            `Código: ${toggleError?.code || 'sem código'}`,
          ].join('\n')
        );
      } else {
        Alert.alert('Erro', 'Não foi possível alterar seu status. Verifique sua conexão.');
      }
    }
  };

  const handleAcceptOrder = async (order: Order) => {
    if (!driver || !isOnline) {
      Alert.alert('Aviso', 'Fique online para aceitar entregas.');
      return;
    }

    if (!canAcceptOrders(driver.status)) {
      console.error('[DRIVER_STATUS_POLICY]', {
        driverId: driver.id,
        status: driver.status,
        action: 'acceptOrder',
      });
      Alert.alert(
        'Cadastro em análise',
        'Aguarde a aprovação do seu cadastro.'
      );
      return;
    }

    try {
      // Usa o novo método atômico para blindar corrida fantasma/concorrência
      const acceptedOrder = await orderService.acceptOrderAtomic(order.id, {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicle: driver.vehicle.model,
        plate: driver.vehicle.plate
      });

      setAvailableOrders(prev =>
        prev.filter(item => item.id !== order.id)
      );

      setActiveOrders(prev => {
        const withoutAccepted = prev.filter(item => item.id !== acceptedOrder.id);
        return [acceptedOrder, ...withoutAccepted];
      });
      
      Alert.alert('Sucesso', 'Entrega aceita! Vá até a loja para retirar.');
    } catch (error: any) {
      Alert.alert('Ops', error.message || 'Não foi possível aceitar esta entrega.');
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

  const getStatusBadge = (status: OrderStatus) => {
    switch(status) {
      case 'ready': return <Chip style={{ backgroundColor: '#FFF9C4' }} textStyle={{ color: '#F57F17', fontWeight: 'bold', fontSize: 12 }}>🟡 Aguardando retirada</Chip>;
      case 'delivering': return <Chip style={{ backgroundColor: '#E1BEE7' }} textStyle={{ color: '#6A1B9A', fontWeight: 'bold', fontSize: 12 }}>🟣 Em rota</Chip>;
      case 'delivered': return <Chip style={{ backgroundColor: '#C8E6C9' }} textStyle={{ color: '#2E7D32', fontWeight: 'bold', fontSize: 12 }}>🟢 Entregue</Chip>;
      default: return <Chip>Status: {status}</Chip>;
    }
  };

  if (loading) return <LoadingState message="Carregando painel..." />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header de Status */}
        <Surface style={[styles.statusHeader, isOnline ? styles.statusHeaderOnline : styles.statusHeaderOffline]} elevation={3}>
          <View style={styles.statusRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Title style={styles.welcomeText}>Olá, {driver?.name?.split(' ')[0] || 'Entregador'}</Title>
              <Text style={isOnline ? styles.statusLabelOnline : styles.statusLabelOffline}>
                {isOnline ? '🟢 Você está online\nPronto para receber entregas próximas' : '⚪ Você está offline\nAtive para começar a receber corridas'}
              </Text>
            </View>
            <Switch 
              value={isOnline} 
              onValueChange={toggleOnline} 
              color="#4CAF50" 
              disabled={loading || !driver}
            />
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
            <Divider style={styles.vDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValuePlaceholder}>Calculando...</Text>
              <Text style={styles.statLabel}>Ganhos Sem.</Text>
            </View>
            <Divider style={styles.vDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValuePlaceholder}>Calculando...</Text>
              <Text style={styles.statLabel}>Média/Corrida</Text>
            </View>
          </View>
        </Surface>

        {/* Corrida Ativa */}
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Entrega em Andamento</Title>
            {activeOrders.map(order => (
              <Card key={order.id} style={[styles.premiumCard, styles.activeCard]}>
                <Card.Content>
                  <View style={styles.orderPremiumHeader}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Pedido #{order.id.substring(0, 6)}</Text>
                    {getStatusBadge(order.status)}
                  </View>
                  
                  <List.Item
                    title="Origem (Loja)"
                    description="Retirar no endereço da loja"
                    left={props => <List.Icon {...props} icon="storefront" color="#666" />}
                    titleStyle={{ fontWeight: '600' }}
                  />
                  <List.Item
                    title="Destino (Cliente)"
                    description={`${order.deliveryAddress?.street || 'Rua'}, ${order.deliveryAddress?.number || 'S/N'}`}
                    left={props => <List.Icon {...props} icon="map-marker-outline" color="#666" />}
                    titleStyle={{ fontWeight: '600' }}
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
                        buttonColor="#6A1B9A"
                      >
                        Retirei
                      </Button>
                    ) : (
                      <Button 
                        mode="contained" 
                        onPress={() => handleUpdateStatus(order.id, 'delivered')}
                        style={styles.actionButton}
                        buttonColor="#4CAF50"
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
            <View style={styles.emptyPremiumContainer}>
              <MaterialCommunityIcons name="moped-outline" size={56} color="#ccc" />
              <Text style={styles.emptyPremiumTitle}>Nenhuma entrega disponível agora 🛵</Text>
              <Text style={styles.emptyPremiumSubtitle}>Fique online que avisaremos novas corridas próximas.</Text>
            </View>
          ) : availableOrders.length === 0 ? (
            <View style={styles.emptyPremiumContainer}>
              <MaterialCommunityIcons name="radar" size={56} color="#4CAF50" />
              <Text style={styles.emptyPremiumTitle}>Buscando entregas... 🛵</Text>
              <Text style={styles.emptyPremiumSubtitle}>Aguarde, estamos buscando as melhores corridas próximas a você.</Text>
            </View>
          ) : (
            availableOrders.map(order => (
              <Card key={order.id} style={styles.premiumCard}>
                <Card.Content>
                  <View style={styles.orderPremiumHeader}>
                    <Text style={styles.storeName}>
                      <MaterialCommunityIcons name="storefront-outline" size={16} /> {order.items?.[0]?.name || 'Produtos variados'}
                    </Text>
                    <Text style={styles.orderPremiumValue}>{formatCurrency(order.deliveryFee || 5.00)}</Text> 
                  </View>
                  
                  <View style={styles.orderPremiumDetails}>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>{order.deliveryAddress?.neighborhood || 'Bairro indisponível'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="bike" size={16} color="#666" />
                      <Text style={styles.detailText}>Entrega próxima</Text>
                    </View>
                  </View>
                  
                  <Button 
                    mode="contained" 
                    onPress={() => handleAcceptOrder(order)}
                    style={styles.acceptPremiumButton}
                    labelStyle={styles.acceptPremiumButtonText}
                    buttonColor="#4CAF50"
                  >
                    Aceitar Corrida
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
                left={props => <List.Icon {...props} icon="check-circle" color="#4CAF50" />}
                right={() => <Text style={{ alignSelf: 'center', fontWeight: 'bold', color: '#4CAF50' }}>{formatCurrency(order.deliveryFee || 5.00)}</Text>}
                style={styles.historyItem}
              />
            ))}
          </View>
         )}

        <View style={styles.footer}>
          <Text style={styles.versionText}>{AppVersion.getDisplayString()}</Text>
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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statusHeaderOnline: {
    borderBottomWidth: 4,
    borderBottomColor: '#4CAF50',
  },
  statusHeaderOffline: {
    borderBottomWidth: 4,
    borderBottomColor: '#ccc',
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statusLabelOnline: { fontSize: 14, color: '#4CAF50', fontWeight: '600', marginTop: 4, lineHeight: 20 },
  statusLabelOffline: { fontSize: 14, color: '#757575', fontWeight: '500', marginTop: 4, lineHeight: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  statValuePlaceholder: { fontSize: 12, fontWeight: '600', color: '#999', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center' },
  vDivider: { width: 1, height: 30, backgroundColor: '#eee', alignSelf: 'center' },
  section: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, marginBottom: 16, fontWeight: 'bold', color: '#333' },
  premiumCard: { 
    marginBottom: 16, 
    borderRadius: 16, 
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  activeCard: { borderColor: theme.colors.primary, borderWidth: 1 },
  orderPremiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  storeName: { fontSize: 16, fontWeight: 'bold', color: '#424242' },
  orderPremiumValue: { fontSize: 20, fontWeight: '900', color: '#4CAF50' },
  orderPremiumDetails: { marginBottom: 16, backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailText: { fontSize: 14, color: '#555', marginLeft: 8 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  actionButton: { flex: 1, marginHorizontal: 4, borderRadius: 12 },
  acceptPremiumButton: { marginTop: 8, borderRadius: 12, paddingVertical: 4 },
  acceptPremiumButtonText: { fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  emptyPremiumContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', borderStyle: 'dashed' },
  emptyPremiumTitle: { marginTop: 16, fontSize: 16, fontWeight: 'bold', color: '#424242', textAlign: 'center' },
  emptyPremiumSubtitle: { marginTop: 8, textAlign: 'center', color: '#757575', fontSize: 14, lineHeight: 20 },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
    paddingVertical: 4,
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
