import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme, Divider } from 'react-native-paper';
import { formatCurrency } from '../utils/formatters';
import { PaymentSplitDetails } from './PaymentSplitDetails';

interface PaymentSummaryProps {
  subtotal: number;
  deliveryFee: number;
  paymentMethod?: 'credit_card' | 'pix';
  showSplitDetails?: boolean;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  subtotal,
  deliveryFee,
  paymentMethod = 'credit_card',
  showSplitDetails = false,
}) => {
  const theme = useTheme();
  
  // Taxa de manutenção da plataforma
  const platformMaintenanceFee = paymentMethod === 'pix' ? 0.99 : 1.99;
  
  const total = subtotal + deliveryFee + platformMaintenanceFee;

  // Calcular os valores para a divisão de pagamentos
  const appFee = Math.round(subtotal * 0.1); // 10% para o app
  const producerAmount = subtotal - appFee; // 90% para o produtor

  const paymentDetails = {
    productAmount: subtotal,
    deliveryFee,
    appFee,
    producerAmount,
    platformMaintenanceFee,
    totalAmount: total,
  };

  return (
    <Surface style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Resumo do Pagamento
      </Text>

      <View style={styles.row}>
        <Text variant="bodyMedium">Subtotal:</Text>
        <Text variant="bodyMedium">{formatCurrency(subtotal)}</Text>
      </View>

      <View style={styles.row}>
        <Text variant="bodyMedium">Taxa de Entrega:</Text>
        <Text variant="bodyMedium">{formatCurrency(deliveryFee)}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.platformFeeContainer}>
          <Text variant="bodyMedium">Taxa de Manutenção:</Text>
          <Text variant="bodySmall" style={styles.platformFeeDescription}>
            Ajude a manter a plataforma funcionando para conectar você com os melhores doces caseiros da cidade ❤️
          </Text>
        </View>
        <Text variant="bodyMedium" style={{ color: paymentMethod === 'pix' ? theme.colors.primary : theme.colors.onSurface }}>
          {formatCurrency(platformMaintenanceFee)}
        </Text>
      </View>

      {paymentMethod === 'pix' && (
        <View style={styles.pixDiscountContainer}>
          <Text variant="bodySmall" style={[styles.pixDiscountText, { color: theme.colors.primary }]}>
            💰 Economia de R$ 1,00 pagando com PIX!
          </Text>
        </View>
      )}

      <Divider style={styles.divider} />

      <View style={styles.totalRow}>
        <Text variant="titleMedium">Total:</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
          {formatCurrency(total)}
        </Text>
      </View>

      {showSplitDetails && (
        <View style={styles.splitDetails}>
          <PaymentSplitDetails paymentDetails={paymentDetails} compact={true} />
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    marginVertical: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  platformFeeContainer: {
    flex: 1,
    marginRight: 16,
  },
  platformFeeDescription: {
    marginTop: 4,
    opacity: 0.7,
    lineHeight: 16,
  },
  pixDiscountContainer: {
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 4,
  },
  pixDiscountText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  splitDetails: {
    marginTop: 16,
  },
});
