import { calculateDistance } from '../utils/distanceCalculator';
import { MobileNotificationService } from './MobileNotificationService';
import { loggingService } from './LoggingService';
import { Order } from '../types/Order';
import { OrderService } from './OrderService';
import { DemandHotspot } from '../types/DemandHotspot';
import OneSignal from 'react-native-onesignal';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export class GeofencingService {
  private static instance: GeofencingService;
  private notificationService: MobileNotificationService;
  private orderService: OrderService;
  private notifiedOrders: Set<string> = new Set();
  private notifiedHotspots: Map<string, string> = new Map(); // driverId_hotspotId -> timestamp
  private readonly GEOFENCE_RADIUS_METERS = 500;
  private readonly HOTSPOT_COOLDOWN_MS = 1000 * 60 * 30; // 30 minutos de cooldown para notificações de hotspot

  private constructor() {
    this.notificationService = MobileNotificationService.getInstance();
    this.orderService = new OrderService();
  }

  public static getInstance(): GeofencingService {
    if (!GeofencingService.instance) {
      GeofencingService.instance = new GeofencingService();
    }
    return GeofencingService.instance;
  }

  /**
   * Verifica se o entregador está próximo do destino e envia notificação
   * @param driverLocation Localização atual do entregador
   * @param activeOrders Pedidos ativos em entrega pelo motorista
   */
  public async checkProximityAndNotify(
    driverLocation: { latitude: number; longitude: number },
    activeOrders: Order[]
  ): Promise<void> {
    for (const order of activeOrders) {
      // Pular se já notificamos sobre este pedido
      if (order.isArrivingNotified) continue;

      if (!order.deliveryAddress?.coordinates) {
        continue;
      }

      const distanceKm = calculateDistance(
        { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
        { latitude: order.deliveryAddress.coordinates.latitude, longitude: order.deliveryAddress.coordinates.longitude }
      );

      const distanceMeters = distanceKm * 1000;

      if (distanceMeters <= this.GEOFENCE_RADIUS_METERS) {
        await this.sendArrivalNotification(order);
        this.notifiedOrders.add(order.id);
      }
    }
  }

  /**
   * Verifica se o entregador entrou em um Hotspot de alta demanda
   * @param driverId ID do entregador
   * @param driverLocation Localização atual
   */
  public async checkHotspotsAndNotify(
    driverId: string,
    driverLocation: { latitude: number; longitude: number }
  ): Promise<void> {
    try {
      // Em uma aplicação real, isso viria de uma API ou do Firestore
      const hotspots = await this.getAvailableHotspots();
      
      for (const hotspot of hotspots) {
        if (!hotspot.active) continue;

        const distanceKm = calculateDistance(
          driverLocation,
          hotspot.center
        );

        const distanceMeters = distanceKm * 1000;

        if (distanceMeters <= hotspot.radiusMeters) {
          const key = `${driverId}_${hotspot.id}`;
          const lastNotified = this.notifiedHotspots.get(key);
          const now = Date.now();

          if (!lastNotified || (now - parseInt(lastNotified)) > this.HOTSPOT_COOLDOWN_MS) {
            await this.sendHotspotNotification(driverId, hotspot);
            this.notifiedHotspots.set(key, now.toString());
          }
        }
      }
    } catch (error) {
      loggingService.error('Erro ao verificar hotspots de demanda', {
        driverId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async getAvailableHotspots(): Promise<DemandHotspot[]> {
    try {
      // 1. Tentar buscar Hotspots ativos do Firestore
      const hotspotsRef = collection(db, 'demand_hotspots');
      const q = query(hotspotsRef, where('active', '==', true));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as DemandHotspot));
      }

      // 2. Fallback para Mock se o Firestore estiver vazio (para desenvolvimento/teste)
      return [
        {
          id: 'hotspot_centro',
          name: 'Centro Comercial',
          center: { latitude: -23.5505, longitude: -46.6333 },
          radiusMeters: 1000,
          demandLevel: 'high',
          active: true,
          message: 'Alta demanda de pedidos no Centro! Muitos clientes aguardando.',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'hotspot_paulista',
          name: 'Av. Paulista',
          center: { latitude: -23.5614, longitude: -46.6559 },
          radiusMeters: 800,
          demandLevel: 'critical',
          active: true,
          message: 'Demanda CRÍTICA na região da Paulista. Ganhos extras ativos!',
          updatedAt: new Date().toISOString()
        }
      ];
    } catch (error) {
      loggingService.warn('Erro ao buscar hotspots do Firestore, usando mock', { error });
      return [
        {
          id: 'hotspot_centro',
          name: 'Centro Comercial',
          center: { latitude: -23.5505, longitude: -46.6333 },
          radiusMeters: 1000,
          demandLevel: 'high',
          active: true,
          message: 'Alta demanda de pedidos no Centro!',
          updatedAt: new Date().toISOString()
        }
      ];
    }
  }

  private async sendHotspotNotification(driverId: string, hotspot: DemandHotspot): Promise<void> {
    try {
      const title = `🔥 Hotspot: ${hotspot.name}`;
      const message = hotspot.message || `Há uma alta concentração de pedidos nesta área. Aproxime-se para receber mais chamadas!`;

      // Em produção, usamos include_external_user_ids para segmentar o motorista pelo seu ID de usuário
      // O OneSignal mapeia o external_user_id automaticamente se OneSignal.setExternalUserId(userId) foi chamado
      OneSignal.postNotification({
        headings: { en: title, pt: title },
        contents: { en: message, pt: message },
        include_external_user_ids: [driverId], // Usando o ID real do usuário/entregador
        data: {
          type: 'hotspot_alert',
          hotspotId: hotspot.id,
          demandLevel: hotspot.demandLevel
        },
        android_accent_color: hotspot.demandLevel === 'critical' ? 'FF0000' : 'FF9800',
        priority: 10
      });

      loggingService.info('Notificação de Hotspot enviada via OneSignal (External ID)', {
        driverId,
        hotspotId: hotspot.id,
        demandLevel: hotspot.demandLevel
      });
    } catch (error) {
      loggingService.error('Erro ao enviar notificação de hotspot via OneSignal', {
        driverId,
        hotspotId: hotspot.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async sendArrivalNotification(order: Order): Promise<void> {
    try {
      const title = 'Seu pedido está chegando! 🍦';
      const message = `O entregador está a menos de 500m do seu endereço. Prepare-se para receber suas delícias!`;
      
      // Enviar notificação push
      await this.notificationService.sendPushNotification(
        order.userId,
        title,
        message,
        { orderId: order.id, type: 'order_arrival_nearby' },
        'order_status_update'
      );

      // Marcar como notificado no Firestore de forma assíncrona
      this.orderService.updateOrder(order.id, { isArrivingNotified: true }).catch(err => {
        loggingService.error('Erro ao atualizar flag isArrivingNotified no Firestore', {
          orderId: order.id,
          error: err instanceof Error ? err.message : String(err)
        });
      });

      loggingService.info('Notificação de proximidade enviada e registrada', {
        orderId: order.id,
        userId: order.userId
      });
    } catch (error) {
      loggingService.error('Erro ao enviar notificação de proximidade', {
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
