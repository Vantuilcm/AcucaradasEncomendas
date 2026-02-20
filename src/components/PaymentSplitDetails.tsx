import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Divider, useTheme } from 'react-native-paper';
import { formatCurrency } from '../utils/formatters';

interface PaymentSplitDetailsProps {
  paymentDetails: {
    productAmount: number;
    deliveryFee: number;
    appFee: number;
    producerAmount: number;
    platformMaintenanceFee?: number;
    totalAmount: number;
  };
  compact?: boolean;
}

export const PaymentSplitDetails: React.FC<PaymentSplitDetailsProps> = ({
  paymentDetails,
  compact = false,
}) => {
  const theme = useTheme();

  if (!paymentDetails) {
    return null;
  }

  const { productAmount, deliveryFee, appFee, producerAmount, platformMaintenanceFee = 0, totalAmount } = paymentDetails;

  // Calcular porcentagens para visualização
  const appPercentage = Math.round((appFee / productAmount) * 100);
  const producerPercentage = Math.round((producerAmount / productAmount) * 100);
  const deliveryPercentage = Math.round((deliveryFee / totalAmount) * 100);

  return (
    <Card style={compact ? styles.compactCard : styles.card}>
      <Card.Content>
        <Text variant={compact ? 'titleSmall' : 'titleMedium'} style={styles.title}>
          Detalhes da Divisão do Pagamento
        </Text>

        <Divider style={styles.divider} />

        <View style={styles.row}>
          <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>Valor dos Produtos:</Text>
          <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>
            {formatCurrency(productAmount)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>Taxa de Entrega:</Text>
          <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>
            {formatCurrency(deliveryFee)} ({deliveryPercentage}%)
          </Text>
        </View>

        {platformMaintenanceFee > 0 && (
          <View style={styles.row}>
            <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>Taxa de Manutenção:</Text>
            <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>
              {formatCurrency(platformMaintenanceFee)}
            </Text>
          </View>
        )}

        <Divider style={styles.divider} />

        <Text variant={compact ? 'bodySmall' : 'bodyMedium'} style={styles.subtitle}>
          Divisão do Valor dos Produtos:
        </Text>

        <View style={styles.row}>
          <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>Taxa do App:</Text>
          <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>
            {formatCurrency(appFee)} ({appPercentage}%)
          </Text>
        </View>

        <View style={styles.row}>
          <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>Valor para o Produtor:</Text>
          <Text variant={compact ? 'bodySmall' : 'bodyMedium'}>
            {formatCurrency(producerAmount)} ({producerPercentage}%)
          </Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.totalRow}>
          <Text variant={compact ? 'titleSmall' : 'titleMedium'}>Total:</Text>
          <Text
            variant={compact ? 'titleSmall' : 'titleMedium'}
            style={{ color: theme.colors.primary }}
          >
            {formatCurrency(totalAmount)}
          </Text>
        </View>

        {!compact && (
          <Text variant="bodySmall" style={styles.info}>
            * O produtor recebe 90% do valor dos produtos e o app recebe 10% como taxa de serviço. O
            entregador recebe 100% da taxa de entrega.
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 16,
    elevation: 2,
  },
  compactCard: {
    marginVertical: 8,
    elevation: 1,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  info: {
    marginTop: 12,
    fontStyle: 'italic',
    color: '#666',
  },
});
