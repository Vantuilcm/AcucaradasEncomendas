import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { Text, Button, Card, Chip, Divider, useTheme, IconButton, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Modal, Portal, TextInput as PaperTextInput } from 'react-native-paper';
import { LocationService } from '../services/LocationService';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Order, OrderStatus } from '../types/Order';
import { OrderService } from '../services/OrderService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver } from '../types/DeliveryDriver';
import SignaturePad from '../components/SignaturePad';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

// Localização da loja (deve vir de config)
const STORE_LOCATION = {
  latitude: -23.55052,
  longitude: -46.633309,
};

// Tipos para pedidos
const formatDate = (dateInput: any) => {
  const date = new Date(dateInput);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// FunÃ§Ã£o para obter cor do status
const getStatusColor = (status: OrderStatus, theme: any) => {
  switch (status) {
    case 'pending':
      return theme.colors.error;
    case 'confirmed':
    case 'preparing':
    case 'ready':
      return theme.colors.tertiary;
    case 'delivering':
      return theme.colors.primary;
    case 'delivered':
      return theme.colors.secondary;
    case 'cancelled':
      return theme.colors.error;
    default:
      return theme.colors.surface;
  }
};

// FunÃ§Ã£o para obter texto do status
const getStatusText = (status: OrderStatus) => {
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

export default function OrderDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user } = useAuth();
  const { orderId } = route.params as any;
  const [order, setOrder] = useState<Order | null>(null);
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // POD State
  const [podModalVisible, setPodModalVisible] = useState(false);
  const [podPhoto, setPodPhoto] = useState<string | null>(null);
  const [podSignature, setPodSignature] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [submittingPod, setSubmittingPod] = useState(false);
  const [modalScrollEnabled, setModalScrollEnabled] = useState(true);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    setLoading(true);
    const svc = new OrderService();
    const driverSvc = DeliveryDriverService.getInstance();

    const unsub = svc.subscribeToOrder(orderId, async (o) => {
      setOrder(o);
      
      // Se tiver motorista, monitorar localização dele
      if (o && o.deliveryDriver?.id) {
        const d = await driverSvc.getDriverById(o.deliveryDriver.id);
        setDriver(d);
      }
      
      setLoading(false);
    });
    return () => { try { unsub(); } catch {} };
  }, [orderId]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const svc = new OrderService();
      const o = await svc.getOrderById(orderId);
      setOrder(o);
    } finally {
      setRefreshing(false);
    }
  };

  const handleContactSupport = () => {
    // TODO: Implementar lógica para contato com suporte
    logger.info('Ação: Contatar suporte solicitada no pedido ' + orderId);
  };

  const handleCancelOrder = () => {
    // TODO: Implementar lógica para cancelamento de pedido
    logger.info('Ação: Cancelar pedido solicitada para o pedido ' + orderId);
  };

  const handleOpenChat = () => {
    if (order) {
      navigation.navigate('Chat', {
        orderId: order.id,
        orderNumber: order.id,
      });
    }
  };

  const handleTakePodPhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permissão Negada', 'Você precisa permitir o acesso à câmera para tirar a foto da entrega.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPodPhoto(result.assets[0].uri);
    }
  };

  const handleFinishDelivery = async () => {
    if (!order) return;
    
    if (!podPhoto) {
      Alert.alert('Foto Obrigatória', 'Por favor, tire uma foto da entrega para finalizar.');
      return;
    }

    if (!podSignature) {
      Alert.alert('Assinatura Obrigatória', 'Por favor, colete a assinatura de quem recebeu.');
      return;
    }

    setSubmittingPod(true);
    try {
      const locationService = new LocationService();
      const coords = await locationService.getCurrentLocation();
      
      const orderService = new OrderService();
      await orderService.finishDelivery(order.id, {
        photoUrl: podPhoto,
        signatureUrl: podSignature,
        recipientName: recipientName || 'Próprio cliente',
        completedAt: new Date().toISOString(),
        coordinates: coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined
      });

      setPodModalVisible(false);
      Alert.alert('Sucesso', 'Entrega finalizada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível finalizar a entrega. Tente novamente.');
    } finally {
      setSubmittingPod(false);
    }
  };

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando detalhes do pedido...</Text>
      </SafeAreaView>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + (item.totalPrice ?? (item.unitPrice * item.quantity)), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
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

        {(order.status === 'delivering' || order.status === 'ready') && order.deliveryAddress?.coordinates && (
          <Card style={styles.mapCard}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: (order.deliveryAddress.coordinates.latitude + STORE_LOCATION.latitude) / 2,
                longitude: (order.deliveryAddress.coordinates.longitude + STORE_LOCATION.longitude) / 2,
                latitudeDelta: Math.abs(order.deliveryAddress.coordinates.latitude - STORE_LOCATION.latitude) * 2,
                longitudeDelta: Math.abs(order.deliveryAddress.coordinates.longitude - STORE_LOCATION.longitude) * 2,
              }}
            >
              <Marker
                coordinate={{
                  latitude: order.deliveryAddress.coordinates.latitude,
                  longitude: order.deliveryAddress.coordinates.longitude,
                }}
                title="Destino"
              >
                <Avatar.Icon size={30} icon="map-marker-check" style={{ backgroundColor: theme.colors.secondary }} />
              </Marker>

              <Marker
                coordinate={STORE_LOCATION}
                title="Açucaradas"
              >
                <Avatar.Icon size={30} icon="store" style={{ backgroundColor: theme.colors.primary }} />
              </Marker>

              {driver?.location && (
                <Marker
                  coordinate={{
                    latitude: driver.location.latitude,
                    longitude: driver.location.longitude,
                  }}
                  title="Entregador"
                >
                  <Avatar.Icon size={36} icon="bike" style={{ backgroundColor: theme.colors.tertiary }} />
                </Marker>
              )}

              <Polyline
                coordinates={[
                  STORE_LOCATION,
                  {
                    latitude: order.deliveryAddress.coordinates.latitude,
                    longitude: order.deliveryAddress.coordinates.longitude,
                  },
                ]}
                strokeColor={theme.colors.backdrop}
                strokeWidth={2}
                lineDashPattern={[5, 5]}
              />
            </MapView>
            <Card.Content style={styles.mapOverlay}>
              <Text variant="labelSmall" style={{ color: '#fff' }}>
                {order.status === 'delivering' ? 'Em entrega' : 'Pronto para coleta'}
              </Text>
            </Card.Content>
          </Card>
        )}

        {order.status === 'delivering' && driver && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.driverInfoContainer}>
                <Avatar.Icon size={40} icon="bike" style={{ backgroundColor: theme.colors.tertiary }} />
                <View style={styles.driverDetails}>
                  <Text variant="titleSmall">Seu Entregador</Text>
                  <Text variant="bodyMedium">{driver.name}</Text>
                </View>
                <IconButton
                  icon="chat"
                  mode="contained"
                  containerColor={theme.colors.primary}
                  iconColor="#fff"
                  onPress={handleOpenChat}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusRow}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Status do Pedido</Text>
              <Chip 
                mode="flat" 
                style={[styles.statusChip, { backgroundColor: getStatusColor(order.status, theme) }]}
                textStyle={{ color: '#fff' }}
              >
                {getStatusText(order.status)}
              </Chip>
            </View>

            {order.estimatedDeliveryTime && (
              <View style={styles.etaContainer}>
                <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={styles.etaText}>
                  Previsão de Entrega: <Text style={styles.etaHighlight}>{order.estimatedDeliveryTime}</Text>
                </Text>
              </View>
            )}
            
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text variant="bodyMedium">Data do Pedido</Text>
              <Text variant="bodyMedium">{formatDate(order.createdAt)}</Text>
            </View>
            
            {order.estimatedDeliveryTime && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium">Entrega Estimada</Text>
                <Text variant="bodyMedium">{order.estimatedDeliveryTime}</Text>
              </View>
            )}

            {order.actualDeliveryTime && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium">Entrega Real</Text>
                <Text variant="bodyMedium">{order.actualDeliveryTime}</Text>
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
                    {formatCurrency(item.totalPrice ?? item.unitPrice * item.quantity)}
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
                <Text variant="bodyMedium">{formatCurrency(order.paymentDetails?.deliveryFee ?? 0)}</Text>
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
            <Text variant="titleMedium" style={styles.sectionTitle}>Endereço de Entrega</Text>
            
            <Text variant="bodyMedium">{order.deliveryAddress.street}, {order.deliveryAddress.number}{order.deliveryAddress.complement ? `, ${order.deliveryAddress.complement}` : ''}</Text>
            <Text variant="bodyMedium">{order.deliveryAddress.neighborhood}</Text>
            <Text variant="bodyMedium">{order.deliveryAddress.city} - {order.deliveryAddress.state}</Text>
            <Text variant="bodyMedium">CEP: {order.deliveryAddress.zipCode}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Pagamento</Text>
            
            <View style={styles.paymentRow}>
              <Ionicons name="card-outline" size={24} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={styles.paymentMethod}>
                {order.paymentMethod.type === 'credit_card' ? 'Cartão de Crédito' : order.paymentMethod.type === 'debit_card' ? 'Cartão de Débito' : order.paymentMethod.type === 'pix' ? 'PIX' : 'Forma de pagamento' }
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionsContainer}>
          <Button
            mode="contained"
            icon="chat"
            onPress={handleOpenChat}
            style={styles.actionButton}
          >
            Chat do Pedido
          </Button>

          <Button
            mode="outlined"
            icon="headset"
            onPress={handleContactSupport}
            style={styles.actionButton}
          >
            Contatar Suporte
          </Button>

          {order.status === 'delivered' && !order.rating && (
            <Button
              mode="contained"
              icon="star"
              onPress={() => navigation.navigate('CreateReview', { orderId: order.id })}
              style={[styles.actionButton, { backgroundColor: '#FFD700' }]}
              textColor="#000"
            >
              Avaliar Pedido
            </Button>
          )}

          {order.status === 'delivering' && user?.id === order.deliveryDriver?.id && (
            <Button
              mode="contained"
              icon="check-circle"
              onPress={() => setPodModalVisible(true)}
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            >
              Finalizar Entrega
            </Button>
          )}
          
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

      <Portal>
        <Modal
          visible={podModalVisible}
          onDismiss={() => !submittingPod && setPodModalVisible(false)}
          contentContainerStyle={styles.podModal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Finalizar Entrega</Text>
          <Text variant="bodyMedium" style={styles.modalSubtitle}>
            Capture uma foto da entrega e colete a assinatura de quem recebeu.
          </Text>

          <ScrollView style={{ maxHeight: 400 }} scrollEnabled={modalScrollEnabled}>
            <View style={styles.podPhotoContainer}>
              {podPhoto ? (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: podPhoto }} style={styles.photoPreview} />
                  <IconButton
                    icon="camera-reverse"
                    mode="contained"
                    style={styles.retakeButton}
                    onPress={handleTakePodPhoto}
                  />
                </View>
              ) : (
                <Button
                  mode="outlined"
                  icon="camera"
                  onPress={handleTakePodPhoto}
                  style={styles.captureButton}
                >
                  Tirar Foto da Entrega
                </Button>
              )}
            </View>

            <PaperTextInput
              label="Nome de quem recebeu (opcional)"
              value={recipientName}
              onChangeText={setRecipientName}
              mode="outlined"
              style={styles.modalInput}
            />

            <Divider style={styles.divider} />
            
            <Text variant="titleSmall" style={{ marginBottom: 8 }}>Assinatura do Recebedor</Text>
            <SignaturePad 
              onSave={(data) => setPodSignature(data)}
              onClear={() => setPodSignature(null)}
              onDrawStart={() => setModalScrollEnabled(false)}
              onDrawEnd={() => setModalScrollEnabled(true)}
            />
            {podSignature && (
              <Text variant="bodySmall" style={{ color: '#4CAF50', marginTop: 4 }}>
                ✓ Assinatura coletada
              </Text>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setPodModalVisible(false)}
              disabled={submittingPod}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleFinishDelivery}
              loading={submittingPod}
              disabled={submittingPod}
              style={{ backgroundColor: '#4CAF50' }}
            >
              Confirmar Entrega
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
  mapCard: {
    margin: 16,
    marginTop: 0,
    height: 200,
    overflow: 'hidden',
    borderRadius: 12,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    alignItems: 'center',
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
  driverInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
    marginLeft: 12,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  etaText: {
    marginLeft: 8,
    color: '#666',
  },
  etaHighlight: {
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  podModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    marginBottom: 16,
    color: '#666',
  },
  podPhotoContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  photoPreviewContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  retakeButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  captureButton: {
    width: '100%',
    paddingVertical: 20,
    borderStyle: 'dashed',
  },
  modalInput: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});

