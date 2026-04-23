import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme, Divider } from 'react-native-paper';
import { formatCurrency } from '../utils/formatters';
interface PaymentSummaryProps {
  subtotal: number;
  deliveryFee: number;
  paymentMethod?: 'credit_card' | 'pix';
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  subtotal,
  deliveryFee,
  paymentMethod: _paymentMethod = 'credit_card',
}) => {
  const theme = useTheme();
  const total = subtotal + deliveryFee;

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

      <Divider style={styles.divider} />

      <View style={styles.totalRow}>
        <Text variant="titleMedium">Total:</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
          {formatCurrency(total)}
        </Text>
      </View>
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
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
