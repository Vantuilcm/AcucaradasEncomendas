import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  limit,
  startAfter,
  Timestamp,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order, OrderFilters, OrderSummary } from '../types/Order';
import { loggingService } from './LoggingService';

export class OrderService {
  private readonly collectionName = 'orders';
  private readonly pageSize = 10;

  constructor() {
    // Inicialização do serviço
    loggingService.info('OrderService inicializado');
  }

  /**
   * Busca os pedidos de um usuário com paginação e filtros
   * @param userId ID do usuário
   * @param filters Filtros opcionais
   * @param lastOrder Último pedido para paginação
   * @returns Lista de pedidos
   */
  async getUserOrders(userId: string, filters?: OrderFilters, lastOrder?: Order): Promise<Order[]> {
    try {
      const ordersRef = collection(db, this.collectionName);
      let q = query(
        ordersRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(this.pageSize)
      );

      if (lastOrder) {
        q = query(
          ordersRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          startAfter(Timestamp.fromDate(new Date(lastOrder.createdAt))),
          limit(this.pageSize)
        );
      }

      const querySnapshot = await getDocs(q);
      const orders: Order[] = [];

      for (const doc of querySnapshot.docs) {
        const order = {
          id: doc.id,
          ...doc.data(),
        } as Order;
        orders.push(order);
      }

      // Aplicar filtros em memória
      return this.applyFilters(orders, filters);
    } catch (error: any) {
      loggingService.error('Erro ao buscar pedidos do usuário', {
        userId,
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Busca um pedido pelo ID
   * @param orderId ID do pedido
   * @returns Pedido encontrado ou null
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const orderRef = doc(db, this.collectionName, orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        return null;
      }

      return {
        id: orderDoc.id,
        ...orderDoc.data(),
      } as Order;
    } catch (error: any) {
      loggingService.error('Erro ao buscar pedido', {
        orderId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Cria um novo pedido
   * @param orderData Dados do pedido
   * @returns Pedido criado
   */
  async createOrder(orderData: Omit<Order, 'id'>): Promise<Order> {
    try {
      // Validações básicas
      if (!orderData.userId) {
        throw new Error('ID do usuário é obrigatório');
      }
      if (!orderData.items || orderData.items.length === 0) {
        throw new Error('Pedido deve conter pelo menos um item');
      }

      // Criar pedido no Firestore
      const ordersRef = collection(db, this.collectionName);
      const createdAt = new Date();
      
      const newOrder = {
        ...orderData,
        createdAt,
        updatedAt: createdAt,
        status: orderData.status || 'pending'
      };
      
      const docRef = await addDoc(ordersRef, newOrder);
      
      loggingService.info('Pedido criado com sucesso', { orderId: docRef.id });
      
      return {
        id: docRef.id,
        ...newOrder
      } as Order;
    } catch (error: any) {
      loggingService.error('Erro ao criar pedido', { error: error.message });
      throw error;
    }
  }

  /**
   * Atualiza o status de um pedido
   * @param orderId ID do pedido
   * @param status Novo status
   * @returns Pedido atualizado
   */
  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    try {
      const orderRef = doc(db, this.collectionName, orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const updateData = {
        status,
        updatedAt: new Date()
      };

      await updateDoc(orderRef, updateData);
      
      // Buscar pedido atualizado
      const updatedOrderDoc = await getDoc(orderRef);
      
      loggingService.info('Status do pedido atualizado', { orderId, status });
      
      return {
        id: updatedOrderDoc.id,
        ...updatedOrderDoc.data()
      } as Order;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar status do pedido', { 
        orderId, 
        status, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtém um resumo dos pedidos do usuário
   * @param userId ID do usuário
   * @returns Resumo dos pedidos
   */
  async getOrderSummary(userId: string): Promise<OrderSummary> {
    try {
      const ordersRef = collection(db, this.collectionName);
      const q = query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      return {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        delivering: orders.filter(o => o.status === 'delivering').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        scheduledOrders: orders.filter(o => o.isScheduledOrder).length,
      };
    } catch (error: any) {
      loggingService.error('Erro ao buscar resumo de pedidos', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Atualiza um pedido existente
   * @param orderId ID do pedido
   * @param orderData Dados atualizados do pedido
   * @returns Pedido atualizado
   */
  async updateOrder(orderId: string, orderData: Partial<Order>): Promise<Order> {
    try {
      const orderRef = doc(db, this.collectionName, orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      // Remover campos que não devem ser atualizados
      const { id, createdAt, ...updateData } = orderData as any;
      
      // Adicionar timestamp de atualização
      const dataToUpdate = {
        ...updateData,
        updatedAt: new Date()
      };

      await updateDoc(orderRef, dataToUpdate);
      
      // Buscar pedido atualizado
      const updatedOrderDoc = await getDoc(orderRef);
      
      loggingService.info('Pedido atualizado com sucesso', { orderId });
      
      return {
        id: updatedOrderDoc.id,
        ...updatedOrderDoc.data()
      } as Order;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar pedido', { 
        orderId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Cancela um pedido
   * @param orderId ID do pedido
   * @param reason Motivo do cancelamento (opcional)
   * @returns Pedido cancelado
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    try {
      const orderRef = doc(db, this.collectionName, orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const currentOrder = orderDoc.data() as Order;
      
      // Verificar se o pedido já está cancelado
      if (currentOrder.status === 'cancelled') {
        throw new Error('Pedido já está cancelado');
      }
      
      // Verificar se o pedido já foi entregue
      if (currentOrder.status === 'delivered') {
        throw new Error('Não é possível cancelar um pedido já entregue');
      }

      const updateData = {
        status: 'cancelled',
        cancellationReason: reason || 'Cancelado pelo usuário',
        cancelledAt: new Date(),
        updatedAt: new Date()
      };

      await updateDoc(orderRef, updateData);
      
      // Buscar pedido atualizado
      const updatedOrderDoc = await getDoc(orderRef);
      
      loggingService.info('Pedido cancelado', { orderId, reason });
      
      return {
        id: updatedOrderDoc.id,
        ...updatedOrderDoc.data()
      } as Order;
    } catch (error: any) {
      loggingService.error('Erro ao cancelar pedido', { 
        orderId, 
        reason, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtém estatísticas gerais de pedidos
   * @returns Estatísticas de pedidos
   */
  async getOrderStats(): Promise<any> {
    try {
      const ordersRef = collection(db, this.collectionName);
      const querySnapshot = await getDocs(ordersRef);
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      // Calcular estatísticas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      // Calcular receita total
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      return {
        totalOrders: orders.length,
        todayOrders: todayOrders.length,
        totalRevenue,
        todayRevenue,
        statusCounts: {
          pending: orders.filter(o => o.status === 'pending').length,
          confirmed: orders.filter(o => o.status === 'confirmed').length,
          preparing: orders.filter(o => o.status === 'preparing').length,
          ready: orders.filter(o => o.status === 'ready').length,
          delivering: orders.filter(o => o.status === 'delivering').length,
          delivered: orders.filter(o => o.status === 'delivered').length,
          cancelled: orders.filter(o => o.status === 'cancelled').length,
        },
        scheduledOrders: orders.filter(o => o.isScheduledOrder).length,
      };
    } catch (error: any) {
      loggingService.error('Erro ao obter estatísticas de pedidos', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Aplica filtros a uma lista de pedidos em memória
   * @param orders Lista de pedidos
   * @param filters Filtros a serem aplicados
   * @returns Lista de pedidos filtrada
   * @private
   */
  private applyFilters(orders: Order[], filters?: OrderFilters): Order[] {
    if (!filters) return orders;

    return orders.filter(order => {
      // Filtro por status
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(order.status)) {
          return false;
        }
      }

      // Filtro por data
      const orderDate = new Date(order.createdAt);
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (orderDate < startDate) {
          return false;
        }
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        if (orderDate > endDate) {
          return false;
        }
      }

      // Filtro por busca
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          order.id.toLowerCase().includes(search) ||
          order.items.some(item => item.name.toLowerCase().includes(search)) ||
          order.deliveryAddress.street.toLowerCase().includes(search) ||
          order.deliveryAddress.city.toLowerCase().includes(search);

        if (!matchesSearch) {
          return false;
        }
      }

      // Filtro por pedidos agendados
      if (filters.isScheduled !== undefined) {
        if (order.isScheduledOrder !== filters.isScheduled) {
          return false;
        }
      }

      return true;
    });
  }

  async createOrder(order: Omit<Order, 'id'>): Promise<Order> {
    try {
      const ordersRef = collection(db, this.collection);
      const docRef = await addDoc(ordersRef, {
        ...order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newOrder: Order = {
        id: docRef.id,
        ...order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      loggingService.info('Pedido criado com sucesso', { orderId: docRef.id });
      return newOrder;
    } catch (error) {
      loggingService.error('Erro ao criar pedido', { error });
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    try {
      const orderRef = doc(db, this.collection, orderId);
      await updateDoc(orderRef, {
        status,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Status do pedido atualizado com sucesso', {
        orderId,
        status,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar status do pedido', {
        orderId,
        status,
        error,
      });
      throw error;
    }
  }
}
