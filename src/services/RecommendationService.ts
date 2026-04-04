import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { loggingService } from './LoggingService';

export interface ProductRecommendation {
  productId: string;
  productName: string;
  recommendedProductId: string;
  recommendedProductName: string;
  strength: number; // Frequência que foram comprados juntos
}

export class RecommendationService {
  private static instance: RecommendationService;

  private constructor() {}

  public static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  /**
   * Analisa pedidos para descobrir quais produtos são frequentemente comprados juntos
   */
  public async generateMarketBasketAnalysis(): Promise<ProductRecommendation[]> {
    try {
      loggingService.info('Recommendation: Analisando cestas de compras...');
      
      // Buscar últimos 200 pedidos para análise
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, limit(200));
      const querySnapshot = await getDocs(q);
      
      const coOccurrenceMap: Record<string, Record<string, number>> = {};
      const productNameMap: Record<string, string> = {};

      for (const docSnapshot of querySnapshot.docs) {
        const orderData = docSnapshot.data() as any;
        if (!orderData) continue;
        
        const items = orderData.items;
        
        if (!items || !Array.isArray(items) || items.length < 2) continue;

        // Criar pares de produtos comprados na mesma cesta
        for (let i = 0; i < items.length; i++) {
          const p1Id = items[i].productId;
          const p1Name = items[i].name;
          if (p1Id && p1Name) productNameMap[p1Id] = p1Name;

          for (let j = i + 1; j < items.length; j++) {
            const p2Id = items[j].productId;
            const p2Name = items[j].name;
            if (p2Id && p2Name) productNameMap[p2Id] = p2Name;

            if (!p1Id || !p2Id) continue;

            if (!coOccurrenceMap[p1Id]) coOccurrenceMap[p1Id] = {};
            if (!coOccurrenceMap[p2Id]) coOccurrenceMap[p2Id] = {};

            coOccurrenceMap[p1Id][p2Id] = (coOccurrenceMap[p1Id][p2Id] || 0) + 1;
            coOccurrenceMap[p2Id][p1Id] = (coOccurrenceMap[p2Id][p1Id] || 0) + 1;
          }
        }
      }

      const recommendations: ProductRecommendation[] = [];

      Object.keys(coOccurrenceMap).forEach((p1) => {
        const related = coOccurrenceMap[p1];
        Object.keys(related).forEach((p2) => {
          // Apenas adicionar se p1 < p2 para evitar duplicatas (A+B e B+A)
          if (p1 < p2) {
            recommendations.push({
              productId: p1,
              productName: productNameMap[p1] || 'Produto A',
              recommendedProductId: p2,
              recommendedProductName: productNameMap[p2] || 'Produto B',
              strength: related[p2]
            });
          }
        });
      });

      // Ordenar por força da recomendação
      return recommendations.sort((a, b) => b.strength - a.strength);
    } catch (error: any) {
      loggingService.error('Recommendation: Erro na análise de cesta', { error: error.message });
      return [];
    }
  }
}
