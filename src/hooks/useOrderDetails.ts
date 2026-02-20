import { useState, useCallback, useEffect } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { OrderService } from '../services/OrderService';
import { Order, OrderStatus } from '../types/Order';
import { loggingService } from '../services/LoggingService';
import { RootStackParamList } from '../types/navigation';

interface OrderDetailsState {
  order: Order | null;
  loading: boolean;
  error: string | null;
  updateOrderStatus: (newStatus: OrderStatus) => Promise<void>;
}

export function useOrderDetails(): OrderDetailsState {
  const route = useRoute<RouteProp<RootStackParamList, 'OrderDetails'>>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const orderService = new OrderService();

  const loadOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const orderData = await orderService.getOrderById(orderId);
      setOrder(orderData);
      loggingService.info('Detalhes do pedido carregados com sucesso', {
        orderId,
      });
    } catch (err) {
      const errorMessage = 'Erro ao carregar detalhes do pedido';
      setError(errorMessage);
      loggingService.error(errorMessage, {
        orderId,
        error: err,
      });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const updateOrderStatus = useCallback(
    async (newStatus: OrderStatus) => {
      try {
        setLoading(true);
        setError(null);
        await orderService.updateOrderStatus(orderId, newStatus);
        await loadOrderDetails(); // Recarrega os detalhes do pedido
        loggingService.info('Status do pedido atualizado com sucesso', {
          orderId,
          newStatus,
        });
      } catch (err) {
        const errorMessage = 'Erro ao atualizar status do pedido';
        setError(errorMessage);
        loggingService.error(errorMessage, {
          orderId,
          newStatus,
          error: err,
        });
      } finally {
        setLoading(false);
      }
    },
    [orderId, loadOrderDetails]
  );

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  return {
    order,
    loading,
    error,
    updateOrderStatus,
  };
}
