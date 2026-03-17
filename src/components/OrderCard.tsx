import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Order } from '../types/Order';
import { formatCurrency } from '../utils/formatters';
import { Card } from './base/Card';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  index?: number;
}

export function OrderCard({ order, onPress, index = 0 }: OrderCardProps) {
  // Status color value para animação
  const statusOpacity = useSharedValue(0.8);
  const statusScale = useSharedValue(1);

  // Animar status quando o status mudar
  const pulseStatus = () => {
    statusScale.value = withSequence(
      withTiming(1.1, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    statusOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0.8, { duration: 300 })
    );
  };

  // Estilos animados para o status
  const animatedStatusStyle = useAnimatedStyle(() => {
    return {
      opacity: statusOpacity.value,
      transform: [{ scale: statusScale.value }],
    };
  });

  // Calcular o delay de entrada baseado no índice
  const calculatedDelay = index * 100; // 100ms de delay para cada item

  return (
    <Card onPress={onPress} style={styles.card} animationDelay={calculatedDelay}>
      <View style={styles.header}>
        <Animated.View entering={ZoomIn.delay(calculatedDelay + 100).duration(400)}>
          <Text variant="titleMedium">Pedido #{order.id}</Text>
        </Animated.View>

        <Animated.View style={animatedStatusStyle}>
          <Text
            variant="bodyMedium"
            style={[styles.status, { color: getStatusColor(order.status) }]}
            onPress={() => pulseStatus()}
          >
            {getStatusText(order.status)}
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        style={styles.details}
        entering={FadeInUp.delay(calculatedDelay + 200).duration(400)}
      >
        <Text variant="bodyMedium">
          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
        </Text>
        <Text variant="bodyMedium">Total: {formatCurrency(order.totalAmount)}</Text>
      </Animated.View>

      <Animated.View
        style={styles.footer}
        entering={FadeInUp.delay(calculatedDelay + 300).duration(400)}
      >
        <Text variant="bodySmall" style={styles.date}>
          {new Date(order.createdAt).toLocaleDateString('pt-BR')}
        </Text>
        <Text variant="bodySmall" style={styles.time}>
          {new Date(order.createdAt).toLocaleTimeString('pt-BR')}
        </Text>
      </Animated.View>
    </Card>
  );
}

function getStatusColor(status: Order['status']) {
  switch (status) {
    case 'pending':
      return '#FFA500'; // laranja
    case 'confirmed':
      return '#3498db'; // azul
    case 'preparing':
      return '#9c27b0'; // roxo
    case 'ready':
      return '#2ecc71'; // verde
    case 'delivered':
      return '#27ae60'; // verde escuro
    case 'cancelled':
      return '#e74c3c'; // vermelho
    default:
      return '#95a5a6'; // cinza
  }
}

function getStatusText(status: Order['status']) {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'confirmed':
      return 'Confirmado';
    case 'preparing':
      return 'Em Preparo';
    case 'ready':
      return 'Pronto';
    case 'delivered':
      return 'Entregue';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  status: {
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: '#666',
  },
  time: {
    color: '#666',
  },
});
