import { dbFunctions as f } from '../config/firebase';
import { Order, OrderFilters, OrderSummary, OrderStatus } from '../types/Order';
import { loggingService } from './LoggingService';
// import { DeliveryService } from './DeliveryService';
import { NotificationService } from './NotificationService';
import { GrowthService } from './GrowthService';

export class OrderService {
  private readonly collectionName = 'orders';
  private readonly pageSize = 10;

  private static instance: OrderService;

  private constructor() {
    // Inicialização do serviço
    loggingService.info('OrderService inicializado');
  }

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  /**
   * Busca os pedidos de um usuário com paginação e filtros
   * @param userId ID do usuário
   * @param filters Filtros opcionais
   * @param lastOrder Último pedido para paginação
   * @returns Lista de pedidos
   */
  async getUserOrders(userId: string, _filters?: OrderFilters, lastOrder?: Order): Promise<Order[]> {
    try {
      const ordersRef = f.collection(this.collectionName);
      let q = f.query(
        ordersRef,
        f.where('userId', '==', userId),
        f.orderBy('createdAt', 'desc'),
        f.limit(this.pageSize)
      );

      if (lastOrder) {
        q = f.query(q, f.startAfter(new Date(lastOrder.createdAt)));
      }

      const querySnapshot = await f.getDocs(q);
      return querySnapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as Order[];
    } catch (error) {
      loggingService.error('Erro ao buscar pedidos do usuário', { error, userId });
      throw error;
    }
  }

