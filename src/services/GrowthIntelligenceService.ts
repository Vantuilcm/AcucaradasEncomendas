import { f } from '../config/firebase';
const { collection, query, where, getDocs, limit, addDoc, serverTimestamp } = f;
import { db } from '../config/firebase';
import { Order } from '../types/Order';
import { User } from '../models/User';
import { loggingService } from './LoggingService';

export interface GrowthMetrics {
  cac: number;
  ltv: number;
  averageTicket: number;
  repurchaseRate: number;
  conversionRate: number;
  retentionRate: number;
  referralRevenue: number;
  topReferrers: Array<{ userId: string; name: string; count: number; value: number }>;
  funnel: {
    visitors: number;
    registered: number;
    purchased: number;
    returned: number;
  };
}

export class GrowthIntelligenceService {
  private static instance: GrowthIntelligenceService;

  private constructor() {
    loggingService.info('GrowthIntelligenceService: Iniciando motor analítico');
  }

  public static getInstance(): GrowthIntelligenceService {
    if (!GrowthIntelligenceService.instance) {
      GrowthIntelligenceService.instance = new GrowthIntelligenceService();
    }
    return GrowthIntelligenceService.instance;
  }

  /**
   * Calcula métricas base de crescimento
   */
  public async calculateMetrics(): Promise<GrowthMetrics> {
    try {
      loggingService.info('Growth: Calculando métricas de inteligência...');

      // 1. Obter todos os dados necessários (em janelas de tempo se necessário)
      const usersSnap = await getDocs(collection(db, 'usuarios'));
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const referralsSnap = await getDocs(collection(db, 'referrals'));
      
      const totalUsers = usersSnap.docs.length;
      const totalOrders = ordersSnap.docs.length;
      const allOrders = ordersSnap.docs.map(doc => doc.data() as unknown as Order);
      const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as User));

      // 2. Ticket Médio
      const totalRevenue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // 3. LTV (Lifetime Value)
      const ltv = totalUsers > 0 ? totalRevenue / totalUsers : 0;

      // 4. Taxa de Recompra
      const userOrderCounts: Record<string, number> = {};
      allOrders.forEach(o => {
        userOrderCounts[o.userId] = (userOrderCounts[o.userId] || 0) + 1;
      });
      const repeatCustomers = Object.values(userOrderCounts).filter(count => count > 1).length;
      const repurchaseRate = totalUsers > 0 ? (repeatCustomers / totalUsers) * 100 : 0;

      // 5. Funil de Vendas (Simulado com base em dados reais)
      const visitors = totalUsers * 1.5; // Estimativa baseada em tráfego vs cadastro
      const purchasedUsers = Object.keys(userOrderCounts).length;
      const returnedUsers = repeatCustomers;

      const funnel = {
        visitors: Math.floor(visitors),
        registered: totalUsers,
        purchased: purchasedUsers,
        returned: returnedUsers
      };

      const conversionRate = funnel.registered > 0 ? (funnel.purchased / funnel.registered) * 100 : 0;
      const retentionRate = funnel.purchased > 0 ? (funnel.returned / funnel.purchased) * 100 : 0;

      // 6. Performance de Indicação
      let referralRevenue = 0;
      referralsSnap.docs.forEach(doc => {
        const data = doc.data() as any;
        if (data && data.status === 'completed') {
          referralRevenue += Number(data.valueGenerated || 0);
        }
      });

      // 7. Ranking de Indicadores (Top Referrers)
      const topReferrers = allUsers
        .filter(u => (u.referralCount || 0) > 0)
        .map(u => ({
          userId: u.id,
          name: u.nome || 'Usuário',
          count: u.referralCount || 0,
          value: u.totalReferralValue || 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const metrics: GrowthMetrics = {
        cac: 15.50, // Exemplo: custo fixo por enquanto ou calculado via marketing_costs collection
        ltv,
        averageTicket,
        repurchaseRate,
        conversionRate,
        retentionRate,
        referralRevenue,
        topReferrers,
        funnel
      };

      // 8. Salvar histórico diário
      await this.persistDailyMetrics(metrics);

      return metrics;
    } catch (error: any) {
      loggingService.error('GrowthIntel: Erro ao calcular métricas', { error: error.message });
      throw error;
    }
  }

  /**
   * Persiste métricas para análise histórica
   */
  private async persistDailyMetrics(metrics: GrowthMetrics): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const metricsRef = collection(db, 'growth_metrics_daily');
      
      // Evitar duplicidade no mesmo dia
      const q = query(metricsRef, where('date', '==', today), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        await addDoc(metricsRef, {
          date: today,
          timestamp: serverTimestamp(),
          ...metrics
        });
      }
    } catch (e) {
      console.warn('Erro ao persistir métricas diárias');
    }
  }

  /**
   * Detecta anomalias e gera alertas inteligentes
   */
  public async detectAnomalies(currentMetrics: GrowthMetrics): Promise<string[]> {
    const alerts: string[] = [];
    
    // Buscar métricas de ontem para comparação
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const q = query(collection(db, 'growth_metrics_daily'), where('date', '==', yesterdayStr), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const prev = snap.docs[0].data() as unknown as GrowthMetrics;
      
      if (currentMetrics.conversionRate < prev.conversionRate * 0.8) {
        alerts.push('🚨 Queda acentuada na taxa de conversão (>20%)');
      }
      
      if (currentMetrics.funnel.purchased < prev.funnel.purchased * 0.7) {
        alerts.push('🚨 Volume de vendas caiu significativamente em relação a ontem');
      }
    }

    return alerts;
  }
}
