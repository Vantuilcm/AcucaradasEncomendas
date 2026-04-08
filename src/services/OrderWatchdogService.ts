import { f } from '../config/firebase';
const { collection, query, where, getDocs, Timestamp } = f;
import { db } from '../config/firebase';
import { Order, OrderStatus } from '../types/Order';
import { OrderService } from './OrderService';
import { NotificationService } from './NotificationService';
import { loggingService } from './LoggingService';

/**
 * Critérios de tempo para detecção de pedidos travados (em minutos)
 */
const STUCK_THRESHOLDS: Record<string, number> = {
  'pending': 10,
  'confirmed': 20,
  'preparing': 30, // Se existir o status
  'ready': 30,
  'delivering': 60,
};

export class OrderWatchdogService {
  private static instance: OrderWatchdogService;
  private orderService: OrderService;
  private notificationService: NotificationService;

  private constructor() {
    this.orderService = OrderService.getInstance();
    this.notificationService = NotificationService.getInstance();
    loggingService.info('OrderWatchdogService inicializado');
  }

  public static getInstance(): OrderWatchdogService {
    if (!OrderWatchdogService.instance) {
      OrderWatchdogService.instance = new OrderWatchdogService();
    }
    return OrderWatchdogService.instance;
  }

  /**
   * Analisa todos os pedidos ativos em busca de travamentos
   */
  public async checkStuckOrders(): Promise<void> {
    try {
      loggingService.info('Watchdog: Iniciando verificação de pedidos travados...');
      
      const activeStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivering'];
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('status', 'in', activeStatuses));
      
      const querySnapshot = await getDocs(q);
      const now = new Date();
      let stuckCount = 0;

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        if (!data) continue;
        
        const orderId = docSnapshot.id;
        
        // Evitar alertas duplicados
        if (data.watchdogAlertSent) continue;

        const status = data.status as OrderStatus;
        const updatedAtRaw = data.updatedAt;
        
        if (!updatedAtRaw) continue;

        let updatedAt: Date;
        if (updatedAtRaw instanceof Timestamp) {
          updatedAt = updatedAtRaw.toDate();
        } else if (updatedAtRaw instanceof Date) {
          updatedAt = updatedAtRaw;
        } else if (typeof updatedAtRaw === 'string' || typeof updatedAtRaw === 'number') {
          updatedAt = new Date(updatedAtRaw);
        } else {
          continue;
        }
        
        const elapsedMinutes = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60));
        const threshold = STUCK_THRESHOLDS[status] || 30;

        if (elapsedMinutes > threshold) {
          stuckCount++;
          await this.handleStuckOrder(orderId, { id: orderId, ...data } as unknown as Order, elapsedMinutes);
        }
      }

      loggingService.info('Watchdog: Verificação concluída', { 
        totalChecked: querySnapshot.docs.length, 
        stuckDetected: stuckCount 
      });
    } catch (error: any) {
      loggingService.error('Watchdog: Erro ao verificar pedidos travados', { error: error.message });
    }
  }

  /**
   * Trata um pedido detectado como travado
   */
  private async handleStuckOrder(orderId: string, orderData: Order, elapsed: number): Promise<void> {
    try {
      const statusLabel = this.getStatusLabel(orderData.status);
      loggingService.warn('ORDER_STUCK', {
        orderId,
        status: orderData.status,
        elapsedMinutes: elapsed,
      });

      // 1. Notificar Administradores
      await this.notificationService.createNotification({
        userId: 'admin_notifications',
        type: 'system_update',
        title: '🚨 Pedido Travado Detectado',
        message: `O pedido #${orderId.substring(0, 8)} está parado em "${statusLabel}" há ${elapsed} minutos.`,
        priority: 'high',
        read: false,
        data: { orderId, status: orderData.status, elapsed }
      });

      // 2. Notificar Produtor
      if (orderData.producerId) {
        await this.notificationService.createNotification({
          userId: orderData.producerId,
          type: 'order_status_update',
          title: '⚠️ Pedido Parado',
          message: `O pedido #${orderId.substring(0, 8)} não avança há algum tempo. Verifique o status.`,
          priority: 'high',
          read: false,
          data: { orderId, status: orderData.status }
        });
      }

      // 3. Marcar como alertado para evitar repetição
      // Usamos o método updateOrder que adicionamos ao OrderService
      await this.orderService.updateOrder(orderId, {
        // @ts-ignore - Campo novo para o watchdog
        watchdogAlertSent: true,
        // @ts-ignore
        watchdogAlertTimestamp: new Date().toISOString()
      });

    } catch (error: any) {
      loggingService.error('Watchdog: Erro ao processar pedido travado', { orderId, error: error.message });
    }
  }

  private getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Em Preparação';
      case 'ready': return 'Pronto para Entrega';
      case 'delivering': return 'Em Rota de Entrega';
      default: return status;
    }
  }
}
