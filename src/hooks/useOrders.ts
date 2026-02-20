import { useState, useCallback, useEffect } from 'react';
import { Order } from '../types/Order';
import { OrderService } from '../services/OrderService';
import { useAuth } from './useAuth';
import { loggingService } from '../services/LoggingService';

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: Error | null;
}

export function useOrders() {
  const [state, setState] = useState<OrdersState>({
    orders: [],
    loading: false,
    error: null,
  });

  const { user } = useAuth();
  const orderService = new OrderService();

  const loadOrders = useCallback(async () => {
    if (!user) {
      setState(prev => ({
        ...prev,
        error: new Error('Usuário não autenticado'),
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const orders = await orderService.getUserOrders(user.uid);
      setState(prev => ({ ...prev, orders, loading: false }));
      loggingService.info('Pedidos carregados com sucesso', { count: orders.length });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao carregar pedidos', { error: err });
    }
  }, [user]);

  const refreshOrders = useCallback(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return {
    ...state,
    refreshOrders,
  };
}
