import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, HelperText, Button } from 'react-native-paper';
import { detectCardBrand } from '../utils/cardUtils';

interface PaymentCardFormProps {
  onSubmit: (cardData: {
    number: string;
    expiryDate: string;
    cvc: string;
    holderName: string;
    brand: string;
  }) => void;
  onCardDataChange?: (cardData: {
    number: string;
    expiryDate: string;
    cvc: string;
    holderName: string;
    brand: string;
    isValid: boolean;
  }) => void;
  loading?: boolean;
  showSubmitButton?: boolean;
}

export const PaymentCardForm: React.FC<PaymentCardFormProps> = ({ 
  onSubmit, 
  onCardDataChange,
  loading = false,
  showSubmitButton = true 
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [errors, setErrors] = useState<{
    cardNumber?: string;
    expiryDate?: string;
    cvc?: string;
    cardHolderName?: string;
  }>({});
  const [cardBrand, setCardBrand] = useState<string>('');

  useEffect(() => {
    const brand = detectCardBrand(cardNumber);
    setCardBrand(brand);
  }, [cardNumber]);

  useEffect(() => {
    if (onCardDataChange) {
      onCardDataChange({
        number: cardNumber,
        expiryDate,
        cvc,
        holderName: cardHolderName,
        brand: cardBrand,
        isValid: validateCardSilent(),
      });
    }
  }, [cardNumber, expiryDate, cvc, cardHolderName, cardBrand]);

  const validateCardSilent = () => {
    if (!cardNumber || !/^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''))) return false;
    if (!expiryDate || !/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(expiryDate)) return false;
    if (!cvc || !/^\d{3,4}$/.test(cvc)) return false;
    if (!cardHolderName || !/^[a-zA-ZÀ-ÿ\s]{2,}$/.test(cardHolderName)) return false;
    
    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    const cardYear = parseInt(year);
    const cardMonth = parseInt(month);

    if (cardYear < currentYear || (cardYear === currentYear && cardMonth < currentMonth)) return false;
    
    return true;
  };

  const validateCard = () => {
    const newErrors: typeof errors = {};

    // Validação do número do cartão
    if (!cardNumber) {
      newErrors.cardNumber = 'Número do cartão é obrigatório';
    } else if (!/^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''))) {
      newErrors.cardNumber = 'Número do cartão inválido';
    }

    // Validação da data de validade
    if (!expiryDate) {
      newErrors.expiryDate = 'Data de validade é obrigatória';
    } else if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(expiryDate)) {
      newErrors.expiryDate = 'Data de validade inválida';
    } else {
      const [month, year] = expiryDate.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      const cardYear = parseInt(year);
      const cardMonth = parseInt(month);

      if (cardYear < currentYear || (cardYear === currentYear && cardMonth < currentMonth)) {
        newErrors.expiryDate = 'Cartão expirado';
      }
    }

    // Validação do CVC
    if (!cvc) {
      newErrors.cvc = 'CVC é obrigatório';
    } else if (!/^\d{3,4}$/.test(cvc)) {
      newErrors.cvc = 'CVC inválido';
    }

    // Validação do nome do titular
    if (!cardHolderName) {
      newErrors.cardHolderName = 'Nome do titular é obrigatório';
    } else if (!/^[a-zA-ZÀ-ÿ\s]{2,}$/.test(cardHolderName)) {
      newErrors.cardHolderName = 'Nome do titular inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateCard()) {
      onSubmit({
        number: cardNumber,
        expiryDate,
        cvc,
        holderName: cardHolderName,
        brand: cardBrand,
      });
    }
  };

  const formatCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiryDate = (date: string) => {
    const cleaned = date.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="Número do Cartão"
        value={cardNumber}
        onChangeText={text => setCardNumber(formatCardNumber(text))}
        keyboardType="numeric"
        maxLength={19}
        style={styles.input}
        error={!!errors.cardNumber}
        outlineColor="#e0e0e0"
        activeOutlineColor="#FF69B4"
        right={
          cardBrand ? (
            <TextInput.Icon icon={cardBrand.toLowerCase()} style={styles.cardBrandIcon} />
          ) : undefined
        }
      />
      {errors.cardNumber && (
        <HelperText type="error" visible={!!errors.cardNumber}>
          {errors.cardNumber}
        </HelperText>
      )}

      <View style={styles.row}>
        <TextInput
          mode="outlined"
          label="Data de Validade"
          value={expiryDate}
          onChangeText={text => setExpiryDate(formatExpiryDate(text))}
          placeholder="MM/AA"
          maxLength={5}
          style={[styles.input, styles.halfInput]}
          error={!!errors.expiryDate}
          outlineColor="#e0e0e0"
          activeOutlineColor="#FF69B4"
        />
        <TextInput
          mode="outlined"
          label="CVC"
          value={cvc}
          onChangeText={setCvc}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
          style={[styles.input, styles.halfInput]}
          error={!!errors.cvc}
          outlineColor="#e0e0e0"
          activeOutlineColor="#FF69B4"
        />
      </View>

      {errors.expiryDate && (
        <HelperText type="error" visible={!!errors.expiryDate}>
          {errors.expiryDate}
        </HelperText>
      )}
      {errors.cvc && (
        <HelperText type="error" visible={!!errors.cvc}>
          {errors.cvc}
        </HelperText>
      )}

      <TextInput
        mode="outlined"
        label="Nome do Titular"
        value={cardHolderName}
        onChangeText={setCardHolderName}
        autoCapitalize="characters"
        style={styles.input}
        error={!!errors.cardHolderName}
        outlineColor="#e0e0e0"
        activeOutlineColor="#FF69B4"
      />
      {errors.cardHolderName && (
        <HelperText type="error" visible={!!errors.cardHolderName}>
          {errors.cardHolderName}
        </HelperText>
      )}

      {showSubmitButton && (
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
        >
          Adicionar Cartão
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
    height: 50,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  cardBrandIcon: {
    marginRight: 8,
  },
  submitButton: {
    marginTop: 16,
  },
});
