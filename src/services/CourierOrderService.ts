import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order, OrderStatus } from '../types/Order';
import { loggingService } from './LoggingService';

export interface CourierDriverData {
  id: string;
  userId?: string;
  name?: string;
  phone?: string;
  vehicle?: string;
  plate?: string;
}

const OPERATIONAL_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  ready: 'delivering',
  delivering: 'delivered',
};

export class CourierOrderService {
  private readonly collectionName = 'orders';
  private static instance: CourierOrderService;

  private constructor() {
    loggingService.info('CourierOrderService inicializado');
  }

  public static getInstance(): CourierOrderService {
    if (!CourierOrderService.instance) {
      CourierOrderService.instance = new CourierOrderService();
    }
    return CourierOrderService.instance;
  }

  async getOrders(): Promise<Order[]> {
    try {
      const ordersRef = collection(db, this.collectionName);
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as Order[];
    } catch (error: any) {
      loggingService.error('Erro ao buscar pedidos para entregador', {
        error: error.message,
      });
      throw error;
    }
  }

  async acceptOrderAtomic(orderId: string, driverData: CourierDriverData): Promise<Order> {
    try {
      const orderRef = doc(db, this.collectionName, orderId);

      const runTransaction = (require('firebase/firestore') as { runTransaction: Function }).runTransaction;
      const result = await runTransaction(db, async (transaction: any) => {
        const orderDoc = await transaction.get(orderRef);

        if (!orderDoc.exists()) {
          throw new Error('Pedido não encontrado.');
        }

        const data = orderDoc.data() as Record<string, any>;

        const driverRef = doc(db, 'delivery_drivers', driverData.id);
        const driverDoc = await transaction.get(driverRef);

        if (!driverDoc.exists() || driverDoc.data()?.status !== 'active') {
          loggingService.warn('[DRIVER_STATUS_POLICY] Entregador não aprovado para aceitar corrida', {
            driverId: driverData.id,
            status: driverDoc.exists() ? driverDoc.data()?.status ?? null : null,
            action: 'acceptOrderAtomic',
          });
          throw new Error('DRIVER_NOT_APPROVED');
        }

        if ((data.deliveryDriver && data.deliveryDriver.id) || data.deliveryDriverId) {
          throw new Error('ORDER_ALREADY_ACCEPTED');
        }

        if (data.status !== 'ready') {
          throw new Error('ORDER_NOT_AVAILABLE');
        }

        const updatedAt = new Date().toISOString();
        const updatePayload = {
          deliveryDriver: driverData,
          deliveryDriverId: driverData.userId || driverData.id,
          updatedAt,
        };

        transaction.update(orderRef, updatePayload);

        return {
          id: orderId,
          ...data,
          ...updatePayload,
        } as Order;
      });

      loggingService.info('[DELIVERY_TRANSACTION] Aceite atômico com sucesso', {
        orderId,
        driverId: driverData.id,
      });
      return result;
    } catch (error: any) {
      if (error.message === 'ORDER_ALREADY_ACCEPTED') {
        loggingService.warn('[DELIVERY_TRANSACTION] Conflito evitado: pedido já aceito', { orderId });
        throw new Error('Esta entrega acabou de ser aceita por outro entregador');
      }
      if (error.message === 'ORDER_NOT_AVAILABLE') {
        loggingService.warn('[DELIVERY_TRANSACTION] Pedido não está mais disponível', { orderId });
        throw new Error('Este pedido não está mais disponível para aceite');
      }
      if (error.message === 'DRIVER_NOT_APPROVED') {
        throw new Error('Entregador não aprovado para aceitar corridas');
      }
      loggingService.error('Erro ao aceitar corrida', {
        orderId,
        driverId: driverData.id,
        error: error.message,
      });
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    try {
      const orderRef = doc(db, this.collectionName, orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const currentOrder = orderDoc.data()!;
      const currentStatus = currentOrder.status as OrderStatus;
      const allowedNext = OPERATIONAL_STATUS_TRANSITIONS[currentStatus];

      if (allowedNext !== status) {
        throw new Error(`Transição de status inválida: ${currentStatus} → ${status}`);
      }

      const updatedAt = new Date().toISOString();
      await updateDoc(orderRef, { status, updatedAt });

      loggingService.info('Status operacional do pedido atualizado', { orderId, status });

      return {
        id: orderId,
        ...currentOrder,
        status,
        updatedAt,
      } as Order;
    } catch (error: any) {
      loggingService.error('Erro ao atualizar status operacional do pedido', {
        orderId,
        status,
        error: error.message,
      });
      throw error;
    }
  }
}
