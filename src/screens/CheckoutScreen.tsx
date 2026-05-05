import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { PaymentSummary } from '../components/PaymentSummary';
import { ValidationService } from '../services/validationService';
import { Card, Button, Divider, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { OrderItem } from '../types/Order';
import { OrderService } from '../services/OrderService';
import { PaymentService } from '../services/PaymentService';
import { ProductService } from '../services/ProductService';
import { StoreAvailabilityService } from '../services/StoreAvailabilityService';
import { StoreService } from '../services/StoreService';
import { NotificationService } from '../services/NotificationService';
import { SalesAutomationService } from '../services/SalesAutomationService';
import { loggingService } from '../services/LoggingService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp, getDb } from '../config/firebase';
import { useStripe } from '@stripe/stripe-react-native';

import { ENV } from '../config/env';

// Usa variável de ambiente explícita em vez de apenas __DEV__
const ENABLE_STRIPE = ENV.EXPO_PUBLIC_ENABLE_STRIPE_PAYMENTS === 'true';

type CheckoutScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Checkout'>;
type CheckoutScreenRouteProp = RouteProp<RootStackParamList, 'Checkout'>;

export default function CheckoutScreen() {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const route = useRoute<CheckoutScreenRouteProp>();
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const validationService = ValidationService.getInstance();
  const orderService = OrderService.getInstance();
  const paymentService = PaymentService.getInstance();
  const storeService = new StoreService();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

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

  const [paymentMethod, setPaymentMethod] = useState<'creditCard' | 'pix'>('creditCard');
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitingWebhook, setWaitingWebhook] = useState(false);

  // Obter dados do agendamento da navegação
  const scheduledDelivery = route.params?.scheduledDelivery;

  // Verificar se tem agendamento e redirecionar se não tiver
  useEffect(() => {
    if (!scheduledDelivery && cart.items.length > 0) {
      navigation.navigate('ScheduleDelivery');
    }
  }, [scheduledDelivery, cart.items.length, navigation]);

  // Efeito para aplicar CEP automático de endereços salvos (simulação)
  useEffect(() => {
    // Simular carregamento de endereço salvo do usuário
    const loadSavedAddress = async () => {
      // Aqui, em uma implementação real, você carregaria do banco de dados ou API
      const savedAddress = {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 101',
        neighborhood: 'Jardim Primavera',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        reference: 'Próximo ao Mercado Central',
      };

      // Em uma implementação real, você verificaria se há endereço salvo
      // Simular um delay para carregar o endereço
      setTimeout(() => {
        setAddress(savedAddress);
      }, 500);
    };

    loadSavedAddress();
  }, []);

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
  };

  const handlePlaceOrder = async () => {
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

    if (!user) {
      Alert.alert('Erro', 'Você precisa estar autenticado para finalizar o pedido.');
      return;
    }

    try {
      setIsProcessing(true);

      // Validação de Disponibilidade da Loja
      const producerId = cart.items[0]?.producerId;
      const store = producerId 
        ? await storeService.getStoreByProducerId(producerId)
        : await storeService.getDefaultStore();

      if (store) {
        let requestedDate: Date | undefined;
        if (scheduledDelivery && scheduledDelivery.date) {
          requestedDate = new Date(scheduledDelivery.date);
          if (scheduledDelivery.type === 'scheduled' && scheduledDelivery.timeSlot) {
            // Ex: "09:00 - 11:00" -> Pega o início "09:00"
            const startTime = scheduledDelivery.timeSlot.split(' - ')[0];
            if (startTime) {
              const [hours, minutes] = startTime.split(':').map(Number);
              requestedDate.setHours(hours, minutes, 0, 0);
            }
          } else if (scheduledDelivery.type === 'custom' && scheduledDelivery.customTime) {
            const [hours, minutes] = scheduledDelivery.customTime.split(':').map(Number);
            requestedDate.setHours(hours, minutes, 0, 0);
          }
        }

        const availability = StoreAvailabilityService.validateOrderTiming(store, requestedDate);
        if (!availability.isValid) {
          Alert.alert(
            'Loja Indisponível', 
            availability.message || 'A loja não pode aceitar pedidos neste horário.'
          );
          setIsProcessing(false);
          return;
        }
      }

      const userId = (user as any)?.id || (user as any)?.uid;
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const orderItems: OrderItem[] = cart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        notes: item.notes,
      }));

      const mappedPaymentMethod = paymentMethod === 'creditCard' ? 'credit_card' : 'pix';

      // Registrar início do checkout para automação
      const automationService = SalesAutomationService.getInstance();
      await automationService.logAutomationEvent(userId, 'CHECKOUT_STARTED', {
        cartTotal,
        itemCount: cart.items.length
      });

      // 1. Validar estoque antes de qualquer operação
      const productService = ProductService.getInstance();
      for (const item of cart.items) {
        const product = await productService.consultarProduto(item.productId);
        if (!product || !product.temEstoque || (product.estoque !== undefined && product.estoque < item.quantity)) {
          Alert.alert('Erro', `O produto ${item.name} não possui estoque suficiente.`);
          setIsProcessing(false);
          return;
        }
      }

      // 2. Criar pedido (Status Inicial: pending)
      const subtotalProducts = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const deliveryFee = 10;
      
      const newOrder = await orderService.createOrder({
        userId,
        items: orderItems,
        subtotalProducts: subtotalProducts, // CAMPO NOVO PARA O MARKETPLACE
        deliveryFee: deliveryFee,           // CAMPO NOVO PARA O MARKETPLACE
        totalAmount: cartTotal,
        status: 'pending',
        paymentMethod: {
          type: mappedPaymentMethod,
          id: '',
        },
        deliveryAddress: {
          id: 'manual',
          street: address.street,
          number: address.number,
          complement: address.complement || undefined,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          reference: address.reference || undefined,
        },
        scheduledDelivery,
        isScheduledOrder: !!scheduledDelivery,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        producerId: cart.items[0]?.producerId || '',
        // deliveryDriverId será preenchido posteriormente pelo sistema de logística
      } as any);

      let orderForSuccess = newOrder;

      try {
        // 3. Processar Pagamento
        if (paymentMethod === 'creditCard') {
          if (ENABLE_STRIPE) {
            console.log('🚀 [Fase 2.2] ENABLE_STRIPE ativado, preparando chamada ao backend (createPaymentIntent)...');
            try {
              // --- VALIDAÇÕES CRÍTICAS ---
              const amountInCents = Math.round(cartTotal * 100);
              const finalOrderId = newOrder.id;
              
              if (!finalOrderId) throw new Error("ID do pedido (orderId) está indefinido ou nulo");
              if (!amountInCents || amountInCents <= 0) throw new Error("Valor do pedido (amount) inválido");
              
              const safeUser = user || {};
              const userIdForLog = (safeUser as any)?.uid || (safeUser as any)?.id || 'anonimo';
              const userNameForLog = (safeUser as any)?.displayName || cardholderName || 'Cliente';

              console.log('📦 [Fase 2.2] Payload de entrada para createPaymentIntent:', {
                amount: amountInCents,
                orderId: finalOrderId,
                userId: userIdForLog,
                userName: userNameForLog
              });

              getApp(); // Garante que o Firebase está inicializado
              const functions = getFunctions();
              const createPaymentIntent = httpsCallable(functions, 'createPaymentIntent');
              
              const response = await createPaymentIntent({
                amount: amountInCents,
                currency: 'brl',
                orderId: finalOrderId,
              });

              // Garantir que a resposta não é undefined
              if (!response || !response.data) {
                throw new Error("Resposta do backend (createPaymentIntent) veio vazia ou indefinida");
              }

              const data = response.data as { clientSecret: string; ephemeralKey?: string; customer?: string };
              console.log('✅ [Fase 2.2] Resposta do backend (PaymentIntent):', {
                hasClientSecret: !!data.clientSecret,
                hasEphemeralKey: !!data.ephemeralKey,
                customerId: data.customer || 'undefined'
              });

              if (!data.clientSecret) {
                throw new Error("clientSecret não retornado pelo backend");
              }

              console.log('⚙️ [Fase 2.2] Inicializando PaymentSheet...');
              
              // --- MONTAGEM DINÂMICA (ANTI-CRASH) ---
              // O SDK do Stripe no React Native sofre crash ("Cannot convert undefined value to object")
              // se enviarmos propriedades com valor undefined. Devemos anexar apenas o que existe.
              const initParams: any = {
                merchantDisplayName: 'Açucaradas Encomendas',
                paymentIntentClientSecret: data.clientSecret
              };

              // Só enviar se não for null nem undefined
              if (data.customer && data.customer !== null) {
                initParams.customerId = data.customer;
              }

              if (data.ephemeralKey && data.ephemeralKey !== null) {
                initParams.customerEphemeralKeySecret = data.ephemeralKey;
              }

              console.log('🧩 [Fase 2.2] Parâmetros do initPaymentSheet (chaves limpas):', Object.keys(initParams));

              // 3. Configurar e inicializar o PaymentSheet
              const initResponse = await initPaymentSheet(initParams);
              console.log('📋 [Fase 2.2] Resposta do initPaymentSheet:', initResponse);

              const { error: initError } = initResponse;

              if (initError) {
                console.error('❌ [Fase 2.2] Erro no initPaymentSheet:', initError);
                throw new Error(initError.message || 'Erro ao inicializar pagamento');
              }

              // 4. Apresentar a gaveta de pagamento
              const { error: presentError } = await presentPaymentSheet();

              if (presentError) {
                console.error('❌ [Fase 2.2] Erro no presentPaymentSheet:', presentError);
                throw new Error(presentError.message || 'Pagamento cancelado ou falhou');
              }

              console.log('✅ [Fase 2.2] Pagamento via PaymentSheet aprovado! Aguardando webhook...');
              setWaitingWebhook(true);

              // 5. Aguardar webhook atualizar o status no Firestore
              const isPaid = await new Promise<boolean>((resolve) => {
                const { doc, onSnapshot } = require('firebase/firestore');
                
                const timeoutId = setTimeout(() => {
                  unsubscribe();
                  resolve(false); // Timeout após 15s, segue fluxo mas com alerta de demora
                }, 15000);

                const unsubscribe = onSnapshot(doc(getDb(), 'orders', newOrder.id), (snapshot: any) => {
                  const currentOrderData = snapshot.data();
                  if (currentOrderData?.status === 'paid' || currentOrderData?.paymentStatus === 'completed') {
                    clearTimeout(timeoutId);
                    unsubscribe();
                    resolve(true);
                  } else if (currentOrderData?.status === 'payment_failed') {
                    clearTimeout(timeoutId);
                    unsubscribe();
                    throw new Error(currentOrderData?.paymentError || 'Pagamento falhou no servidor');
                  }
                });
              });

              if (!isPaid) {
                console.warn('⚠️ Webhook demorou para responder. O pagamento pode estar em processamento.');
                // Lança um erro específico para não confirmar o sucesso e não limpar o carrinho ainda
                throw new Error('TIMEOUT_PENDING');
              }
              setWaitingWebhook(false);
              
              // Recupera o pedido atualizado do banco para avançar
              const updatedOrderFromDb = await orderService.getOrderById(newOrder.id);
              if (updatedOrderFromDb) {
                orderForSuccess = updatedOrderFromDb;
              }
            } catch (stripeErr: any) {
              setWaitingWebhook(false);
              console.error('❌ [Fase 2.2] Erro no fluxo Stripe:', stripeErr);
              throw stripeErr;
            }
          } else {
            // Fluxo antigo de fallback
            const [expMonth, expYear] = expirationDate.split('/');
            const cardDetails = {
              number: cardNumber.replace(/\s/g, ''),
              expMonth: Number(expMonth),
              expYear: Number(`20${expYear}`),
              cvc: cvv,
              holderName: cardholderName,
            };

            const paymentResult = await paymentService.processCreditCardPayment(newOrder.id, cardDetails);
            if (!paymentResult) {
              throw new Error('Pagamento recusado');
            }
          }

          const updatedOrder = await orderService.getOrderById(newOrder.id);
          if (updatedOrder) {
            orderForSuccess = updatedOrder;
          }
        }

        // 4. Baixa automática de estoque (Só após confirmação de pagamento para Cartão ou criação para PIX)
        // Nota: Para PIX, o status continua 'pending' até o webhook confirmar.
        if (paymentMethod === 'creditCard' || paymentMethod === 'pix') {
          for (const item of cart.items) {
            const product = await productService.consultarProduto(item.productId);
            if (product && product.estoque !== undefined) {
              const novoEstoque = Math.max(0, product.estoque - item.quantity);
              await productService.atualizarProduto(item.productId, {
                estoque: novoEstoque,
                temEstoque: novoEstoque > 0
              });
            }
          }
        }

        await clearCart();
        
        // Registrar sucesso para automação
        await SalesAutomationService.getInstance().logAutomationEvent(userId, 'PAYMENT_SUCCESS', {
          orderId: newOrder.id,
          amount: cartTotal
        });

        navigation.navigate('OrderCompleted', { order: orderForSuccess });
      } catch (paymentError: any) {
        setWaitingWebhook(false);

        // Se foi apenas um timeout do webhook, não cancelamos o pedido nem limpamos o carrinho.
        // O webhook continuará processando no backend.
        if (paymentError.message === 'TIMEOUT_PENDING') {
          Alert.alert(
            'Pagamento em Processamento',
            'Seu pagamento está sendo processado pelo banco. Verifique o status do pedido em "Meus Pedidos" em alguns instantes.'
          );
          navigation.navigate('MainTabs', { screen: 'Orders' } as any);
          return;
        }

        // 5. Rollback: Cancelar pedido se o pagamento falhar
        console.error('Falha no pagamento:', paymentError);
        
        // Registrar falha para automação (Recuperação de Venda)
        await SalesAutomationService.getInstance().logAutomationEvent(userId, 'PAYMENT_FAILED', {
          orderId: newOrder.id,
          error: paymentError?.message
        });

        // Alerta operacional imediato para Administradores e Produtor
        try {
          const notificationService = NotificationService.getInstance();
          const producerId = cart.items[0]?.producerId || '';
          
          // Log estruturado para auditoria
          loggingService.error('PAYMENT_FAILED', {
            orderId: newOrder.id,
            userId: (user as any)?.uid || (user as any)?.id,
            producerId,
            error: paymentError?.message || 'Erro desconhecido',
          });

          // Notificação para o Produtor
          if (producerId) {
            await notificationService.createNotification({
              userId: producerId,
              type: 'payment_failed' as any,
              title: '⚠️ Pagamento não concluído',
              message: `Um cliente tentou comprar, mas o pagamento do pedido #${newOrder.id.substring(0, 8)} falhou.`,
              priority: 'high',
              read: false,
              data: { orderId: newOrder.id, error: paymentError?.message }
            });
          }

          // Notificação para Administradores (usando um tópico ou id reservado se existir)
          await notificationService.createNotification({
            userId: 'admin_notifications', 
            type: 'system_update',
            title: '🚨 Alerta Crítico: Falha de Pagamento',
            message: `Falha no processamento do pedido #${newOrder.id.substring(0, 8)}. Verifique o log de erros.`,
            priority: 'high',
            read: false,
            data: { orderId: newOrder.id, error: paymentError?.message }
          });

        } catch (notifError) {
          console.error('Erro ao enviar notificações de falha de pagamento:', notifError);
        }

        await orderService.updateOrderStatus(newOrder.id, 'cancelled');
        Alert.alert('Pagamento Recusado', paymentError.message || 'Não foi possível processar seu pagamento. O pedido foi cancelado.');
      }
    } catch (error: any) {
      console.error('Erro no checkout:', error);
      Alert.alert('Erro', error.message || 'Não foi possível finalizar o pedido. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setWaitingWebhook(false);
    }
  };

  // Verificar se o carrinho está vazio
  if (cart.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>Seu carrinho está vazio</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          style={styles.emptyButton}
        >
          Continuar Comprando
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Resumo do pedido */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Resumo do Pedido</Text>
          <Text style={styles.itemsCountText}>
            Itens: {cart.items.reduce((acc, item) => acc + item.quantity, 0)}
          </Text>

          {/* Lista de itens do carrinho */}
          {cart.items.map(item => (
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
                    color="#6C2BD9"
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
                  <Ionicons name="time-outline" size={20} color="#6C2BD9" style={styles.infoIcon} />
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
                    color="#6C2BD9"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoText}>
                    Tempo de preparo: {scheduledDelivery.preparationHours} hora
                    {scheduledDelivery.preparationHours > 1 ? 's' : ''}
                  </Text>
                </View>

                {scheduledDelivery.specialInstructions && (
                  <View style={styles.scheduleInfo}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#6C2BD9"
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
            subtotal={cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0)}
            deliveryFee={10.0}
            paymentMethod={paymentMethod === 'pix' ? 'pix' : 'credit_card'}
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
            style={styles.input}
            placeholder="CEP"
            value={address.zipCode}
            onChangeText={handleZipCodeChange}
            keyboardType="numeric"
            maxLength={9}
          />

          <TextInput
            style={styles.input}
            placeholder="Rua"
            value={address.street}
            onChangeText={text => setAddress({ ...address, street: text })}
          />

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.numberInput]}
              placeholder="Número"
              value={address.number}
              onChangeText={text => setAddress({ ...address, number: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, styles.complementInput]}
              placeholder="Complemento"
              value={address.complement}
              onChangeText={text => setAddress({ ...address, complement: text })}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Bairro"
            value={address.neighborhood}
            onChangeText={text => setAddress({ ...address, neighborhood: text })}
          />

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.cityInput]}
              placeholder="Cidade"
              value={address.city}
              onChangeText={text => setAddress({ ...address, city: text })}
            />

            <TextInput
              style={[styles.input, styles.stateInput]}
              placeholder="Estado"
              value={address.state}
              onChangeText={text => setAddress({ ...address, state: text })}
              maxLength={2}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Ponto de referência (opcional)"
            value={address.reference}
            onChangeText={text => setAddress({ ...address, reference: text })}
          />
        </Card.Content>
      </Card>

      {/* Método de pagamento */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Forma de Pagamento</Text>

          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'creditCard' && styles.selectedPaymentOption,
              ]}
              onPress={() => setPaymentMethod('creditCard')}
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
                Cartão (Crédito/Débito)
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

          </View>

          {paymentMethod === 'creditCard' && (
            <View style={styles.creditCardForm}>
              <TextInput
                style={styles.input}
                placeholder="Número do Cartão"
                value={cardNumber}
                onChangeText={text => setCardNumber(formatCreditCard(text))}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Nome no Cartão"
                value={cardholderName}
                onChangeText={setCardholderName}
              />

              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, styles.expirationInput]}
                  placeholder="MM/AA"
                  value={expirationDate}
                  onChangeText={text => setExpirationDate(formatExpirationDate(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />

                <TextInput
                  style={[styles.input, styles.cvvInput]}
                  placeholder="CVV"
                  value={cvv}
                  onChangeText={text => setCvv(text.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          )}

          {paymentMethod === 'pix' && (
            <View style={styles.pixInfo}>
              <Text style={styles.pixInfoText}>
                O QR Code para pagamento será exibido após a confirmação do pedido.
              </Text>
            </View>
          )}

        </Card.Content>
      </Card>

      {/* Botão finalizar */}
      <Button
        mode="contained"
        style={styles.finishButton}
        contentStyle={styles.finishButtonContent}
        labelStyle={styles.finishButtonLabel}
        onPress={handlePlaceOrder}
        loading={isProcessing || waitingWebhook}
        disabled={isProcessing || waitingWebhook}
        icon={(isProcessing || waitingWebhook) ? undefined : 'check'}
      >
        {waitingWebhook ? 'Aguardando confirmação...' : isProcessing ? 'Processando...' : 'Finalizar Pedido'}
      </Button>

      <View style={styles.bottomSpace} />
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
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
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
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedPaymentOption: {
    backgroundColor: '#6C2BD9',
  },
  paymentOptionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
  },
  selectedPaymentOptionText: {
    color: '#fff',
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
  itemsCountText: {
    marginBottom: 8,
    color: '#666',
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
    color: '#6C2BD9',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#ddd',
  },
  finishButton: {
    backgroundColor: '#6C2BD9',
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
    backgroundColor: '#6C2BD9',
    marginTop: 16,
  },
  scheduledDelivery: {
    backgroundColor: '#f8f7ff',
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
    borderColor: '#6C2BD9',
    borderWidth: 1,
  },
});
