import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { PaymentCardForm } from '../components/PaymentCardForm';
import { PaymentSummary } from '../components/PaymentSummary';
import { validationService } from '../services/validationService';
import { Card, Button, Divider, IconButton, Chip, ActivityIndicator, Modal, Portal, useTheme, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { DeliverySchedule } from '../types/Order';
import type { RootStackParamList } from '../types/navigation';
import { useAppNavigation } from '../hooks/useAppNavigation';
import type { CartItem } from '../services/CartService';
import { useStripe } from '@stripe/stripe-react-native';

import { useAuth } from '../contexts/AuthContext';
import { OrderService } from '../services/OrderService';
import { PaymentService } from '../services/PaymentService';
import { LocationService, GeoCoordinates } from '../services/LocationService';
import { producerService } from '../services/ProducerService';
import { UserProfileService } from '../services/UserProfileService';
import { CreateOrderInput } from '../types/Order';
import { calculateDeliveryFee } from '../constants/delivery';
import { calculatePaymentSplit } from '../utils/paymentCalculations';
import LoggingService from '../services/LoggingService';
import { StripeService } from '../services/StripeService';

const logger = LoggingService.getInstance();

export default function CheckoutScreen() {
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'Checkout'>>();
  const { total, items, clearCart } = useCart();
  const stripe = useStripe();

  useEffect(() => {
    if (stripe) {
      StripeService.getInstance().initialize(stripe);
    }
  }, [stripe]);

  const locationService = new LocationService();

  const [paymentMethod, setPaymentMethod] = useState('creditCard');

  // Estado para distância e frete
  const [estimatedDistance, setEstimatedDistance] = useState(5.0);
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  
  const deliveryFee = calculateDeliveryFee(estimatedDistance);
  const subtotal = items.reduce((acc, item: CartItem) => acc + item.price * item.quantity, 0);
  
  // Obter o ID do produtor do primeiro item do carrinho (assumindo que todos são do mesmo produtor)
  const producerId = items.length > 0 ? items[0].producerId : '';

  // Usar utilitário centralizado para cálculos de split
  const paymentSplit = calculatePaymentSplit(
    subtotal, 
    deliveryFee, 
    paymentMethod === 'pix' ? 'pix' : paymentMethod === 'money' ? 'money' : 'credit_card'
  );

  const totalWithDelivery = paymentSplit.total;

  const [address, setAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    reference: '',
  });

  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStepStarted, setPaymentStepStarted] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; expiresAt: number; paymentIntentId: string } | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);

  // Obter dados do agendamento da navegação
  const scheduledDelivery: DeliverySchedule | undefined = route.params?.scheduledDelivery;

  // Verificar se tem agendamento e redirecionar se não tiver
  useEffect(() => {
    if (!scheduledDelivery && items.length > 0) {
      navigation.navigate('ScheduleDelivery');
    }
  }, [scheduledDelivery, items, navigation]);

  // Efeito para aplicar CEP automático de endereços salvos do usuário
  useEffect(() => {
    const loadSavedAddress = async () => {
      if (!user?.id) return;

      try {
        const userProfile = await UserProfileService.getInstance().getFullUserProfile(user.id);
        
        if (userProfile.endereco && userProfile.endereco.length > 0) {
          // Encontrar o endereço principal ou o primeiro disponível
          const primaryAddress = userProfile.endereco.find(addr => addr.principal) || userProfile.endereco[0];
          
          const mappedAddress = {
            street: primaryAddress.rua || '',
            number: primaryAddress.numero || '',
            complement: primaryAddress.complemento || '',
            neighborhood: primaryAddress.bairro || '',
            city: primaryAddress.cidade || '',
            state: primaryAddress.estado || '',
            zipCode: primaryAddress.cep || '',
            reference: '', // UserProfile.Address não tem reference por padrão, pode ser adicionado depois
          };

          setAddress(mappedAddress);

          // Se tiver CEP, calcular a distância real
          if (mappedAddress.zipCode.replace(/\D/g, '').length === 8) {
            calculateRealDistance(mappedAddress.zipCode);
          }
        }
      } catch (error) {
        logger.error('Erro ao carregar endereço salvo:', error instanceof Error ? error : new Error(String(error)));
      }
    };

    loadSavedAddress();
  }, [user]);

  const formatCreditCard = (text: string) => {
    // Remover espaços e caracteres não numéricos
    const numericValue = text.replace(/\D/g, '');

    // Adicionar espaços a cada 4 dígitos
    const cardValue = numericValue
      .replace(/(\d{4})(?=\d)/g, '$1 ')
      .trim()
      .slice(0, 19); // Limitar a 16 dígitos + 3 espaços

    return cardValue;
  };

  const formatExpirationDate = (text: string) => {
    // Remover caracteres não numéricos
    const numericValue = text.replace(/\D/g, '');

    // Formatar como MM/YY
    if (numericValue.length <= 2) {
      return numericValue;
    } else {
      return `${numericValue.slice(0, 2)}/${numericValue.slice(2, 4)}`;
    }
  };

  const handleZipCodeChange = (text: string) => {
    // Remove caracteres não numéricos
    const numericValue = text.replace(/[^0-9]/g, '');

    // Limita a 8 dígitos
    const truncatedValue = numericValue.slice(0, 8);

    // Formata o CEP quando tem 8 dígitos
    const formattedZipCode = validationService.formatZipCode(truncatedValue);

    setAddress({ ...address, zipCode: formattedZipCode });

    // Se o CEP for preenchido, calcular a distância real
    if (truncatedValue.length === 8) {
      calculateRealDistance(formattedZipCode);
    }
  };

  const calculateRealDistance = async (zipCode: string) => {
    try {
      setIsLoadingDistance(true);
      
      // 1. Obter coordenadas do endereço do usuário (usando CEP ou endereço completo se disponível)
      const userAddressString = `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city}, ${address.state}, ${zipCode}`;
      const userCoords = await locationService.getCoordinatesFromAddress(userAddressString);
      
      const userFinalCoords = userCoords || await locationService.getCoordinatesFromAddress(zipCode);
      if (!userFinalCoords) {
        throw new Error('Não foi possível localizar o endereço do cliente');
      }

      // 2. Obter coordenadas do produtor
      if (!producerId) {
        const producerCoordsFallback: GeoCoordinates = { latitude: -23.55052, longitude: -46.633309 };
        const distance = await locationService.getRoadDistance(userFinalCoords, producerCoordsFallback);
        setEstimatedDistance(distance);
        return;
      }

      const producer = await producerService.getProducerById(producerId);
      if (!producer || !producer.address || !producer.address.latitude || !producer.address.longitude) {
        // Fallback para localização padrão se não encontrar o produtor ou coordenadas
        logger.warn(`Localização do produtor ${producerId} não encontrada. Usando fallback.`);
        const producerCoordsFallback: GeoCoordinates = { latitude: -23.55052, longitude: -46.633309 };
        const distance = await locationService.getRoadDistance(userFinalCoords, producerCoordsFallback);
        setEstimatedDistance(distance);
        return;
      }

      const producerCoords: GeoCoordinates = { 
        latitude: producer.address.latitude, 
        longitude: producer.address.longitude 
      };
      
      // 3. Calcular distância real (estrada)
      const distance = await locationService.getRoadDistance(userFinalCoords, producerCoords);
      setEstimatedDistance(distance);
    } catch (error) {
      logger.error('Erro ao calcular distância real:', error instanceof Error ? error : new Error(String(error)));
      setEstimatedDistance(5.0); // Fallback
    } finally {
      setIsLoadingDistance(false);
    }
  };

  const handlePlaceOrder = () => {
    // Validações
    if (!validationService.validateAddress(address)) {
      Alert.alert('Erro', 'Por favor, verifique os campos de endereço e tente novamente');
      return;
    }

    if (paymentMethod === 'creditCard') {
      // Validar cartão de crédito
      if (!cardNumber || !cardholderName || !expirationDate || !cvv) {
        Alert.alert('Erro', 'Por favor, preencha todos os dados do cartão');
        return;
      }

      if (cardNumber.replace(/\s/g, '').length !== 16) {
        Alert.alert('Erro', 'Número do cartão inválido');
        return;
      }

      if (cvv.length < 3) {
        Alert.alert('Erro', 'Código de segurança inválido');
        return;
      }
    }

    // Simulação de processamento
    setIsProcessing(true);

    const placeOrder = async () => {
      try {
        const orderService = new OrderService();
        const paymentService = PaymentService.getInstance();
        
        // Criar objeto do pedido com os dados de agendamento e informações do cliente
        const orderData: CreateOrderInput = {
          userId: user?.id || 'anonymous',
          customerName: user?.name || 'Cliente',
          customerPhone: (user as any)?.phone || '',
          items: items.map(i => ({
            id: i.id,
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity
          })),
          totalAmount: totalWithDelivery,
          status: 'pending', // Alterado para pending até o pagamento ser confirmado
          paymentMethod: { type: paymentMethod === 'pix' ? 'pix' : 'credit_card', id: 'pm_card_visa' },
          deliveryAddress: {
            id: `addr_${Date.now()}`,
            street: address.street,
            number: address.number,
            complement: address.complement,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            reference: address.reference,
          },
          scheduledDelivery,
          isScheduledOrder: !!scheduledDelivery,
          producerId: producerId,
          deliveryPersonId: undefined, // Será atribuído quando um entregador aceitar
          paymentDetails: {
            productAmount: paymentSplit.subtotal,
            deliveryFee: paymentSplit.deliveryFee,
            appFee: paymentSplit.appFee,
            producerAmount: paymentSplit.producerAmount,
            platformMaintenanceFee: paymentSplit.platformMaintenanceFee,
            totalAmount: paymentSplit.total
          }
        };

        const createdOrder = await orderService.createOrder(orderData);

        // Processar pagamento conforme o método escolhido
        if (paymentMethod === 'creditCard') {
          const [expMonth, expYear] = expirationDate.split('/');
          const paymentResult = await paymentService.processPaymentWithSplit(createdOrder.id, {
            number: cardNumber.replace(/\s/g, ''),
            expMonth: parseInt(expMonth),
            expYear: parseInt('20' + expYear), // Assumindo formato YY
            cvc: cvv,
            holderName: cardholderName,
          });

          if (!paymentResult.success) {
            throw new Error('Falha ao processar pagamento com cartão');
          }

          // Após pagamento bem-sucedido, marcar como 'ready' para disparar atribuição de motorista
          await orderService.updateOrderStatus(createdOrder.id, 'ready');

          // Limpar carrinho e navegar para tela de sucesso
          clearCart();
          const updatedOrder = await orderService.getOrderById(createdOrder.id);
          navigation.navigate('OrderCompleted', { order: updatedOrder || createdOrder });
        } else if (paymentMethod === 'pix') {
          const pixResult = await paymentService.processPixPayment(createdOrder.id);
          
          if (!pixResult.success || !pixResult.qrCode) {
            throw new Error('Falha ao gerar QR Code PIX');
          }

          setPixData({
            qrCode: pixResult.qrCode,
            expiresAt: pixResult.expiresAt || 0,
            paymentIntentId: pixResult.paymentIntentId || '',
          });
          setShowPixModal(true);
        } else {
          // Pagamento em dinheiro ou outro método manual
          clearCart();
          navigation.navigate('OrderCompleted', { order: createdOrder });
        }

      } catch (error: any) {
        Alert.alert('Erro', 'Não foi possível processar seu pedido: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    };

    placeOrder();
  };

  // Verificar se o carrinho está vazio
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>Seu carrinho está vazio</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Home')}
          style={styles.emptyButton}
        >
          Continuar Comprando
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} testID="checkout-screen">
      {/* Resumo do pedido */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Resumo do Pedido</Text>

          {/* Lista de itens do carrinho */}
          {items.map((item: CartItem) => (
            <View key={item.id} style={styles.cartItem}>
              <Text style={styles.itemText}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.itemPrice}>
                R$ {(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <Divider style={styles.divider} />

          {/* Informações de entrega agendada */}
          {scheduledDelivery && (
            <>
              <View style={styles.scheduledDelivery}>
                <Text style={styles.subsectionTitle}>Detalhes da Entrega</Text>

                <View style={styles.scheduleInfo}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#FF69B4"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoText}>
                    {new Date(scheduledDelivery.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.scheduleInfo}>
                  <Ionicons name="time-outline" size={20} color="#FF69B4" style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    {scheduledDelivery.type === 'scheduled'
                      ? `Entre ${scheduledDelivery.timeSlot?.replace(' - ', ' e ')}`
                      : `Horário específico: ${scheduledDelivery.customTime}`}
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
                    {scheduledDelivery.preparationHours} hora
                    {scheduledDelivery.preparationHours > 1 ? 's' : ''}
                  </Text>
                </View>

                {scheduledDelivery.specialInstructions && (
                  <View style={styles.scheduleInfo}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#FF69B4"
                      style={styles.infoIcon}
                    />
                    <Text style={styles.infoText}>
                      Instruções: {scheduledDelivery.specialInstructions}
                    </Text>
                  </View>
                )}

                <Button
                  mode="outlined"
                  style={styles.changeScheduleButton}
                  onPress={() => navigation.navigate('ScheduleDelivery')}
                >
                  Alterar Agendamento
                </Button>
              </View>

              <Divider style={styles.divider} />
            </>
          )}

          <PaymentSummary
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            paymentMethod={paymentMethod === 'pix' ? 'pix' : 'credit_card'}
            showSplitDetails={true}
          />
        </Card.Content>
      </Card>

      {/* Endereço de entrega */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Endereço de Entrega</Text>
            <Chip icon="star" style={styles.savedAddressChip}>
              Endereço Salvo
            </Chip>
          </View>

          <TextInput
            mode="outlined"
            label="CEP"
            style={styles.input}
            value={address.zipCode}
            onChangeText={handleZipCodeChange}
            keyboardType="numeric"
            maxLength={9}
            testID="cep-input"
            outlineColor="#e0e0e0"
            activeOutlineColor="#FF69B4"
          />

          <TextInput
            mode="outlined"
            label="Rua"
            style={styles.input}
            value={address.street}
            onChangeText={text => setAddress({ ...address, street: text })}
            testID="endereco-input"
            outlineColor="#e0e0e0"
            activeOutlineColor="#FF69B4"
          />

          <View style={styles.rowInputs}>
            <TextInput
              mode="outlined"
              label="Número"
              style={[styles.input, styles.numberInput]}
              value={address.number}
              onChangeText={text => setAddress({ ...address, number: text })}
              keyboardType="numeric"
              testID="numero-input"
              outlineColor="#e0e0e0"
              activeOutlineColor="#FF69B4"
            />

            <TextInput
              mode="outlined"
              label="Complemento"
              style={[styles.input, styles.complementInput]}
              value={address.complement}
              onChangeText={text => setAddress({ ...address, complement: text })}
              testID="complemento-input"
              outlineColor="#e0e0e0"
              activeOutlineColor="#FF69B4"
            />
          </View>

          <TextInput
            mode="outlined"
            label="Bairro"
            style={styles.input}
            value={address.neighborhood}
            onChangeText={text => setAddress({ ...address, neighborhood: text })}
            testID="bairro-input"
            outlineColor="#e0e0e0"
            activeOutlineColor="#FF69B4"
          />

          <View style={styles.rowInputs}>
            <TextInput
              mode="outlined"
              label="Cidade"
              style={[styles.input, styles.cityInput]}
              value={address.city}
              onChangeText={text => setAddress({ ...address, city: text })}
              testID="cidade-input"
              outlineColor="#e0e0e0"
              activeOutlineColor="#FF69B4"
            />

            <TextInput
              mode="outlined"
              label="Estado"
              style={[styles.input, styles.stateInput]}
              value={address.state}
              onChangeText={text => setAddress({ ...address, state: text })}
              maxLength={2}
              testID="estado-input"
              outlineColor="#e0e0e0"
              activeOutlineColor="#FF69B4"
            />
          </View>

          <TextInput
            mode="outlined"
            label="Ponto de referência (opcional)"
            style={styles.input}
            value={address.reference}
            onChangeText={text => setAddress({ ...address, reference: text })}
            outlineColor="#e0e0e0"
            activeOutlineColor="#FF69B4"
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        style={styles.finishButton}
        contentStyle={styles.finishButtonContent}
        labelStyle={styles.finishButtonLabel}
        onPress={() => setPaymentStepStarted(true)}
        icon="arrow-right"
        testID="continuar-pagamento-button"
      >
        Continuar para Pagamento
      </Button>

      {paymentStepStarted && (
        <Card style={styles.card}>
          <Card.Content>
            <View testID="pagamento-screen">
              <Text style={styles.sectionTitle}>Forma de Pagamento</Text>

              <View style={styles.paymentOptions}>
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === 'creditCard' && styles.selectedPaymentOption,
                  ]}
                  onPress={() => setPaymentMethod('creditCard')}
                  testID="cartao-credito-option"
                >
                  <Ionicons
                    name="card-outline"
                    size={24}
                    color={paymentMethod === 'creditCard' ? '#fff' : '#333'}
                  />
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === 'creditCard' && styles.selectedPaymentOptionText,
                    ]}
                  >
                    Cartão de Crédito
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === 'pix' && styles.selectedPaymentOption,
                  ]}
                  onPress={() => setPaymentMethod('pix')}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={24}
                    color={paymentMethod === 'pix' ? '#fff' : '#333'}
                  />
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === 'pix' && styles.selectedPaymentOptionText,
                    ]}
                  >
                    PIX
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === 'money' && styles.selectedPaymentOption,
                  ]}
                  onPress={() => setPaymentMethod('money')}
                >
                  <Ionicons
                    name="cash-outline"
                    size={24}
                    color={paymentMethod === 'money' ? '#fff' : '#333'}
                  />
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === 'money' && styles.selectedPaymentOptionText,
                    ]}
                  >
                    Dinheiro
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'creditCard' && (
                <View style={styles.creditCardForm}>
                  <PaymentCardForm 
                    loading={isProcessing}
                    showSubmitButton={false}
                    onCardDataChange={(cardData) => {
                      setCardNumber(cardData.number);
                      setCardholderName(cardData.holderName);
                      setExpirationDate(cardData.expiryDate);
                      setCvv(cardData.cvc);
                      setCardBrand(cardData.brand);
                    }}
                    onSubmit={() => {}} // Não utilizado aqui
                  />
                </View>
              )}

              {paymentMethod === 'pix' && (
                <View style={styles.pixInfo}>
                  <Text style={styles.pixInfoText}>
                    O QR Code para pagamento será exibido após a confirmação do pedido.
                  </Text>
                </View>
              )}

              {paymentMethod === 'money' && (
                <View style={styles.moneyInfo}>
                  <Text style={styles.moneyInfoText}>
                    Por favor, tenha o valor exato para facilitar a entrega.
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Botão finalizar */}
      <Button
        mode="contained"
        style={styles.finishButton}
        contentStyle={styles.finishButtonContent}
        labelStyle={styles.finishButtonLabel}
        onPress={handlePlaceOrder}
        loading={isProcessing}
        disabled={isProcessing}
        icon={isProcessing ? undefined : 'check'}
        testID="finalizar-pagamento-button"
      >
        {isProcessing ? 'Processando...' : 'Finalizar Pedido'}
      </Button>

      <View style={styles.bottomSpace} />

      <Portal>
        <Modal
          visible={showPixModal}
          onDismiss={() => setShowPixModal(false)}
          contentContainerStyle={styles.pixModal}
        >
          <Text style={styles.pixModalTitle}>Pagamento via PIX</Text>
          <Text style={styles.pixModalSubtitle}>
            Escaneie o QR Code abaixo ou copie o código para pagar
          </Text>

          {pixData?.qrCode && (
            <View style={styles.qrCodeContainer}>
              <Image
                source={{ uri: pixData.qrCode }}
                style={styles.qrCodeImage}
                resizeMode="contain"
              />
            </View>
          )}

          <Button
            mode="outlined"
            onPress={async () => {
              await Clipboard.setStringAsync(pixData?.qrCode || '');
              Alert.alert('Copiado', 'Código PIX copiado para a área de transferência');
            }}
            style={styles.pixCopyButton}
          >
            Copiar Código PIX
          </Button>

          <Text style={styles.pixTimer}>
            Expira em: {pixData?.expiresAt ? new Date(pixData.expiresAt * 1000).toLocaleTimeString() : '--:--'}
          </Text>

          <Button
            mode="contained"
            onPress={async () => {
              setIsProcessing(true);
              try {
                const orderService = new OrderService();
                const stripeService = StripeService.getInstance();
                const userId = user?.id || 'anonymous';
                
                // 1. Tentar encontrar o pedido pelo paymentIntentId do Stripe
                let targetOrder = null;
                
                if (pixData?.paymentIntentId) {
                  const orders = await orderService.getUserOrders(userId);
                  targetOrder = orders.find((o: any) => 
                    o.paymentDetails?.stripePaymentIntentId === pixData.paymentIntentId ||
                    o.stripePaymentIntentId === pixData.paymentIntentId
                  );
                }

                // 2. Se não encontrar pelo intent, pegar o pedido mais recente que esteja pendente
                if (!targetOrder) {
                  const orders = await orderService.getUserOrders(userId);
                  targetOrder = orders
                    .filter((o: any) => o.status === 'pending')
                    .sort((a: any, b: any) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0];
                }

                if (!pixData?.paymentIntentId) {
                  setShowPixModal(false);
                  Alert.alert(
                    'Pedido em Processamento',
                    'Não conseguimos confirmar seu pagamento instantaneamente, mas não se preocupe! Assim que o PIX for confirmado, seu pedido seguirá para produção.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Orders') }]
                  );
                  return;
                }

                const paymentStatus = await stripeService.checkPaymentStatus(pixData.paymentIntentId);

                if (paymentStatus !== 'succeeded') {
                  Alert.alert(
                    'Pagamento Pendente',
                    'Seu pagamento ainda não foi confirmado. Você pode acompanhar em Pedidos.'
                  );
                  return;
                }

                if (targetOrder) {
                  setShowPixModal(false);
                  clearCart();

                  const updatedOrder = await orderService.getOrderById(targetOrder.id);
                  navigation.navigate('OrderCompleted', { order: updatedOrder || targetOrder });
                } else {
                  setShowPixModal(false);
                  Alert.alert(
                    'Pedido em Processamento',
                    'Não conseguimos confirmar seu pagamento instantaneamente, mas não se preocupe! Assim que o PIX for confirmado, seu pedido seguirá para produção.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Orders') }]
                  );
                }
              } catch (err) {
                logger.error('Erro ao confirmar PIX:', err instanceof Error ? err : new Error(String(err)));
                setShowPixModal(false);
                Alert.alert('Erro', 'Ocorreu um problema ao confirmar seu pagamento. Por favor, verifique seus pedidos em instantes.');
                navigation.navigate('Orders');
              } finally {
                setIsProcessing(false);
              }
            }}
            style={styles.pixDoneButton}
            loading={isProcessing}
            disabled={isProcessing}
          >
            Já realizei o pagamento
          </Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#555',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  savedAddressChip: {
    backgroundColor: '#e9f5ff',
  },
  input: {
    marginBottom: 12,
    fontSize: 16,
    height: 50,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numberInput: {
    width: '30%',
  },
  complementInput: {
    width: '67%',
  },
  cityInput: {
    width: '73%',
  },
  stateInput: {
    width: '24%',
  },
  expirationInput: {
    width: '48%',
  },
  cvvInput: {
    width: '48%',
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentOption: {
    flex: 1,
    marginHorizontal: 4,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
  },
  selectedPaymentOption: {
    backgroundColor: '#fff0f6',
    borderColor: '#FF69B4',
    borderWidth: 2,
  },
  paymentOptionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectedPaymentOptionText: {
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  creditCardForm: {
    marginTop: 8,
  },
  pixInfo: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  pixInfoText: {
    color: '#555',
    textAlign: 'center',
  },
  moneyInfo: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  moneyInfoText: {
    color: '#555',
    textAlign: 'center',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#ddd',
  },
  finishButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 30,
    marginBottom: 16,
  },
  finishButtonContent: {
    height: 56,
  },
  finishButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpace: {
    height: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
  },
  emptyButton: {
    backgroundColor: '#FF69B4',
    marginTop: 16,
  },
  pixModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  pixModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  pixModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrCodeContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  qrCodeImage: {
    width: 180,
    height: 180,
  },
  pixCopyButton: {
    width: '100%',
    marginBottom: 12,
    borderColor: '#FF69B4',
  },
  pixTimer: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  pixDoneButton: {
    width: '100%',
    backgroundColor: '#FF69B4',
  },
  scheduledDelivery: {
    backgroundColor: '#fff9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
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
  changeScheduleButton: {
    marginTop: 8,
    borderColor: '#FF69B4',
    borderWidth: 1,
  },
});
