import { dbFunctions as f } from '../config/firebase';
import { Order, OrderFilters, OrderSummary, OrderStatus } from '../types/Order';
import { loggingService } from './LoggingService';
import { DeliveryService } from './DeliveryService';
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
  async getUserOrders(userId: string, filters?: OrderFilters, lastOrder?: Order): Promise<Order[]> {
    try {
      const ordersRef = f.collection(this.collectionName);
      let q = f.query(
        ordersRef,
        f.where('userId', '==', userId),
        f.orderBy('createdAt', 'desc'),
        f.limit(this.pageSize)
      );

      if (lastOrder) {
        // @ts-ignore
        const { startAfter } = require('firebase/firestore');
        q = f.query(q, startAfter(lastOrder.createdAt));
      }

      if (filters?.status) {
        q = f.query(q, f.where('status', '==', filters.status));
      }

      const snapshot = await f.getDocs(q);
      return snapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      } as Order));
    } catch (error) {
      loggingService.error('Erro ao buscar pedidos do usuário', { userId, error });
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
    });
  }

  async getOrdersByDeliveryDriver(
    driverId: string,
    filters?: OrderFilters,
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
        // @ts-ignore
        const { startAfter } = require('firebase/firestore');
        q = f.query(
          ordersRef,
          f.where('deliveryDriver.id', '==', driverId),
          f.orderBy('createdAt', 'desc'),
          startAfter(new Date(lastOrder.createdAt)),
          f.limit(this.pageSize)
        );
      }

      const querySnapshot = await f.getDocs(q);
      const orders: Order[] = [];

      for (const docSnapshot of querySnapshot.docs) {
        const order = {
          id: docSnapshot.id,
          ...docSnapshot.data(),
        } as Order;
        orders.push(order);
      }

      return this.applyFilters(orders, filters);
    } catch (error: any) {
      loggingService.error('Erro ao buscar pedidos do entregador', {
        driverId,
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Obtém detalhes de um pedido pelo ID
   * @param orderId ID do pedido
   * @returns Pedido encontrado ou null
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const orderRef = f.doc(this.collectionName, orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        return null;
      }

      return { id: orderDoc.id, ...orderDoc.data() } as Order;
    } catch (error) {
      loggingService.error('Erro ao buscar pedido por ID', { orderId, error });
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
      const ordersRef = f.collection(this.collectionName);
      const createdAt = new Date();
      
      const newOrder = {
        ...orderData,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        status: orderData.status || 'pending'
      };
      
      const docRef = await f.addDoc(ordersRef, {
        ...orderData,
        createdAt, // Save as Date in Firestore
        updatedAt: createdAt,
        status: orderData.status || 'pending'
      } as any);
      
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
   * Obtém um resumo dos pedidos do usuário
   * @param userId ID do usuário
   * @returns Resumo dos pedidos
   */
  async getOrderSummary(userId: string): Promise<OrderSummary> {
    try {
      const ordersRef = f.collection(this.collectionName);
      const q = f.query(ordersRef, f.where('userId', '==', userId), f.orderBy('createdAt', 'desc'));

      const querySnapshot = await f.getDocs(q);
      const orders = querySnapshot.docs.map((doc: any) => ({
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
      const orderRef = f.doc(this.collectionName, orderId);
      const orderDoc = await f.getDoc(orderRef);

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

      await f.updateDoc(orderRef, dataToUpdate);
      
      // Buscar pedido atualizado
      const updatedOrderDoc = await f.getDoc(orderRef);
      
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
      const orderRef = f.doc(this.collectionName, orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const currentOrder = orderDoc.data() as unknown as Order;
      
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

      await f.updateDoc(orderRef, updateData);
      
      // Buscar pedido atualizado
      const updatedOrderDoc = await f.getDoc(orderRef);
      
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
      const ordersRef = f.collection(this.collectionName);
      const querySnapshot = await f.getDocs(ordersRef);
      const orders = querySnapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
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
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
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
          updatedAt,
        };
      }) as Order[];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      const stats = {
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

      callback(stats);
    }, (error: any) => {
      loggingService.error('Erro ao monitorar estatísticas de pedidos', { error: error.message });
    });
  }

  /**
   * Monitora todos os pedidos em tempo real (para gestão operacional)
   * @param callback Função chamada sempre que os dados mudarem
   * @returns Função para cancelar o monitoramento
   */
  public subscribeToAllOrders(callback: (orders: Order[]) => void): () => void {
    const ordersRef = f.collection(this.db, this.collectionName);
    const q = f.query(ordersRef, f.orderBy('createdAt', 'desc'));

    return f.onSnapshot(q, (querySnapshot: any) => {
      const orders = querySnapshot.docs.map((item: any) => {
        const data = item.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt;
        
        return {
          id: item.id,
          ...data,
          createdAt,
          updatedAt,
        };
      }) as Order[];
      
      callback(orders);
    }, (error: any) => {
      loggingService.error('Erro ao monitorar todos os pedidos', { error: error.message });
    });
  }

  /**
   * Atualiza o status de um pedido
   * @param orderId ID do pedido
   * @param status Novo status do pedido
   * @returns Pedido atualizado
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    try {
      const orderRef = f.doc(this.db, this.collectionName, orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const orderData = orderDoc.data() as unknown as Order;
      const oldStatus = orderData.status;

      const updateData = {
        status,
        updatedAt: new Date()
      };

      await f.updateDoc(orderRef, updateData);
      
      // Enviar notificações de mudança de status
      try {
        const notificationService = NotificationService.getInstance();
        
        // Notificação para o cliente
        await notificationService.createNotification({
          userId: orderData.userId,
          type: 'order_status_update',
          title: 'Atualização do Pedido',
          message: `O status do seu pedido #${orderId.substring(0, 8)} mudou para: ${this.getStatusLabel(status)}`,
          priority: 'high',
          read: false,
          data: { orderId, status }
        });

        // Se o pedido for para o produtor e estiver 'confirmed', notificar
        if (status === 'confirmed' && orderData.producerId) {
          await notificationService.createNotification({
            userId: orderData.producerId,
            type: 'new_order',
            title: 'Novo Pedido Confirmado',
            message: `Você tem um novo pedido #${orderId.substring(0, 8)} para preparar.`,
            priority: 'high',
            read: false,
            data: { orderId }
          });
        }

        // Se o pedido estiver 'ready', notificar entregadores
        if (status === 'ready') {
          // Criar registro na coleção de entregas para que apareça para os entregadores
          try {
            const deliveryService = new DeliveryService();
            await deliveryService.createDelivery({
              orderId,
              status: 'pending',
              userId: orderData.userId,
              producerId: orderData.producerId,
              address: orderData.deliveryAddress,
              totalAmount: orderData.totalAmount,
              deliveryFee: orderData.deliveryFee || 10,
              items: orderData.items,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as any);

            // Notificar entregadores disponíveis
            await notificationService.createNotification({
              userId: 'all_drivers', // Tópico ou lógica para todos os entregadores
              type: 'delivery_available',
              title: 'Nova Entrega Disponível',
              message: `Um novo pedido #${orderId.substring(0, 8)} está pronto para entrega.`,
              priority: 'high',
              read: false,
              data: { orderId }
            });
          } catch (deliveryError) {
            console.error('Erro ao criar registro de entrega:', deliveryError);
          }
        }

        // Se o pedido estiver 'delivering', notificar o cliente
        if (status === 'delivering') {
          await notificationService.createNotification({
            userId: orderData.userId,
            type: 'delivery_status_update',
            title: 'Pedido Saiu para Entrega',
            message: `O seu pedido #${orderId.substring(0, 8)} saiu para entrega e chegará em breve!`,
            priority: 'high',
            read: false,
            data: { orderId, status: 'delivering' }
          });
        }

        // Se o pedido estiver 'delivered', notificar o cliente e disparar Growth Loop
        if (status === 'delivered') {
          await notificationService.createNotification({
            userId: orderData.userId,
            type: 'order_delivered',
            title: 'Pedido Entregue',
            message: `O seu pedido #${orderId.substring(0, 8)} foi entregue. Bom apetite!`,
            priority: 'high',
            read: false,
            data: { orderId, status: 'delivered' }
          });

          // 🎯 GROWTH ENGINE: Disparar Growth Loop (Indicação e Fidelidade)
          try {
            const growthService = GrowthService.getInstance();
            await growthService.triggerGrowthLoop({ ...orderData, id: orderId } as Order);
          } catch (growthError) {
            console.error('Erro ao disparar Growth Loop:', growthError);
          }
        }
      } catch (notifError) {
        console.error('Erro ao enviar notificações de status:', notifError);
      }

      loggingService.info('Status do pedido atualizado', { orderId, oldStatus, newStatus: status });
      
      const updatedOrderDoc = await f.getDoc(orderRef);
      return {
        ...updatedOrderDoc.data(),
        id: updatedOrderDoc.id
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

  private getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Em Preparação';
      case 'ready': return 'Pronto para Entrega';
      case 'delivering': return 'Em Rota de Entrega';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
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

}
