import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order } from '../types/Order';
import { User } from '../models/User';
import { loggingService } from './LoggingService';

export interface CityExpansionMetrics {
  cityId: string;
  cityName: string;
  activeProducers: number;
  activeUsers: number;
  totalOrders: number;
  revenue: number;
  opportunityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPANSION_OPPORTUNITY';
}

export class MarketplaceExpansionService {
  private static instance: MarketplaceExpansionService;

  private constructor() {
    loggingService.info('MarketplaceExpansionService: Iniciando motor de escala geográfica');
  }

  public static getInstance(): MarketplaceExpansionService {
    if (!MarketplaceExpansionService.instance) {
      MarketplaceExpansionService.instance = new MarketplaceExpansionService();
    }
    return MarketplaceExpansionService.instance;
  }

  /**
   * Calcula métricas de performance por cidade
   */
  public async getCityMetrics(): Promise<CityExpansionMetrics[]> {
    try {
      loggingService.info('Marketplace: Analisando performance geográfica...');

      const { getDocs } = await import('firebase/firestore');
      const usersSnap = await getDocs(collection(db, 'usuarios'));
      const ordersSnap = await getDocs(collection(db, 'orders'));
      
      const cityMap: Record<string, CityExpansionMetrics> = {};

      // 1. Mapear usuários por cidade
      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data() as unknown as User;
        const cityId = userData.cityId || 'UNKNOWN';
        const cityName = userData.endereco?.[0]?.cidade || 'Não Definida';

        if (!cityMap[cityId]) {
          cityMap[cityId] = {
            cityId,
            cityName,
            activeProducers: 0,
            activeUsers: 0,
            totalOrders: 0,
            revenue: 0,
            opportunityLevel: 'LOW'
          };
        }

        cityMap[cityId].activeUsers++;
        if (userData.role === 'producer' || userData.role === 'admin') {
          cityMap[cityId].activeProducers++;
        }
      }

      // 2. Mapear pedidos por cidade
      for (const orderDoc of ordersSnap.docs) {
        const orderData = orderDoc.data() as unknown as Order;
        const cityId = orderData.cityId || 'UNKNOWN';

        if (cityMap[cityId]) {
          cityMap[cityId].totalOrders++;
          cityMap[cityId].revenue += (orderData.totalAmount || 0);
        }
      }

      // 3. Identificar Oportunidades de Expansão
      Object.values(cityMap).forEach(metrics => {
        if (metrics.activeUsers > 10 && metrics.activeProducers === 0) {
          metrics.opportunityLevel = 'EXPANSION_OPPORTUNITY';
        } else if (metrics.revenue > 1000) {
          metrics.opportunityLevel = 'HIGH';
        } else if (metrics.revenue > 500) {
          metrics.opportunityLevel = 'MEDIUM';
        }
      });

      return Object.values(cityMap).sort((a, b) => b.revenue - a.revenue);
    } catch (error: any) {
      loggingService.error('Marketplace: Erro ao calcular métricas geográficas', { error: error.message });
      return [];
    }
  }

  /**
   * Ativa uma nova cidade com incentivos automáticos
   */
  public async activateCity(cityId: string): Promise<void> {
    try {
      loggingService.info('Marketplace: Ativando nova cidade...', { cityId });
      
      // 1. Criar cupom de lançamento para a cidade
      await addDoc(collection(db, 'coupons'), {
        code: `DOCE${cityId.substring(0, 3).toUpperCase()}`,
        discountType: 'percentage',
        value: 20,
        cityId,
        active: true,
        description: 'Bem-vindo! Cupom de inauguração na sua cidade.',
        createdAt: serverTimestamp()
      });

      // 2. Notificar usuários da região (simulado)
      loggingService.info('Marketplace: Cidade ativada com sucesso.', { cityId });
    } catch (error: any) {
      loggingService.error('Marketplace: Erro ao ativar cidade', { error: error.message });
    }
  }

  /**
   * Onboarding simplificado de produtor
   */
  public async fastOnboardingProducer(userId: string, cityId: string, businessData: any): Promise<void> {
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, {
        role: 'producer',
        cityId,
        producerStatus: 'active',
        businessName: businessData.name,
        updatedAt: serverTimestamp()
      });
      loggingService.info('Marketplace: Produtor ativado rapidamente.', { userId, cityId });
    } catch (error: any) {
      loggingService.error('Marketplace: Erro no onboarding rápido', { error: error.message });
    }
  }
}
