import { Order } from '../types/Order';
import { RouteService } from './RouteService';
import { loggingService } from './LoggingService';

export interface ETAResult {
  estimatedTimeMinutes: number;
  preparationTimeMinutes: number;
  deliveryTimeMinutes: number;
  totalTimeMinutes: number;
  estimatedArrival: Date;
}

export class ETAService {
  private static instance: ETAService;
  private routeService: RouteService;

  // Constantes de heurística (podem ser movidas para config)
  private readonly BASE_PREPARATION_TIME = 15; // minutos
  private readonly ITEM_PREPARATION_TIME = 5; // minutos por item único
  private readonly BASE_TRAFFIC_MULTIPLIER = 1.2; // 20% de margem para tráfego normal
  private readonly PEAK_TRAFFIC_MULTIPLIER = 1.6; // 60% de margem para horários de pico
  private readonly BUFFER_TIME = 5; // minutos extras de margem de segurança

  private constructor() {
    this.routeService = new RouteService();
  }

  public static getInstance(): ETAService {
    if (!ETAService.instance) {
      ETAService.instance = new ETAService();
    }
    return ETAService.instance;
  }

  /**
   * Determina o multiplicador de tráfego com base na hora atual
   */
  private getTrafficMultiplier(): number {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay();

    // Horários de pico: 11:00-14:00 (almoço) e 18:00-21:00 (jantar)
    const isPeakHour = (hours >= 11 && hours <= 14) || (hours >= 18 && hours <= 21);
    
    // Fins de semana podem ter tráfego diferente, mas para comida o pico é similar
    return isPeakHour ? this.PEAK_TRAFFIC_MULTIPLIER : this.BASE_TRAFFIC_MULTIPLIER;
  }

  /**
   * Calcula o ETA completo para um pedido
   */
  public async calculateOrderETA(order: Order, storeLocation: { latitude: number, longitude: number }): Promise<ETAResult | null> {
    try {
      // 1. Calcular tempo de preparação (Heurística)
      const preparationTime = this.calculatePreparationTime(order);

      // 2. Calcular tempo de entrega (Google Maps + Heurística de Tráfego)
      let deliveryTime = 20; // Default caso falte coordenadas
      const trafficMultiplier = this.getTrafficMultiplier();
      
      if (order.deliveryAddress?.coordinates) {
        const routeData = await this.routeService.getRouteData(
          storeLocation,
          order.deliveryAddress.coordinates
        );

        if (routeData) {
          // Se o Google Maps retornar duration_in_traffic, poderíamos usar diretamente.
          // Como o RouteService parece retornar a duração base, aplicamos nosso multiplicador.
          deliveryTime = Math.ceil((routeData.duration / 60) * trafficMultiplier);
        }
      }

      const totalTime = preparationTime + deliveryTime + this.BUFFER_TIME;
      const estimatedArrival = new Date();
      estimatedArrival.setMinutes(estimatedArrival.getMinutes() + totalTime);

      loggingService.info('ETA calculado com sucesso', { 
        orderId: order.id, 
        totalTime, 
        trafficMultiplier,
        preparationTime,
        deliveryTime
      });

      return {
        estimatedTimeMinutes: totalTime,
        preparationTimeMinutes: preparationTime,
        deliveryTimeMinutes: deliveryTime,
        totalTimeMinutes: totalTime,
        estimatedArrival
      };
    } catch (error) {
      loggingService.error('Erro ao calcular ETA', error as Error);
      return null;
    }
  }

  /**
   * Heurística para tempo de preparação baseado nos itens do pedido
   */
  private calculatePreparationTime(order: Order): number {
    const uniqueItemsCount = order.items.length;
    const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Base + (itens únicos * tempo por item) + (ajuste para grandes quantidades)
    const time = this.BASE_PREPARATION_TIME + 
                 (uniqueItemsCount * this.ITEM_PREPARATION_TIME) +
                 (totalItemsCount > 5 ? (totalItemsCount - 5) * 2 : 0);
    
    return Math.min(time, 90); // Máximo de 90 minutos de preparo
  }
}
