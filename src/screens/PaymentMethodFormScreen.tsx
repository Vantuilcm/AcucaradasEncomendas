import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, SegmentedButtons, useTheme, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { PaymentMethod, CreditCard, PixPayment } from '../types/PaymentMethod';
import { PaymentMethodService } from '../services/PaymentMethodService';

type PaymentMethodType = 'credit_card' | 'debit_card' | 'pix';

export function PaymentMethodFormScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<PaymentMethodType>('credit_card');

  // Campos para cartão de crédito/débito
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [brand, setBrand] = useState('');

  // Campos para PIX
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'email' | 'phone' | 'evp'>('cpf');

  const validateForm = () => {
    if (type === 'credit_card' || type === 'debit_card') {
      if (!cardNumber || !cardHolder || !expiryMonth || !expiryYear || !cvv || !brand) {
        setError('Todos os campos são obrigatórios');
        return false;
      }
      if (cardNumber.length < 16) {
        setError('Número do cartão inválido');
        return false;
      }
      if (cvv.length < 3) {
        setError('CVV inválido');
        return false;
      }
      if (parseInt(expiryMonth) < 1 || parseInt(expiryMonth) > 12) {
        setError('Mês de validade inválido');
        return false;
      }
      if (parseInt(expiryYear) < new Date().getFullYear()) {
        setError('Ano de validade inválido');
        return false;
      }
    } else {
      if (!pixKey) {
        setError('Chave PIX é obrigatória');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) return;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      setLoading(true);
      setError(null);

      const paymentMethodService = new PaymentMethodService();

      if (type === 'credit_card' || type === 'debit_card') {
        const card: Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
          type,
          cardNumber,
          cardHolder,
          expiryMonth: parseInt(expiryMonth),
          expiryYear: parseInt(expiryYear),
          cvv,
          brand,
          isDefault: false,
        };
        await paymentMethodService.addCreditCard(user.id, card);
      } else {
        const pix: Omit<PixPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
          type: 'pix',
          pixKey,
          pixKeyType,
          isDefault: false,
        };
        await paymentMethodService.addPixPayment(user.id, pix);
      }

      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar método de pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Salvando método de pagamento..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error} />}

        <SegmentedButtons
          value={type}
          onValueChange={value => setType(value as PaymentMethodType)}
          buttons={[
            { value: 'credit_card', label: 'Cartão' },
            { value: 'debit_card', label: 'Débito' },
            { value: 'pix', label: 'PIX' },
          ]}
          style={styles.segmentedButtons}
        />

        {type === 'credit_card' || type === 'debit_card' ? (
          <View style={styles.form}>
            <TextInput
              label="Número do Cartão"
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="numeric"
              maxLength={16}
              style={styles.input}
            />
            <TextInput
              label="Nome no Cartão"
              value={cardHolder}
              onChangeText={setCardHolder}
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput
                label="Mês"
                value={expiryMonth}
                onChangeText={setExpiryMonth}
                keyboardType="numeric"
                maxLength={2}
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                label="Ano"
                value={expiryYear}
                onChangeText={setExpiryYear}
                keyboardType="numeric"
                maxLength={4}
                style={[styles.input, styles.halfInput]}
              />
            </View>
            <View style={styles.row}>
              <TextInput
                label="CVV"
                value={cvv}
                onChangeText={setCvv}
                keyboardType="numeric"
                maxLength={4}
                style={[styles.input, styles.halfInput]}
                secureTextEntry
              />
              <TextInput
                label="Bandeira"
                value={brand}
                onChangeText={setBrand}
                style={[styles.input, styles.halfInput]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <SegmentedButtons
              value={pixKeyType}
              onValueChange={value => setPixKeyType(value as 'cpf' | 'email' | 'phone' | 'evp')}
              buttons={[
                { value: 'cpf', label: 'CPF' },
                { value: 'email', label: 'E-mail' },
                { value: 'phone', label: 'Telefone' },
                { value: 'evp', label: 'Chave Aleatória' },
              ]}
              style={styles.segmentedButtons}
            />
            <TextInput
              label="Chave PIX"
              value={pixKey}
              onChangeText={setPixKey}
              style={styles.input}
            />
            <HelperText type="info">
              {pixKeyType === 'cpf' && 'Digite apenas os números do CPF'}
              {pixKeyType === 'email' && 'Digite seu e-mail cadastrado'}
              {pixKeyType === 'phone' && 'Digite o número com DDD (ex: 11999999999)'}
              {pixKeyType === 'evp' && 'Digite a chave aleatória gerada pelo seu banco'}
            </HelperText>
          </View>
        )}

        <Button mode="contained" onPress={handleSubmit} style={styles.button} loading={loading}>
          Salvar
        </Button>
      </ScrollView>
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
  segmentedButtons: {
    margin: 16,
  },
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  button: {
    margin: 16,
  },
});
