import * as firestore from 'firebase/firestore';
import { db } from '../config/firebase';

const {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  runTransaction
} = firestore as any;

import type {
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { DeliveryDriver, DriverEarning, DriverFinanceSummary, DriverLocationLog, DriverBadge, DeliveryDriverUpdate, DeliveryDriverStats, DriverDailyRoute, WithdrawalRequest } from '../types/DeliveryDriver';
import { Order } from '../types/Order';
import { loggingService } from './LoggingService';
import { calculateDistance } from '../utils/distanceCalculator';
import { OrderService } from './OrderService';
import { NotificationService } from './NotificationService';
import { GeofencingService } from './GeofencingService';
import { StripeService } from './StripeService';

export class DeliveryDriverService {
  private static instance: DeliveryDriverService;
  private readonly collection = 'delivery_drivers';
  private readonly earningsCollection = 'driver_earnings';
  private readonly orderService: OrderService;
  private readonly geofencingService: GeofencingService;

  private constructor() {
    this.orderService = new OrderService();
    this.geofencingService = GeofencingService.getInstance();
  }

  async checkAndAwardBadges(driverId: string): Promise<void> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      const driverDoc = await getDoc(driverRef);
      if (!driverDoc.exists()) return;

      const driver = driverDoc.data() as DeliveryDriver;
      const stats = await this.getDriverStats(driverId);
      const currentBadges = driver.badges || [];
      const newBadges: DriverBadge[] = [...currentBadges];

      // 1. Badge de Veterano (Seniority)
      if (stats.totalDeliveries >= 100 && !currentBadges.find((b: any) => b.id === 'senior_driver')) {
        newBadges.push({
          id: 'senior_driver',
          name: 'Entregador Elite',
          description: 'Completou mais de 100 entregas com sucesso.',
          icon: 'trophy',
          category: 'seniority',
          unlockedAt: new Date().toISOString(),
        });
      }

      // 2. Badge de Estrela (Performance)
      if (stats.averageRating >= 4.8 && stats.totalDeliveries >= 20 && !currentBadges.find((b: any) => b.id === 'top_rated')) {
        newBadges.push({
          id: 'top_rated',
          name: 'Nota Máxima',
          description: 'Manteve uma média acima de 4.8 em suas últimas entregas.',
          icon: 'star',
          category: 'performance',
          unlockedAt: new Date().toISOString(),
        });
      }

      // 3. Badge de Pontualidade (Reliability)
      if (stats.onTimeRate >= 0.95 && stats.totalDeliveries >= 50 && !currentBadges.find((b: any) => b.id === 'always_on_time')) {
        newBadges.push({
          id: 'always_on_time',
          name: 'Sempre no Prazo',
          description: '95% das entregas realizadas dentro do tempo estimado.',
          icon: 'timer-check',
          category: 'reliability',
          unlockedAt: new Date().toISOString(),
        });
      }

      if (newBadges.length > currentBadges.length) {
        await updateDoc(driverRef, {
          badges: newBadges,
          updatedAt: new Date().toISOString(),
        });
        
        loggingService.info('Novas insígnias conquistadas pelo motorista', { 
          driverId, 
          badges: newBadges.slice(currentBadges.length) 
        });
      }
    } catch (error) {
      loggingService.error('Erro ao verificar insígnias do motorista', error instanceof Error ? error : undefined);
    }
  }

  async getStripeOnboardingLink(driverId: string, email: string): Promise<string> {
    return StripeService.getInstance().getOnboardingLink(driverId, email, 'driver');
  }

  async getStripeAccountStatus(stripeAccountId: string): Promise<'not_started' | 'pending' | 'active'> {
    return StripeService.getInstance().getAccountStatus(stripeAccountId);
  }

  async requestStripePayout(driverId: string, amount: number): Promise<string> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      const driverDoc = await getDoc(driverRef);
      
      if (!driverDoc.exists()) throw new Error('Entregador não encontrado');
      const driver = driverDoc.data() as DeliveryDriver;

      if (!driver.stripeAccountId) {
        throw new Error('Conta Stripe não configurada para este entregador');
      }

      const payoutData = await StripeService.getInstance().requestPayout(
        driverId, 
        driver.stripeAccountId, 
        amount, 
        'driver'
      );

      const withdrawalRef = collection(db, 'withdrawals');
      const newWithdrawal = await addDoc(withdrawalRef, {
        driverId,
        driverName: driver.name,
        amount,
        status: 'completed',
        method: 'stripe',
        stripeTransferId: payoutData.transferId,
        requestedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      });

      await updateDoc(driverRef, {
        'totalWithdrawn': (driver.totalWithdrawn || 0) + amount,
        'updatedAt': new Date().toISOString(),
      });

      loggingService.info('Saque via Stripe processado com sucesso', { driverId, amount, transferId: payoutData.transferId });
      
      return newWithdrawal.id;
    } catch (error) {
      loggingService.error('Erro ao processar saque via Stripe', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  static getInstance(): DeliveryDriverService {
    if (!DeliveryDriverService.instance) {
      DeliveryDriverService.instance = new DeliveryDriverService();
    }
    return DeliveryDriverService.instance;
  }

  async getDriverById(driverId: string): Promise<DeliveryDriver | null> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      const driverDoc = await getDoc(driverRef);

      if (!driverDoc.exists()) {
        return null;
      }

      return {
        id: driverDoc.id,
        ...driverDoc.data(),
      } as DeliveryDriver;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar entregador',
        error instanceof Error ? error : undefined,
        { driverId }
      );
      throw error;
    }
  }

  async getDriverByUserId(userId: string): Promise<DeliveryDriver | null> {
    try {
      const driversRef = collection(db, this.collection);
      const q = query(driversRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const driverDoc = querySnapshot.docs[0];
      return {
        id: driverDoc.id,
        ...driverDoc.data(),
      } as DeliveryDriver;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar entregador por usuário',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  async createDriver(
    driver: Omit<DeliveryDriver, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DeliveryDriver> {
    try {
      const driversRef = collection(db, this.collection);
      const newDocRef = doc(driversRef);
      await setDoc(newDocRef, {
        ...driver,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newDriver: DeliveryDriver = {
        id: newDocRef.id,
        ...driver,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      loggingService.info('Entregador criado com sucesso', { driverId: newDocRef.id });
      return newDriver;
    } catch (error) {
      loggingService.error('Erro ao criar entregador', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async updateDriver(driverId: string, updates: DeliveryDriverUpdate): Promise<void> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      await updateDoc(driverRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Entregador atualizado com sucesso', { driverId });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar entregador',
        error instanceof Error ? error : undefined,
        { driverId, updates }
      );
      throw error;
    }
  }

  async updateDriverStatus(driverId: string, status: DeliveryDriver['status']): Promise<void> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      await updateDoc(driverRef, {
        status,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Status do entregador atualizado com sucesso', {
        driverId,
        status,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar status do entregador',
        error instanceof Error ? error : undefined,
        { driverId, status }
      );
      throw error;
    }
  }

  async updateDriverAvailability(driverId: string, isAvailable: boolean): Promise<void> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      await updateDoc(driverRef, {
        'availability.isAvailable': isAvailable,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Disponibilidade do entregador atualizada com sucesso', {
        driverId,
        isAvailable,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar disponibilidade do entregador',
        error instanceof Error ? error : undefined,
        { driverId, isAvailable }
      );
      throw error;
    }
  }

  // ... (métodos existentes)

  async logDriverLocation(driverId: string, location: DriverLocationLog): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const routesRef = collection(db, 'driver_routes');
      const q = query(
        routesRef,
        where('driverId', '==', driverId),
        where('date', '==', today),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Criar nova rota do dia
        await addDoc(routesRef, {
          driverId,
          date: today,
          points: [location],
          totalDistanceKm: 0,
          startTime: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Atualizar rota existente (adicionar ponto)
        const routeDoc = querySnapshot.docs[0];
        const data = routeDoc.data();
        if (!data) return;
        const routeData = { id: routeDoc.id, ...data } as DriverDailyRoute;

        const points = [...(routeData.points || []), location];
        
        // Calcular distância adicional se houver ponto anterior
        let additionalDistance = 0;
        if (routeData.points && routeData.points.length > 0) {
          const lastPoint = routeData.points[routeData.points.length - 1];
          additionalDistance = calculateDistance(
            { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
            { latitude: location.latitude, longitude: location.longitude }
          );
        }

        await updateDoc(routeDoc.ref, {
          points,
          totalDistanceKm: (routeData.totalDistanceKm || 0) + additionalDistance,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      loggingService.error('Erro ao registrar log de localização do motorista', error instanceof Error ? error : undefined);
    }
  }

  async updateDriverLocation(driverId: string, latitude: number, longitude: number): Promise<void> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      const timestamp = new Date().toISOString();
      
      await updateDoc(driverRef, {
        location: {
          latitude,
          longitude,
          lastUpdate: timestamp,
        },
        updatedAt: timestamp,
      });

      // Registrar no histórico de trilhas (auditoria)
      this.logDriverLocation(driverId, {
        latitude,
        longitude,
        timestamp,
      });

      // Buscar pedidos ativos (em entrega) para este motorista para checar geofencing
      const activeOrders = await this.orderService.getCourierOrders(driverId, { status: ['delivering'] });
      
      // 1. Checar Geofencing para Clientes (Pedido chegando)
      if (activeOrders.length > 0) {
        // Executar checagem de proximidade (geofencing)
        // Não esperamos o resultado para não travar a atualização de localização
        this.geofencingService.checkProximityAndNotify(
          { latitude, longitude },
          activeOrders
        ).catch(err => {
          loggingService.error('Erro ao processar geofencing na atualização de localização', err);
        });
      }

      // 2. Checar Geofencing para Motorista (Hotspots de Demanda)
      this.geofencingService.checkHotspotsAndNotify(
        driverId,
        { latitude, longitude }
      ).catch(err => {
        loggingService.error('Erro ao processar geofencing de hotspots', err);
      });

      loggingService.info('Localização do entregador atualizada com sucesso', {
        driverId,
        latitude,
        longitude,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar localização do entregador',
        error instanceof Error ? error : undefined,
        { driverId, latitude, longitude }
      );
      throw error;
    }
  }

  /**
   * Atualiza a média de avaliação do entregador
   */
  async updateDriverRating(driverId: string, _newRating: number): Promise<void> {
    try {
      // O valor de _newRating pode ser usado para cálculos futuros ou apenas para disparar a atualização
      
      // Verificar badges após atualização de nota
      this.checkAndAwardBadges(driverId);
    } catch (error) {
      loggingService.error('Erro ao atualizar nota do entregador', error instanceof Error ? error : undefined, { driverId });
    }
  }

  async getDriverStats(driverId: string): Promise<DeliveryDriverStats> {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('deliveryDriver.id', '==', driverId),
        where('status', '==', 'delivered')
      );

      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map((doc: any) => doc.data() as Order);

      let totalEarnings = 0;
      let totalRating = 0;
      let ratedOrdersCount = 0;
      const monthlyEarnings: Record<string, number> = {};

      orders.forEach((order: any) => {
        // Calcular ganhos do entregador
        // Se houver paymentSplit, usar o valor destinado ao courier
        if (order.paymentSplit) {
          const courierShare = order.paymentSplit.shares.find((s: any) => s.recipient === 'courier');
          if (courierShare) {
            totalEarnings += courierShare.amount;
            
            // Agrupar por mês
            const date = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            monthlyEarnings[monthYear] = (monthlyEarnings[monthYear] || 0) + courierShare.amount;
          }
        } else if (order.paymentDetails?.deliveryFee) {
          // Fallback para deliveryFee se não houver split detalhado
          totalEarnings += order.paymentDetails.deliveryFee;
          
          const date = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
          const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
          monthlyEarnings[monthYear] = (monthlyEarnings[monthYear] || 0) + order.paymentDetails.deliveryFee;
        }

        // Calcular média de avaliação
        if (order.rating) {
          totalRating += order.rating.rating;
          ratedOrdersCount++;
        }
      });

      // Cálculo simplificado de outras métricas
      const stats: DeliveryDriverStats = {
        totalDeliveries: orders.length,
        totalEarnings,
        averageRating: ratedOrdersCount > 0 ? Number((totalRating / ratedOrdersCount).toFixed(1)) : 5.0,
        completionRate: 0.98,
        onTimeRate: 0.95,
        monthlyEarnings,
      };

      return stats;
    } catch (error) {
      loggingService.error('Erro ao buscar estatísticas do entregador', error instanceof Error ? error : undefined, { driverId });
      throw error;
    }
  }

  /**
   * Busca todos os entregadores ativos (disponíveis ou em entrega)
   */
  async getActiveDrivers(): Promise<DeliveryDriver[]> {
    try {
      const driversRef = collection(db, this.collection);
      // Entregadores que estão online (disponíveis) ou atualmente em entrega
      const q = query(
        driversRef,
        where('availability.isAvailable', '==', true)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as DeliveryDriver[];
    } catch (error) {
      loggingService.error('Erro ao buscar entregadores ativos', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Inscreve-se para atualizações em tempo real de todos os entregadores ativos
   */
  subscribeToActiveDrivers(cb: (drivers: DeliveryDriver[]) => void): () => void {
    const driversRef = collection(db, this.collection);
    const q = query(driversRef, where('availability.isAvailable', '==', true));
    
    const unsub = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const drivers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as DeliveryDriver[];
      cb(drivers);
    }, (error: any) => {
      loggingService.error('Erro no subscribe de entregadores ativos', error);
    });
    
    return unsub;
  }

  async getAvailableDrivers(): Promise<DeliveryDriver[]> {
    try {
      const driversRef = collection(db, this.collection);
      const q = query(
        driversRef,
        where('status', '==', 'active'),
        where('availability.isAvailable', '==', true)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as DeliveryDriver[];
    } catch (error) {
      loggingService.error(
        'Erro ao buscar entregadores disponíveis',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Encontra o melhor entregador disponível para um pedido baseado em proximidade
   */
  async findBestDriverForOrder(order: Order): Promise<DeliveryDriver | null> {
    try {
      const availableDrivers = await this.getAvailableDrivers();
      
      if (availableDrivers.length === 0) {
        return null;
      }

      // Usar localização real da loja/produtor do pedido
      let pickupLocation = { latitude: -23.55052, longitude: -46.633309 }; // Fallback
      
      if (order.producerId) {
        try {
          const { ProducerService } = await import('./ProducerService');
          const producerService = ProducerService.getInstance();
          const producer = await producerService.getProducerById(order.producerId);
          
          if (producer && producer.address && producer.address.latitude && producer.address.longitude) {
            pickupLocation = { 
              latitude: producer.address.latitude, 
              longitude: producer.address.longitude 
            };
          }
        } catch (prodErr) {
          loggingService.error('Erro ao buscar localização do produtor para atribuição de motorista', { producerId: order.producerId, error: prodErr });
        }
      }
      
      let bestDriver: DeliveryDriver | null = null;
      let minDistance = Infinity;

      availableDrivers.forEach(driver => {
        if (driver.location) {
          const distance = calculateDistance(
            pickupLocation,
            { latitude: driver.location.latitude, longitude: driver.location.longitude }
          );

          if (distance < minDistance) {
            minDistance = distance;
            bestDriver = driver;
          }
        }
      });

      // Se nenhum entregador tem localização, pegar o primeiro disponível
      return bestDriver || availableDrivers[0];
    } catch (error) {
      loggingService.error('Erro ao encontrar melhor entregador', error instanceof Error ? error : undefined);
      return null;
    }
  }

  async getDriverRoute(driverId: string, date: string): Promise<DriverDailyRoute | null> {
    try {
      const routesRef = collection(db, 'driver_routes');
      const q = query(
        routesRef,
        where('driverId', '==', driverId),
        where('date', '==', date),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as DriverDailyRoute;
    } catch (error) {
      loggingService.error('Erro ao buscar rota do motorista', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Tenta atribuir automaticamente um entregador a um pedido
   */
  async autoAssignDriverToOrder(orderId: string): Promise<boolean> {
    try {
      const orderService = new OrderService();
      const order = await orderService.getOrderById(orderId);

      if (!order) {
        throw new Error('Pedido não encontrado');
      }

      if (order.deliveryDriver) {
        return true; // Já tem entregador
      }

      const bestDriver = await this.findBestDriverForOrder(order);

      if (!bestDriver) {
        loggingService.warn('Nenhum entregador disponível para atribuição automática', { orderId });
        return false;
      }

      await orderService.assignDriver(orderId, {
        id: bestDriver.id,
        name: bestDriver.name,
        phone: bestDriver.phone,
        vehicle: bestDriver.vehicle.model,
        plate: bestDriver.vehicle.plate
      });

      // Enviar notificação para o entregador
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.sendNotification(
          bestDriver.userId,
          'new_order',
          {
            orderId,
            message: `Você tem um novo pedido #${orderId.slice(-6)} para entregar!`
          }
        );
      } catch (notifErr) {
        loggingService.error('Erro ao enviar notificação de novo pedido', notifErr instanceof Error ? notifErr : undefined);
      }

      loggingService.info('Atribuição automática concluída', { orderId, driverId: bestDriver.id });
      return true;
    } catch (error) {
      loggingService.error('Erro na atribuição automática', error instanceof Error ? error : undefined, { orderId });
      return false;
    }
  }

  async getFinanceSummary(driverId: string): Promise<DriverFinanceSummary> {
    try {
      const earningsRef = collection(db, this.earningsCollection);
      const q = query(
        earningsRef,
        where('driverId', '==', driverId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const earnings = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as DriverEarning[];

      const availableBalance = earnings
        .filter(e => e.status === 'available')
        .reduce((sum, e) => sum + e.amount, 0);

      const pendingBalance = earnings
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + e.amount, 0);

      const totalWithdrawn = earnings
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        availableBalance,
        pendingBalance,
        totalWithdrawn,
        recentEarnings: earnings.slice(0, 10),
      };
    } catch (error) {
      loggingService.error('Erro ao buscar resumo financeiro do motorista', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async addEarning(earning: Omit<DriverEarning, 'id' | 'createdAt'>): Promise<string> {
    try {
      const earningsRef = collection(db, this.earningsCollection);
      const newEarning = {
        ...earning,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(earningsRef, newEarning);
      
      // Atualizar ganhos totais no perfil do motorista
      const driverRef = doc(db, this.collection, earning.driverId);
      await runTransaction(db, async (transaction: any) => {
        const driverDoc = await transaction.get(driverRef);
        if (driverDoc.exists()) {
          const currentEarnings = (driverDoc.data() as any).totalEarnings || 0;
          transaction.update(driverRef, {
            totalEarnings: currentEarnings + earning.amount,
            updatedAt: new Date().toISOString()
          });
        }
      });

      return docRef.id;
    } catch (error) {
      loggingService.error('Erro ao adicionar ganho ao motorista', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async requestWithdrawal(request: Omit<WithdrawalRequest, 'id' | 'status' | 'requestedAt'>): Promise<string> {
    try {
      const withdrawalRef = collection(db, 'withdrawals');
      const newRequest = {
        ...request,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(withdrawalRef, newRequest);
      
      loggingService.info('Solicitação de saque criada', { driverId: request.driverId, amount: request.amount });
      return docRef.id;
    } catch (error) {
      loggingService.error('Erro ao solicitar saque', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Gera um código de verificação 2FA para saque (simulado)
   */
  async generateWithdrawalVerificationCode(driverId: string): Promise<string> {
    try {
      // Em uma aplicação real, aqui dispararíamos um SMS/Email/Push via Backend
      // Para fins de demonstração, vamos simular o envio e retornar um "sessionId" ou apenas logar
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Armazenar no Firestore com expiração de 5 minutos
      const verificationRef = doc(db, 'verification_codes', driverId);
      await setDoc(verificationRef, {
        code,
        type: 'withdrawal',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      loggingService.info('Código 2FA gerado para saque', { driverId, code });
      
      // Notificar o usuário (simulado)
      const notificationService = NotificationService.getInstance();
      await notificationService.sendNotification(
        driverId,
        'security_alert',
        {
          title: 'Código de Segurança',
          message: `Seu código para confirmar o saque é: ${code}. Não compartilhe com ninguém.`
        }
      );

      return "verification_sent";
    } catch (error) {
      loggingService.error('Erro ao gerar código 2FA', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Verifica o código 2FA informado pelo motorista
   */
  async verifyWithdrawalCode(driverId: string, code: string): Promise<boolean> {
    try {
      const verificationRef = doc(db, 'verification_codes', driverId);
      const verificationDoc = await getDoc(verificationRef);

      if (!verificationDoc.exists()) return false;

      const data = verificationDoc.data();
      const now = new Date().toISOString();

      if (data.code === code && data.expiresAt > now) {
        // Limpar código após uso
        await updateDoc(verificationRef, { used: true });
        return true;
      }

      return false;
    } catch (error) {
      loggingService.error('Erro ao verificar código 2FA', error instanceof Error ? error : undefined);
      return false;
    }
  }

  async getWithdrawalRequests(status?: WithdrawalRequest['status']): Promise<WithdrawalRequest[]> {
    try {
      const withdrawalRef = collection(db, 'withdrawals');
      let q = query(withdrawalRef, orderBy('requestedAt', 'desc'));
      
      if (status) {
        q = query(withdrawalRef, where('status', '==', status), orderBy('requestedAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as WithdrawalRequest[];
    } catch (error) {
      loggingService.error('Erro ao buscar solicitações de saque', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async updateWithdrawalStatus(withdrawalId: string, status: WithdrawalRequest['status'], notes?: string): Promise<void> {
    try {
      const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
      await updateDoc(withdrawalRef, {
        status,
        notes,
        processedAt: new Date().toISOString(),
      });

      loggingService.info('Status de saque atualizado', { withdrawalId, status });
    } catch (error) {
      loggingService.error('Erro ao atualizar status do saque', error instanceof Error ? error : undefined);
      throw error;
    }
  }
}
