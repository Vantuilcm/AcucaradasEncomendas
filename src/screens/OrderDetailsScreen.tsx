import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { Text, Card, Chip, useTheme, Divider, Button, Modal, Portal, ActivityIndicator, TextInput, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Linking, Alert, Image } from 'react-native';
import { SkeletonList } from '../components/base/SkeletonLoading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Order, OrderStatus } from '../types/Order';
import { OrderService } from '../services/OrderService';
import { formatCurrency } from '../utils/formatters';
import { PaymentSplitDetails } from '../components/PaymentSplitDetails';
import { DeliveryTracker } from '../components/DeliveryTracker';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { Ionicons } from '@expo/vector-icons';
import { PrintOrderButton } from '../components/PrintOrderButton';
import { useAuth } from '../contexts/AuthContext';
import { calculateDistance, estimateDeliveryTime } from '../utils/distanceCalculator';
import * as ImagePicker from 'expo-image-picker';

type RouteParams = {
  orderId: string;
};

export function OrderDetailsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { orderId } = route.params as RouteParams;
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isTrackingVisible, setIsTrackingVisible] = useState(false);
  const [driverId, setDriverId] = useState<string | undefined>();
  const [securityCodeInput, setSecurityCodeInput] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; time: number } | null>(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pickupPhoto, setPickupPhoto] = useState<string | null>(null);
  const [showPickupModal, setShowPickupModal] = useState(false);

  const rawRole: any = (user as any)?.activeRole ?? user?.role ?? 'customer';
  const isCourier = rawRole === 'courier' || rawRole === 'entregador';

  // Buscar driverId se for entregador
  useEffect(() => {
    if (isCourier && user?.id) {
      const driverService = DeliveryDriverService.getInstance();
      driverService.getDriverByUserId(user.id).then(driver => {
        if (driver) setDriverId(driver.id);
      });
    }
  }, [isCourier, user?.id]);

  const isAssignedToMe = order?.deliveryDriver?.id === user?.id || (user as any)?.driverId === order?.deliveryDriver?.id;
  const isAvailableForPickup = order?.status === 'ready' && !order.deliveryDriver;

  // Rastreamento de localização em tempo real para o entregador
  useLocationTracking(
    driverId,
    isCourier && order?.status === 'delivering' && isAssignedToMe
  );

  const handleTakePickupPhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permissão Negada', 'Você precisa permitir o acesso à câmera para tirar a foto da coleta.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPickupPhoto(result.assets[0].uri);
    }
  };

  const handleConfirmPickup = async () => {
    if (!pickupPhoto) {
      Alert.alert('Aviso', 'Por favor, tire uma foto dos produtos sendo coletados.');
      return;
    }

    try {
      setUpdating(true);
      const orderService = new OrderService();
      await orderService.recordPickup(orderId, pickupPhoto);
      setShowPickupModal(false);
      setPickupPhoto(null);
      await loadOrder();
      Alert.alert('Sucesso', 'Coleta registrada! A entrega foi iniciada.');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível registrar a coleta.');
    } finally {
      setUpdating(false);
    }
  };

  const acceptOrder = async () => {
    try {
      if (!user) return;
      setUpdating(true);
      
      const driverService = DeliveryDriverService.getInstance();
      const driver = await driverService.getDriverByUserId(user.id);
      
      if (!driver) {
        Alert.alert('Erro', 'Perfil de entregador não encontrado.');
        return;
      }

      const orderService = new OrderService();
      await orderService.assignDriver(orderId, {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicle: driver.vehicle.model,
        plate: driver.vehicle.plate
      });

      const updated = await orderService.updateOrderStatus(orderId, 'delivering');
      setOrder(updated);
      Alert.alert('Sucesso', 'Você aceitou o pedido! A entrega foi iniciada.');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível aceitar o pedido.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRateOrder = async () => {
    try {
      setUpdating(true);
      const orderService = new OrderService();
      await orderService.rateOrder(orderId, {
        rating: ratingInput,
        comment: ratingComment,
      });
      setShowRatingModal(false);
      await loadOrder();
      Alert.alert('Sucesso', 'Obrigado por sua avaliação!');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível enviar sua avaliação.');
    } finally {
      setUpdating(false);
    }
  };

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

      // Calcular distância e tempo se for entregador
      if (isCourier) {
        // Coordenadas da loja (fixas para este exemplo)
        const storeCoords = { latitude: -23.55052, longitude: -46.633309 };
        
        // Simular coordenadas do destino (em produção viria do Firestore)
        const destCoords = { latitude: -23.55752, longitude: -46.639309 };
        
        const distance = calculateDistance(storeCoords, destCoords);
        const time = estimateDeliveryTime(distance);
        setRouteInfo({ distance, time });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: OrderStatus, deliveryCode?: string) => {
    try {
      setUpdating(true);
      const orderService = new OrderService();
      const updated = await orderService.updateOrderStatus(orderId, newStatus, deliveryCode);
      setOrder(updated);
      setShowCodeModal(false);
      setSecurityCodeInput('');
      Alert.alert('Sucesso', `Status do pedido atualizado para ${getStatusLabel(newStatus)}`);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível atualizar o status do pedido.');
    } finally {
      setUpdating(false);
    }
  };

  const handleContact = (phone: string) => {
    const formattedPhone = phone.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=55${formattedPhone}`).catch(() => {
      Linking.openURL(`tel:${formattedPhone}`);
    });
  };

  const openChat = () => {
    if (!order) return;
    
    let recipientId = '';
    let recipientName = '';

    if (isCourier) {
      // Se eu sou o entregador, o destinatário é o cliente
      recipientId = order.userId;
      recipientName = 'Cliente'; // Idealmente buscar o nome do cliente
    } else if (order.deliveryDriver) {
      // Se eu sou o cliente, o destinatário é o entregador
      recipientId = order.deliveryDriver.id;
      recipientName = order.deliveryDriver.name;
    }

    if (recipientId) {
      navigation.navigate('Chat', {
        orderId: order.id,
        recipientId,
        recipientName
      });
    } else {
      Alert.alert('Aviso', 'Chat disponível apenas quando um entregador for atribuído.');
    }
  };

  const openInMaps = () => {
    if (!order?.deliveryAddress) return;
    const { street, number, city, state } = order.deliveryAddress;
    const fullAddress = `${street}, ${number}, ${city} - ${state}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(fullAddress)}`,
      android: `geo:0,0?q=${encodeURIComponent(fullAddress)}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback para URL web se o app de mapas não abrir
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`);
      });
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadOrder().finally(() => setRefreshing(false));
  }, []);

  const getStatusColor = (status: OrderStatus) => {
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
        return theme.colors.surfaceDisabled;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmado';
      case 'preparing':
        return 'Em Preparo';
      case 'ready':
        return 'Pronto para Coleta';
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
                <View>
                  <Text variant="titleLarge">Pedido #{order.id.slice(-6)}</Text>
                  {order.customerName && (
                    <Text variant="bodyMedium" style={styles.customerName}>
                      Cliente: {order.customerName}
                    </Text>
                  )}
                </View>
                <View style={styles.headerActions}>
                  <IconButton
                    icon="chat"
                    mode="contained"
                    containerColor={theme.colors.primary}
                    iconColor="white"
                    size={20}
                    onPress={openChat}
                  />
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
                <View>
                  <Button
                    mode="contained"
                    icon="map-marker-radius"
                    onPress={() => setIsTrackingVisible(true)}
                    style={[styles.trackButton, { backgroundColor: theme.colors.primary, marginBottom: 8 }]}
                  >
                    Rastrear Entrega
                  </Button>
                  
                  {!isCourier && order.deliveryCode && (
                    <Card style={styles.codeCard}>
                      <Card.Content style={styles.codeContent}>
                        <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
                        <View style={styles.codeTextContainer}>
                          <Text variant="labelMedium">Código de Segurança para Entrega</Text>
                          <Text variant="headlineMedium" style={styles.codeValue}>{order.deliveryCode}</Text>
                          <Text variant="bodySmall">Forneça este código ao entregador no momento da entrega.</Text>
                        </View>
                      </Card.Content>
                    </Card>
                  )}
                </View>
              )}

              {order.status === 'delivered' && !isCourier && !order.rating && (
                <Card style={styles.ratingPromptCard}>
                  <Card.Content>
                    <View style={styles.ratingPromptHeader}>
                      <Ionicons name="star" size={24} color="#FFD700" />
                      <Text variant="titleMedium" style={styles.ratingPromptTitle}>O que achou da entrega?</Text>
                    </View>
                    <Text variant="bodySmall" style={styles.ratingPromptSubtitle}>
                      Sua avaliação ajuda a melhorar nosso serviço.
                    </Text>
                    <Button 
                      mode="contained" 
                      onPress={() => setShowRatingModal(true)}
                      style={styles.rateButton}
                    >
                      Avaliar Agora
                    </Button>
                  </Card.Content>
                </Card>
              )}

              {order.status === 'delivered' && order.rating && (
                <Card style={styles.ratedCard}>
                  <Card.Content>
                    <View style={styles.ratedHeader}>
                      <Text variant="labelMedium">Sua Avaliação</Text>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons 
                            key={star} 
                            name={star <= order.rating!.rating ? "star" : "star-outline"} 
                            size={16} 
                            color="#FFD700" 
                          />
                        ))}
                      </View>
                    </View>
                    {order.rating.comment && (
                      <Text variant="bodyMedium" style={styles.ratedComment}>"{order.rating.comment}"</Text>
                    )}
                  </Card.Content>
                </Card>
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
                      Tempo de preparo definido pelo produtor:{' '}
                      {order.scheduledDelivery.preparationHours} hora
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

              {isCourier && routeInfo && (
                <>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Resumo da Rota
                  </Text>
                  <View style={styles.routeContainer}>
                    <View style={styles.routeItem}>
                      <Ionicons name="map-outline" size={24} color={theme.colors.primary} />
                      <View style={styles.routeTextContainer}>
                        <Text variant="labelSmall">Distância</Text>
                        <Text variant="bodyLarge" style={styles.routeValue}>{routeInfo.distance} km</Text>
                      </View>
                    </View>
                    <View style={styles.routeItem}>
                      <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                      <View style={styles.routeTextContainer}>
                        <Text variant="labelSmall">Tempo Estimado</Text>
                        <Text variant="bodyLarge" style={styles.routeValue}>{routeInfo.time} min</Text>
                      </View>
                    </View>
                  </View>
                  <Divider style={styles.divider} />
                </>
              )}

              <View style={styles.sectionHeaderWithAction}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Endereço de Entrega
                </Text>
                <IconButton
                  icon="map-marker-path"
                  size={20}
                  onPress={openInMaps}
                  mode="contained-tonal"
                />
              </View>

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
                  
                  {!isCourier && (
                    <Button
                      mode="outlined"
                      icon="whatsapp"
                      onPress={() => handleContact(order.deliveryDriver!.phone)}
                      style={styles.contactButtonInline}
                    >
                      Contatar Entregador
                    </Button>
                  )}
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

              {/* Ações do Entregador */}
              {isCourier && (
                <View style={styles.courierActions}>
                  <Divider style={styles.divider} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Ações de Entrega
                  </Text>
                  
                  {isAvailableForPickup && (
                    <Button
                      mode="contained"
                      icon="hand-pointing-right"
                      onPress={acceptOrder}
                      loading={updating}
                      disabled={updating}
                      style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    >
                      Aceitar e Iniciar Entrega
                    </Button>
                  )}

                  {isAssignedToMe && order.status === 'ready' && (
                    <Button
                      mode="contained"
                      icon="camera"
                      onPress={() => setShowPickupModal(true)}
                      loading={updating}
                      disabled={updating}
                      style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    >
                      Registrar Coleta (Tirar Foto)
                    </Button>
                  )}

                  {isAssignedToMe && order.status === 'delivering' && (
              <Button
                mode="contained"
                icon="check-circle"
                onPress={() => setShowCodeModal(true)}
                loading={updating}
                disabled={updating}
                style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
              >
                Finalizar Entrega (Requer Código)
              </Button>
            )}

                  <Button
                    mode="outlined"
                    icon="map-marker-path"
                    onPress={openInMaps}
                    style={styles.actionButton}
                  >
                    Ver no Mapa / Rota
                  </Button>

                  <Button
                    mode="outlined"
                    icon="chat"
                    onPress={openChat}
                    style={styles.actionButton}
                  >
                    Abrir Chat com Cliente
                  </Button>

                  {order.customerPhone && (
                    <Button
                      mode="outlined"
                      icon="whatsapp"
                      onPress={() => handleContact(order.customerPhone!)}
                      style={styles.actionButton}
                    >
                      WhatsApp do Cliente
                    </Button>
                  )}
                </View>
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

        {/* Modal de Código de Segurança */}
        <Modal
          visible={showCodeModal}
          onDismiss={() => setShowCodeModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.modalTitle}>Confirmar Entrega</Text>
              <Text variant="bodyMedium" style={styles.modalSubtitle}>
                Solicite o código de 4 dígitos ao cliente para concluir a entrega com segurança.
              </Text>
              
              <TextInput
                label="Código de Entrega"
                value={securityCodeInput}
                onChangeText={setSecurityCodeInput}
                keyboardType="number-pad"
                maxLength={4}
                style={styles.codeInput}
                mode="outlined"
                placeholder="0000"
              />
              
              <Button
                mode="contained"
                onPress={() => updateStatus('delivered', securityCodeInput)}
                loading={updating}
                disabled={updating || securityCodeInput.length !== 4}
                style={styles.confirmButton}
              >
                Validar e Finalizar
              </Button>
              
              <Button
                mode="text"
                onPress={() => setShowCodeModal(false)}
                disabled={updating}
              >
                Cancelar
              </Button>
            </Card.Content>
          </Card>
        </Modal>

        {/* Modal de Coleta (Pickup) */}
        <Modal
          visible={showPickupModal}
          onDismiss={() => !updating && setShowPickupModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.modalTitle}>Registrar Coleta</Text>
              <Text variant="bodyMedium" style={styles.modalSubtitle}>
                Tire uma foto dos produtos para confirmar que você coletou o pedido corretamente.
              </Text>

              <View style={styles.photoContainer}>
                {pickupPhoto ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: pickupPhoto }} style={styles.previewImage} />
                    <IconButton
                      icon="camera-retake"
                      mode="contained"
                      onPress={handleTakePickupPhoto}
                      style={styles.retakeButton}
                    />
                  </View>
                ) : (
                  <Button
                    mode="outlined"
                    icon="camera"
                    onPress={handleTakePickupPhoto}
                    style={styles.takePhotoButton}
                  >
                    Tirar Foto da Coleta
                  </Button>
                )}
              </View>

              <Button
                mode="contained"
                onPress={handleConfirmPickup}
                loading={updating}
                disabled={updating || !pickupPhoto}
                style={styles.confirmButton}
              >
                Confirmar Coleta e Iniciar Entrega
              </Button>

              <Button
                mode="text"
                onPress={() => setShowPickupModal(false)}
                disabled={updating}
              >
                Cancelar
              </Button>
            </Card.Content>
          </Card>
        </Modal>

        {/* Modal de Avaliação */}
        <Modal
          visible={showRatingModal}
          onDismiss={() => setShowRatingModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.modalTitle}>Avaliar Entrega</Text>
              <Text variant="bodyMedium" style={styles.modalSubtitle}>
                Como foi sua experiência com esta entrega?
              </Text>
              
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <IconButton
                    key={star}
                    icon={star <= ratingInput ? "star" : "star-outline"}
                    iconColor={star <= ratingInput ? "#FFD700" : "#ccc"}
                    size={40}
                    onPress={() => setRatingInput(star)}
                  />
                ))}
              </View>

              <TextInput
                label="Comentário (opcional)"
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
                numberOfLines={3}
                style={styles.ratingInput}
                mode="outlined"
              />
              
              <Button
                mode="contained"
                onPress={handleRateOrder}
                loading={updating}
                disabled={updating}
                style={styles.confirmButton}
              >
                Enviar Avaliação
              </Button>
              
              <Button
                mode="text"
                onPress={() => setShowRatingModal(false)}
                disabled={updating}
              >
                Agora não
              </Button>
            </Card.Content>
          </Card>
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
  customerName: {
    opacity: 0.8,
    marginTop: 2,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    marginTop: 8,
    borderRadius: 8,
  },
  codeCard: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#cce3ff',
    marginTop: 8,
    borderRadius: 12,
  },
  codeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  codeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  codeValue: {
    fontWeight: 'bold',
    letterSpacing: 4,
    color: '#000',
    marginVertical: 4,
  },
  modalCard: {
    borderRadius: 16,
    padding: 8,
  },
  modalTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  codeInput: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 24,
  },
  confirmButton: {
    borderRadius: 8,
    paddingVertical: 4,
    marginBottom: 8,
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
  contactButtonInline: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  courierActions: {
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  routeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeTextContainer: {
    marginLeft: 8,
  },
  routeValue: {
    fontWeight: 'bold',
  },
  ratingPromptCard: {
    backgroundColor: '#fff9e6',
    borderWidth: 1,
    borderColor: '#ffe082',
    marginTop: 8,
    borderRadius: 12,
  },
  ratingPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingPromptTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  ratingPromptSubtitle: {
    opacity: 0.7,
    marginBottom: 12,
  },
  rateButton: {
    borderRadius: 8,
  },
  ratedCard: {
    backgroundColor: '#f8f9fa',
    marginTop: 8,
    borderRadius: 12,
  },
  ratedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratedComment: {
    fontStyle: 'italic',
    opacity: 0.8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoContainer: {
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  previewContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  retakeButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  takePhotoButton: {
    padding: 20,
  },
  ratingInput: {
    marginBottom: 24,
  },
});

