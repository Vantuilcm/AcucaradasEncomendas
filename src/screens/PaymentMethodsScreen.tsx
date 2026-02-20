import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  Divider,
  Portal,
  Modal,
  SegmentedButtons,
  Chip,
  TextInput,
  HelperText,
} from 'react-native-paper';
import { useStripe } from '@stripe/stripe-react-native';
import { PaymentService } from '../services/PaymentService';
import { StripeService } from '../services/StripeService';
import { PaymentCard, PixKey } from '../types/Payment';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { PaymentCardForm } from '../components/PaymentCardForm';

type PaymentMethodType = 'card' | 'pix';

export const PaymentMethodsScreen: React.FC = () => {
  const { user } = useAuth();
  const stripe = useStripe();
  const { createPaymentMethod } = stripe;

  useEffect(() => {
    if (stripe) {
      StripeService.getInstance().initialize(stripe);
    }
  }, [stripe]);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'email' | 'phone'>('cpf');

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const userId = (user?.uid ?? user?.id) as string | undefined;

      if (!userId) {
        Alert.alert('Erro', 'Usuário não identificado. Faça login novamente.');
        setCards([]);
        setPixKeys([]);
        return;
      }
      const [userCards, userPixKeys] = await Promise.all([
        PaymentService.getInstance().getPaymentCards(userId),
        PaymentService.getInstance().getPixKeys(userId),
      ]);
      setCards(userCards);
      setPixKeys(userPixKeys);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar seus métodos de pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadPaymentMethods();
    setRefreshing(false);
  }, []);

  const handleAddCard = async (cardData: {
    number: string;
    expiryDate: string;
    cvc: string;
    holderName: string;
    brand: string;
  }) => {
    try {
      setLoading(true);
      const userId = user?.uid ?? user?.id as string;
      const userName = user?.displayName ?? user?.nome ?? 'Cliente';

      // Criar cliente no Stripe se ainda não existir
      const stripeService = StripeService.getInstance();
      const customerId = await stripeService.createCustomer(
        user!.email!,
        userName
      );

      // Criar PaymentMethod no Stripe de forma segura
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: cardData.holderName,
            email: user!.email!,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Adicionar método de pagamento ao cliente
      await stripeService.addPaymentMethod(customerId, paymentMethod.id, {
        number: cardData.number,
        expiryDate: cardData.expiryDate,
        cvc: cardData.cvc,
        holderName: cardData.holderName,
        type: 'credit',
        brand: cardData.brand,
        isDefault: cards.length === 0,
      });

      // Salvar cartão no Firestore
      const last4 = cardData.number.replace(/\s/g, '').slice(-4);
      const [expMonthStr, expYearStr] = cardData.expiryDate.split('/');
      const expMonth = parseInt(expMonthStr);
      const expYear = parseInt(`20${expYearStr}`);
      await PaymentService.getInstance().addPaymentCard({
        userId,
        last4,
        brand: cardData.brand,
        expiryMonth: expMonth,
        expiryYear: expYear,
        isDefault: cards.length === 0,
      });

      setModalVisible(false);
      loadPaymentMethods();
      Alert.alert('Sucesso', 'Cartão adicionado com sucesso!');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível adicionar o cartão.';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPixKey = async () => {
    try {
      setLoading(true);
      const userId = user?.uid ?? user?.id as string;
      await PaymentService.getInstance().addPixKey({
        userId,
        type: pixKeyType,
        value: pixKey,
        isDefault: pixKeys.length === 0,
      });
      setModalVisible(false);
      loadPaymentMethods();
      Alert.alert('Sucesso', 'Chave PIX adicionada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar a chave PIX.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCard = async (cardId: string) => {
    try {
      setLoading(true);
      await PaymentService.getInstance().removePaymentCard(cardId);
      loadPaymentMethods();
      Alert.alert('Sucesso', 'Cartão removido com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover o cartão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultCard = async (cardId: string) => {
    try {
      setLoading(true);
      const userId = user?.uid ?? user?.id as string;
      await PaymentService.getInstance().setDefaultCard(userId, cardId);
      loadPaymentMethods();
      Alert.alert('Sucesso', 'Cartão padrão definido com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível definir o cartão como padrão.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePixKey = async (pixKeyId: string) => {
    try {
      setLoading(true);
      await PaymentService.getInstance().removePixKey(pixKeyId);
      loadPaymentMethods();
      Alert.alert('Sucesso', 'Chave PIX removida com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover a chave PIX.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultPixKey = async (pixKeyId: string) => {
    try {
      setLoading(true);
      const userId = (user?.uid ?? user?.id) as string;
      await PaymentService.getInstance().setDefaultPixKey(userId, pixKeyId);
      loadPaymentMethods();
      Alert.alert('Sucesso', 'Chave PIX padrão definida com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível definir a chave PIX como padrão.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SegmentedButtons
          value={selectedMethod}
          onValueChange={value => setSelectedMethod(value as PaymentMethodType)}
          buttons={[
            { value: 'card', label: 'Cartões' },
            { value: 'pix', label: 'PIX' },
          ]}
          style={styles.segmentedButtons}
        />

        {selectedMethod === 'card' ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.title}>
                Meus Cartões
              </Text>
              {cards.length === 0 ? (
                <Text style={styles.emptyText}>Você ainda não adicionou nenhum cartão.</Text>
              ) : (
                cards.map(card => (
                  <View key={card.id} style={styles.cardItem}>
                    <View style={styles.cardInfo}>
                      <Text variant="titleMedium">{`•••• •••• •••• ${card.last4}`}</Text>
                      <Text variant="bodyMedium">
                        {card.brand} • {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                      </Text>
                    </View>
                    <View style={styles.cardActions}>
                      {!card.isDefault && (
                        <IconButton
                          icon="star-outline"
                          onPress={() => handleSetDefaultCard(card.id)}
                          size={20}
                        />
                      )}
                      <IconButton
                        icon="delete"
                        onPress={() => handleRemoveCard(card.id)}
                        size={20}
                      />
                    </View>
                  </View>
                ))
              )}
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.title}>
                Minhas Chaves PIX
              </Text>
              {pixKeys.length === 0 ? (
                <Text style={styles.emptyText}>Você ainda não adicionou nenhuma chave PIX.</Text>
              ) : (
                pixKeys.map(key => (
                  <View key={key.id} style={styles.pixKeyItem}>
                    <View style={styles.pixKeyInfo}>
                      <Text variant="titleMedium">
                        {key.type === 'cpf'
                          ? key.value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                          : key.type === 'phone'
                            ? key.value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                            : key.value}
                      </Text>
                      <Text variant="bodyMedium" style={styles.pixKeyType}>
                        {key.type === 'cpf' ? 'CPF' : key.type === 'email' ? 'E-mail' : 'Telefone'}
                      </Text>
                    </View>
                    <View style={styles.pixKeyActions}>
                      {!key.isDefault && (
                        <IconButton
                          icon="star-outline"
                          onPress={() => handleSetDefaultPixKey(key.id)}
                          size={20}
                        />
                      )}
                      <IconButton
                        icon="delete"
                        onPress={() => handleRemovePixKey(key.id)}
                        size={20}
                      />
                    </View>
                  </View>
                ))
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          {selectedMethod === 'card' ? (
            <PaymentCardForm onSubmit={handleAddCard} loading={loading} />
          ) : (
            <View style={styles.pixForm}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                Adicionar Chave PIX
              </Text>
              <SegmentedButtons
                value={pixKeyType}
                onValueChange={value => setPixKeyType(value as typeof pixKeyType)}
                buttons={[
                  { value: 'cpf', label: 'CPF' },
                  { value: 'email', label: 'E-mail' },
                  { value: 'phone', label: 'Telefone' },
                ]}
                style={styles.segmentedButtons}
              />
              <TextInput
                label="Chave PIX"
                value={pixKey}
                onChangeText={setPixKey}
                style={styles.input}
                keyboardType={
                  pixKeyType === 'cpf'
                    ? 'numeric'
                    : pixKeyType === 'email'
                      ? 'email-address'
                      : 'phone-pad'
                }
                placeholder={
                  pixKeyType === 'cpf'
                    ? '000.000.000-00'
                    : pixKeyType === 'email'
                      ? 'seu@email.com'
                      : '(00) 00000-0000'
                }
              />
              <Button
                mode="contained"
                onPress={handleAddPixKey}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
              >
                Adicionar Chave PIX
              </Button>
            </View>
          )}
        </Modal>
      </Portal>

      <Button mode="contained" onPress={() => setModalVisible(true)} style={styles.addButton}>
        Adicionar {selectedMethod === 'card' ? 'Cartão' : 'Chave PIX'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
  },
  title: {
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginVertical: 16,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardInfo: {
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
  },
  modal: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    margin: 16,
  },
  segmentedButtons: {
    margin: 16,
  },
  input: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  pixForm: {
    padding: 16,
  },
  pixKeyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pixKeyInfo: {
    flex: 1,
  },
  pixKeyType: {
    color: theme.colors.onSurfaceVariant,
  },
  pixKeyActions: {
    flexDirection: 'row',
  },
});