  /**
   * Monitora os pedidos de um usuário em tempo real
   * @param userId ID do usuário
   * @param callback Função chamada sempre que os dados mudarem
   * @returns Função para cancelar o monitoramento
   */
  public subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void): () => void {
    const ordersRef = f.collection(this.collectionName);
    const q = f.query(
      ordersRef,
      f.where('userId', '==', userId),
      f.orderBy('createdAt', 'desc')
    );

    return f.onSnapshot(q, (querySnapshot: any) => {
      const orders = querySnapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as Order[];
      callback(orders);
    }, (error: any) => {
      loggingService.error('Erro ao monitorar pedidos do usuário', { error, userId });
    });
  }

  /**
   * Busca os pedidos de um entregador
   * @param driverId ID do entregador
   * @param filters Filtros opcionais
   * @param lastOrder Último pedido para paginação
   * @returns Lista de pedidos
   */
  async getOrdersByDeliveryDriver(
    driverId: string,
    _filters?: OrderFilters,
    lastOrder?: Order
  ): Promise<Order[]> {
    try {
      const ordersRef = f.collection(this.collectionName);
      let q = f.query(
        ordersRef,
        f.where('deliveryDriver.id', '==', driverId),
        f.orderBy('createdAt', 'desc'),
        f.limit(this.pageSize)
      );

      if (lastOrder) {
        q = f.query(q, f.startAfter(new Date(lastOrder.createdAt)));
      }

      const querySnapshot = await f.getDocs(q);
      return querySnapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as Order[];
    } catch (error) {
      loggingService.error('Erro ao buscar pedidos do entregador', { error, driverId });
      throw error;
    }
  }

  /**
   * Busca um pedido por ID
   * @param orderId ID do pedido
   * @returns O pedido ou null se não encontrado
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const orderRef = f.doc(this.collectionName, orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        return null;
      }

      return {
        id: orderDoc.id,
        ...orderDoc.data(),
      } as Order;
    } catch (error) {
      loggingService.error('Erro ao buscar pedido por ID', { error, orderId });
      throw error;
    }
  }

  /**
   * Cria um novo pedido
   * @param orderData Dados do pedido
   * @returns O pedido criado
   */
  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    try {
      // Criar pedido no Firestore
      const ordersRef = f.collection(this.collectionName);
      const createdAt = new Date();
      
      const newOrderData = {
        ...orderData,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        status: orderData.status || 'pending'
      };
      
      const docRef = await f.addDoc(ordersRef, newOrderData);

      const createdOrder = {
        id: docRef.id,
        ...newOrderData,
      } as Order;

      // Enviar notificações usando o método genérico createNotification
      await NotificationService.getInstance().createNotification({
        userId: createdOrder.userId,
        type: 'order_status' as any,
        title: 'Pedido Recebido! 🍰',
        message: `Seu pedido #${createdOrder.id.substring(0, 6)} foi recebido com sucesso.`,
        priority: 'high',
        read: false
      });
      
      // Registrar no serviço de crescimento via loop de crescimento
      await GrowthService.getInstance().triggerGrowthLoop(createdOrder);

      return createdOrder;
    } catch (error) {
      loggingService.error('Erro ao criar pedido', { error });
      throw error;
    }
  }

  /**
   * Obtém o resumo de pedidos de um usuário
   * @param userId ID do usuário
   * @returns Resumo de pedidos
   */
  async getOrderSummary(userId: string): Promise<OrderSummary> {
    try {
      const ordersRef = f.collection(this.collectionName);
      const q = f.query(ordersRef, f.where('userId', '==', userId), f.orderBy('createdAt', 'desc'));
      const querySnapshot = await f.getDocs(q);
      
      const orders = querySnapshot.docs.map((docSnapshot: any) => docSnapshot.data()) as Order[];
      
      return {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        delivering: orders.filter(o => o.status === 'delivering').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        scheduledOrders: orders.filter(o => o.isScheduledOrder).length
      };
    } catch (error) {
      loggingService.error('Erro ao obter resumo de pedidos', { error, userId });
      throw error;
    }
  }

  /**
   * Atualiza o status de um pedido
   * @param orderId ID do pedido
   * @param status Novo status
   * @returns O pedido atualizado
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    try {
      const orderRef = f.doc(this.collectionName, orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const updatedAt = new Date().toISOString();
      await f.updateDoc(orderRef, { status, updatedAt });

      const updatedOrder = {
        id: orderId,
        ...orderDoc.data(),
        status,
        updatedAt,
      } as Order;

      // Notificar mudança de status
      await NotificationService.getInstance().createNotification({
        userId: updatedOrder.userId,
        type: 'order_status' as any,
        title: 'Status do Pedido Atualizado',
        message: `Seu pedido agora está: ${status}`,
        priority: 'normal',
        read: false
      });
      
      // Se concluído, atualizar serviço de entrega
      if (status === 'delivered' || status === 'cancelled') {
        // Nota: O DeliveryService original não tinha completeDelivery, 
        // mas tinha updateDeliveryStatus. Como o ID da entrega pode ser diferente do ID do pedido,
        // aqui precisaríamos buscar a entrega vinculada ao pedido.
        loggingService.info('Status final do pedido atingido', { orderId, status });
      }

      return updatedOrder;
    } catch (error) {
      loggingService.error('Erro ao atualizar status do pedido', { error, orderId, status });
      throw error;
    }
  }

  /**
   * Atualiza dados de um pedido
   * @param orderId ID do pedido
   * @param orderData Novos dados
   * @returns O pedido atualizado
   */
  async updateOrder(orderId: string, orderData: Partial<Order>): Promise<Order> {
    try {
      const orderRef = f.doc(this.collectionName, orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const updatedAt = new Date().toISOString();
      await f.updateDoc(orderRef, { ...orderData, updatedAt });

      return {
        id: orderId,
        ...orderDoc.data(),
        ...orderData,
        updatedAt,
      } as Order;
    } catch (error) {
      loggingService.error('Erro ao atualizar pedido', { error, orderId });
      throw error;
    }
  }

  /**
   * Cancela um pedido
   * @param orderId ID do pedido
   * @param reason Motivo do cancelamento
   * @returns O pedido cancelado
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    try {
      const orderRef = f.doc(this.collectionName, orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const updatedAt = new Date().toISOString();
      await f.updateDoc(orderRef, { 
        status: 'cancelled', 
        updatedAt,
        cancellationReason: reason 
      });

      const cancelledOrder = {
        id: orderId,
        ...orderDoc.data(),
        status: 'cancelled' as OrderStatus,
        updatedAt,
        cancellationReason: reason
      } as Order;

      await NotificationService.getInstance().createNotification({
        userId: cancelledOrder.userId,
        type: 'order_status' as any,
        title: 'Pedido Cancelado',
        message: `Seu pedido foi cancelado. Motivo: ${reason || 'Não informado'}`,
        priority: 'high',
        read: false
      });

      return cancelledOrder;
    } catch (error) {
      loggingService.error('Erro ao cancelar pedido', { error, orderId });
      throw error;
    }
  }

  /**
   * Monitora todos os pedidos (para administradores ou produtores)
   * @param callback Função chamada sempre que os dados mudarem
   * @returns Função para cancelar o monitoramento
   */
  public subscribeToAllOrders(callback: (orders: Order[]) => void): () => void {
    const ordersRef = f.collection(this.collectionName);
    const q = f.query(ordersRef, f.orderBy('createdAt', 'desc'));

    return f.onSnapshot(q, (querySnapshot: any) => {
      const orders = querySnapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as Order[];
      callback(orders);
    }, (error: any) => {
      loggingService.error('Erro ao monitorar todos os pedidos', { error });
    });
  }

  /**
   * Obtém estatísticas gerais de pedidos
   * @returns Estatísticas de pedidos
   */
  async getOrderStats(): Promise<any> {
    try {
      const ordersRef = f.collection(this.collectionName);
      const querySnapshot = await f.getDocs(ordersRef);
      const orders = querySnapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as Order[];

      // Calcular estatísticas
      const today = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);

      const completedOrders = orders.filter(o => o.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      const lastMonthOrders = completedOrders.filter(o => new Date(o.createdAt) >= lastMonth);
      const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      return {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        totalRevenue,
        lastMonthRevenue,
        averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        growth: lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0
      };
    } catch (error) {
      loggingService.error('Erro ao obter estatísticas de pedidos', { error });
      throw error;
    }
  }

  /**
   * Monitora estatísticas gerais de pedidos em tempo real
   * @param callback Função chamada sempre que os dados mudarem
   * @returns Função para cancelar o monitoramento
   */
  public subscribeToOrderStats(callback: (stats: any) => void): () => void {
    const ordersRef = f.collection(this.collectionName);
    const q = f.query(ordersRef, f.orderBy('createdAt', 'desc'));

    return f.onSnapshot(q, (querySnapshot: any) => {
      const orders = querySnapshot.docs.map((item: any) => {
        const data = item.data();
        // Converter timestamps do Firestore para strings ISO para compatibilidade com o tipo Order
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt;
        
        return {
          id: item.id,
          ...data,
          createdAt,
          updatedAt
        };
      }) as Order[];
      
      // Recalcular estatísticas detalhadas (BUILD 1127)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      const completedOrders = orders.filter(o => o.status === 'delivered');
      const todayOrders = orders.filter(o => {
        const date = o.createdAt ? new Date(o.createdAt).getTime() : 0;
        return date >= startOfDay;
      });
      
      const todayRevenue = todayOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      const statusCounts = {
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        delivering: orders.filter(o => o.status === 'delivering').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
      };

      const scheduledOrders = orders.filter(o => o.isScheduledOrder).length;
      
      callback({
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        totalRevenue,
        todayRevenue,
        averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        statusCounts,
        scheduledOrders,
      });
    }, (error: any) => {
      loggingService.error('Erro ao monitorar estatísticas de pedidos', { error: error.message });
    });
  }
}
