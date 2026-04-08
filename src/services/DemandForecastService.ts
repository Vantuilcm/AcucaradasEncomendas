import { f } from '../config/firebase';
const { collection, query, where, getDocs, Timestamp, addDoc, serverTimestamp } = f;
import { db } from '../config/firebase';
import { Product } from '../types/Product';
import { loggingService } from './LoggingService';

export interface ProductDemandInsight {
  productId: string;
  productName: string;
  vendas7d: number;
  vendas1d: number;
  score: number;
  demandLevel: 'ALTA' | 'MÉDIA' | 'BAIXA';
  trend: 'UP' | 'DOWN' | 'STABLE';
  repositionRequired: boolean;
  currentStock: number;
}

export class DemandForecastService {
  private static instance: DemandForecastService;

  private constructor() {}

  public static getInstance(): DemandForecastService {
    if (!DemandForecastService.instance) {
      DemandForecastService.instance = new DemandForecastService();
    }
    return DemandForecastService.instance;
  }

  /**
   * Gera insights de demanda para todos os produtos
   */
  public async generateDemandInsights(): Promise<ProductDemandInsight[]> {
    try {
      loggingService.info('Demand: Iniciando análise estatística de demanda...');
      
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 1. Buscar pedidos dos últimos 7 dias
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('createdAt', '>=', sevenDaysAgo));
      const querySnapshot = await getDocs(q);
      
      const salesMap: Record<string, { vendas7d: number; vendas1d: number; name: string }> = {};

      for (const docSnapshot of querySnapshot.docs) {
        const orderData = docSnapshot.data() as any;
        if (!orderData) continue;
        
        const createdAtRaw = orderData.createdAt;
        let orderDate: Date;

        if (createdAtRaw instanceof Timestamp) {
          orderDate = createdAtRaw.toDate();
        } else if (createdAtRaw instanceof Date) {
          orderDate = createdAtRaw;
        } else if (typeof createdAtRaw === 'string' || typeof createdAtRaw === 'number') {
          orderDate = new Date(createdAtRaw);
        } else {
          continue;
        }
        
        const items = orderData.items;
        if (items && Array.isArray(items)) {
          items.forEach((item: any) => {
            if (!salesMap[item.productId]) {
              salesMap[item.productId] = { vendas7d: 0, vendas1d: 0, name: item.name };
            }
            
            salesMap[item.productId].vendas7d += item.quantity || 0;
            
            if (orderDate >= oneDayAgo) {
              salesMap[item.productId].vendas1d += item.quantity || 0;
            }
          });
        }
      }

      // 2. Buscar dados atuais de estoque dos produtos
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const insights: ProductDemandInsight[] = [];

      for (const docSnapshot of productsSnapshot.docs) {
        const productId = docSnapshot.id;
        const productData = docSnapshot.data() as unknown as Product;
        const sales = salesMap[productId] || { vendas7d: 0, vendas1d: 0, name: productData.nome };

        // Score: (vendas_7d * 0.7) + (vendas_1d * 0.3)
        const score = (sales.vendas7d * 0.7) + (sales.vendas1d * 0.3);
        
        // Classificação
        let demandLevel: 'ALTA' | 'MÉDIA' | 'BAIXA' = 'BAIXA';
        if (score > 10) demandLevel = 'ALTA';
        else if (score > 3) demandLevel = 'MÉDIA';

        // Tendência simples
        const avgDaily = sales.vendas7d / 7;
        const trend = sales.vendas1d > avgDaily * 1.2 ? 'UP' : (sales.vendas1d < avgDaily * 0.8 ? 'DOWN' : 'STABLE');

        // Reposição
        const currentStock = productData.estoque || 0;
        const repositionRequired = demandLevel === 'ALTA' && currentStock < (sales.vendas7d / 2);

        insights.push({
          productId,
          productName: sales.name || 'Produto Sem Nome',
          vendas7d: sales.vendas7d,
          vendas1d: sales.vendas1d,
          score,
          demandLevel,
          trend,
          repositionRequired,
          currentStock
        });
      }

      // Ordenar por score de demanda
      const sortedInsights = insights.sort((a, b) => b.score - a.score);
      
      // Salvar log de insights para histórico (opcional, sem travar o retorno)
      try {
        await addDoc(collection(db, 'demand_insights'), {
          calculatedAt: serverTimestamp(),
          topProducts: sortedInsights.slice(0, 5) as any,
          totalAnalyzed: insights.length
        });
      } catch (e) {
        console.warn('Erro ao salvar log de demanda');
      }

      return sortedInsights;
    } catch (error: any) {
      loggingService.error('Demand: Erro ao gerar insights', { error: error.message });
      return [];
    }
  }
}
