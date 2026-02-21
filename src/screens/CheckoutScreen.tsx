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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { PaymentSummary } from '../components/PaymentSummary';
import { ValidationService } from '../services/validationService';
import { Card, Button, Divider, IconButton, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { DeliverySchedule } from '../types/Order';

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { total, items, clearCart } = useCart();
  const validationService = ValidationService.getInstance();

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

  const [paymentMethod, setPaymentMethod] = useState('creditCard');
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Obter dados do agendamento da navegação
  const scheduledDelivery: DeliverySchedule | undefined = route.params?.scheduledDelivery;

  // Verificar se tem agendamento e redirecionar se não tiver
  useEffect(() => {
    if (!scheduledDelivery && items.length > 0) {
      navigation.navigate('ScheduleDelivery');
    }
  }, [scheduledDelivery, items, navigation]);

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

    // Simular envio do pedido
    setTimeout(() => {
      setIsProcessing(false);

      // Criar objeto do pedido com os dados de agendamento
      const order = {
        items,
        total,
        address,
        paymentMethod,
        scheduledDelivery,
        isScheduledOrder: !!scheduledDelivery,
        createdAt: new Date().toISOString(),
      };

      // Limpar carrinho e navegar para tela de sucesso
      clearCart();
      navigation.navigate('OrderCompleted', { order });
    }, 2000);
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
    <ScrollView style={styles.container}>
      {/* Resumo do pedido */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Resumo do Pedido</Text>

          {/* Lista de itens do carrinho */}
          {items.map(item => (
            <View key={item.product.id} style={styles.cartItem}>
              <Text style={styles.itemText}>
                {item.quantity}x {item.product.name}
              </Text>
              <Text style={styles.itemPrice}>
                R$ {(item.product.price * item.quantity).toFixed(2)}
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
                    Tempo de preparo: {scheduledDelivery.preparationHours} hora
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
            subtotal={items.reduce((acc, item) => acc + item.product.price * item.quantity, 0)}
            deliveryFee={10.0}
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

          {paymentMethod === 'money' && (
            <View style={styles.moneyInfo}>
              <Text style={styles.moneyInfoText}>
                Por favor, tenha o valor exato para facilitar a entrega.
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
        loading={isProcessing}
        disabled={isProcessing}
        icon={isProcessing ? undefined : 'check'}
      >
        {isProcessing ? 'Processando...' : 'Finalizar Pedido'}
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
    width: '32%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedPaymentOption: {
    backgroundColor: '#FF69B4',
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
