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
  SegmentedButtons,
  TextInput,
  HelperText,
} from 'react-native-paper';
import { PaymentService } from '../services/PaymentService';
import { PixKey } from '../types/Payment';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';

type PaymentMethodType = 'pix';

export const PaymentMethodsScreen: React.FC = () => {
  const { user } = useAuth();
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('pix');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'email' | 'phone'>('cpf');

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const userId = (user?.uid ?? user?.id) as string;
      const userPixKeys = await PaymentService.getInstance().getPixKeys(userId);
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

  const handleAddPixKey = async () => {
    try {
      setLoading(true);
      const userId = (user?.uid ?? user?.id) as string;
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
          buttons={[{ value: 'pix', label: 'PIX' }]}
          style={styles.segmentedButtons}
        />

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>Minhas Chaves PIX</Text>
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
                      <IconButton icon="star-outline" onPress={() => handleSetDefaultPixKey(key.id)} size={20} />
                    )}
                    <IconButton icon="delete" onPress={() => handleRemovePixKey(key.id)} size={20} />
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Button mode="contained" onPress={() => setModalVisible(true)} style={styles.addButton}>
        Adicionar Chave PIX
      </Button>

      {modalVisible && (
        <View style={styles.modal}> 
          <Text variant="titleLarge" style={styles.modalTitle}>Adicionar Chave PIX</Text>
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
            keyboardType={pixKeyType === 'cpf' ? 'numeric' : pixKeyType === 'email' ? 'email-address' : 'phone-pad'}
            placeholder={pixKeyType === 'cpf' ? '000.000.000-00' : pixKeyType === 'email' ? 'seu@email.com' : '(00) 00000-0000'}
          />
          <HelperText type="info" visible={true}>Pagamentos por cartão não estão disponíveis na Web.</HelperText>
          <Button mode="contained" onPress={handleAddPixKey} loading={loading} disabled={loading} style={styles.submitButton}>
            Adicionar Chave PIX
          </Button>
          <Button mode="text" onPress={() => setModalVisible(false)} style={styles.cancelButton}>
            Cancelar
          </Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  segmentedButtons: { margin: 16 },
  card: { margin: 16 },
  title: { marginBottom: 8 },
  emptyText: { marginTop: 8 },
  pixKeyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  pixKeyInfo: { flex: 1 },
  pixKeyActions: { flexDirection: 'row' },
  pixKeyType: { opacity: 0.7 },
  addButton: { margin: 16 },
  modal: { margin: 16, padding: 16, backgroundColor: theme.colors.surface, borderRadius: 8 },
  modalTitle: { marginBottom: 8 },
  input: { marginBottom: 8 },
  submitButton: { marginTop: 8 },
  cancelButton: { marginTop: 8 },
});

export default PaymentMethodsScreen;
