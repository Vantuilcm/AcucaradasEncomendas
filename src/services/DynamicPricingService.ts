import { loggingService } from './LoggingService';

/**
 * Interface para representar um produto com informações de preço
 */
export interface ProductPricing {
  id: string;
  name: string;
  basePrice: number; // Preço base definido pelo produtor
  currentPrice: number; // Preço atual (após ajustes)
  minPrice: number; // Preço mínimo permitido
  maxPrice: number; // Preço máximo permitido
  producerId: string; // ID do produtor
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Interface para representar dados históricos de vendas
 */
export interface SalesData {
  productId: string;
  date: number; // Timestamp da venda
  quantity: number;
  price: number;
  promotionActive: boolean; // Se havia promoção ativa
}

/**
 * Interface para representar um evento sazonal
 */
export interface SeasonalEvent {
  id: string;
  name: string;
  startDate: number; // Timestamp de início
  endDate: number; // Timestamp de fim
  categories: string[]; // Categorias afetadas
  tags: string[]; // Tags afetadas
  adjustmentFactor: number; // Fator de ajuste (ex: 1.1 = +10%)
  description: string;
}

/**
 * Interface para configuração do serviço de precificação dinâmica
 */
export interface DynamicPricingConfig {
  enabled: boolean; // Se o serviço está ativo
  maxAutoAdjustment: number; // Ajuste máximo automático (ex: 0.05 = 5%)
  minDataPoints: number; // Mínimo de pontos de dados para análise
  demandWeight: number; // Peso da demanda na sugestão
  seasonalWeight: number; // Peso da sazonalidade na sugestão
  competitionWeight: number; // Peso da competição na sugestão
  elasticityWeight: number; // Peso da elasticidade na sugestão
  historyDays: number; // Dias de histórico a considerar
  updateFrequency: number; // Frequência de atualização em horas
}

/**
 * Interface para representar uma sugestão de preço
 */
export interface PriceSuggestion {
  productId: string;
  currentPrice: number;
  suggestedPrice: number;
  minSuggestedPrice: number;
  maxSuggestedPrice: number;
  adjustmentFactor: number; // Fator de ajuste (ex: 1.05 = +5%)
  confidence: number; // Confiança na sugestão (0-1)
  reasons: PriceAdjustmentReason[];
  timestamp: number;
}

/**
 * Interface para representar uma razão de ajuste de preço
 */
export interface PriceAdjustmentReason {
  factor: string; // Fator que influenciou (demanda, sazonalidade, etc)
  impact: number; // Impacto no preço (-1 a 1)
  description: string; // Descrição da razão
}

/**
 * Serviço de precificação dinâmica
 * Implementa algoritmos para sugerir ajustes de preço aos produtores
 */
export class DynamicPricingService {
  private static instance: DynamicPricingService;
  private config: DynamicPricingConfig;
  private seasonalEvents: SeasonalEvent[] = [];

  /**
   * Configuração padrão para o serviço
   */
  private readonly DEFAULT_CONFIG: DynamicPricingConfig = {
    enabled: true,
    maxAutoAdjustment: 0.05, // 5% de ajuste máximo automático
    minDataPoints: 10, // Mínimo de 10 pontos de dados para análise
    demandWeight: 0.45, // 45% de peso para demanda
    seasonalWeight: 0.25, // 25% de peso para sazonalidade
    competitionWeight: 0.2, // 20% de peso para competição
    elasticityWeight: 0.1, // 10% de peso para elasticidade
    historyDays: 90, // 90 dias de histórico
    updateFrequency: 24, // Atualização diária
  };

  /**
   * Construtor privado para implementar Singleton
   */
  private constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
  }

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): DynamicPricingService {
    if (!DynamicPricingService.instance) {
      DynamicPricingService.instance = new DynamicPricingService();
    }
    return DynamicPricingService.instance;
  }

  /**
   * Atualiza a configuração do serviço
   * @param newConfig Nova configuração parcial ou completa
   */
  public updateConfig(newConfig: Partial<DynamicPricingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtém a configuração atual
   */
  public getConfig(): DynamicPricingConfig {
    return { ...this.config };
  }

  /**
   * Adiciona ou atualiza um evento sazonal
   * @param event Evento sazonal a ser adicionado ou atualizado
   */
  public updateSeasonalEvent(event: SeasonalEvent): void {
    const index = this.seasonalEvents.findIndex(e => e.id === event.id);
    if (index >= 0) {
      this.seasonalEvents[index] = { ...event };
    } else {
      this.seasonalEvents.push({ ...event });
    }
  }

  /**
   * Remove um evento sazonal
   * @param eventId ID do evento a ser removido
   */
  public removeSeasonalEvent(eventId: string): void {
    this.seasonalEvents = this.seasonalEvents.filter(e => e.id !== eventId);
  }

  /**
   * Obtém todos os eventos sazonais
   */
  public getSeasonalEvents(): SeasonalEvent[] {
    return [...this.seasonalEvents];
  }

  /**
   * Gera sugestões de preço para um produto
   * @param product Informações do produto
   * @param salesHistory Histórico de vendas do produto
   * @param similarProductsSales Histórico de vendas de produtos similares
   * @returns Sugestão de preço
   */
  public generatePriceSuggestion(
    product: ProductPricing,
    salesHistory: SalesData[],
    similarProductsSales: SalesData[]
  ): PriceSuggestion {
    try {
      // Verificar se há dados suficientes para análise
      if (salesHistory.length < this.config.minDataPoints) {
        return this.createBasicSuggestion(product, [
          {
            factor: 'dados_insuficientes',
            impact: 0,
            description: 'Dados históricos insuficientes para análise precisa',
          },
        ]);
      }

      // Inicializar razões de ajuste
      const reasons: PriceAdjustmentReason[] = [];

      // 1. Analisar fator de demanda
      const demandFactor = this.analyzeDemand(salesHistory);
      reasons.push({
        factor: 'demanda',
        impact: demandFactor,
        description: this.getDemandDescription(demandFactor),
      });

      // 2. Analisar fator sazonal
      const seasonalFactor = this.analyzeSeasonality(product);
      if (seasonalFactor !== 0) {
        reasons.push({
          factor: 'sazonalidade',
          impact: seasonalFactor,
          description: this.getSeasonalDescription(seasonalFactor),
        });
      }

      // 3. Analisar fator de competição
      const competitionFactor = this.analyzeCompetition(product, similarProductsSales);
      reasons.push({
        factor: 'competição',
        impact: competitionFactor,
        description: this.getCompetitionDescription(competitionFactor),
      });

      const elasticityFactor = this.analyzeElasticity(salesHistory);
      if (elasticityFactor !== 0) {
        reasons.push({
          factor: 'elasticidade',
          impact: elasticityFactor,
          description: this.getElasticityDescription(elasticityFactor),
        });
      }

      // Calcular fator de ajuste combinado com pesos
      const totalWeight =
        this.config.demandWeight +
        this.config.seasonalWeight +
        this.config.competitionWeight +
        this.config.elasticityWeight;
      const weightedAdjustment = (
        demandFactor * this.config.demandWeight +
        seasonalFactor * this.config.seasonalWeight +
        competitionFactor * this.config.competitionWeight +
        elasticityFactor * this.config.elasticityWeight
      ) / Math.max(1, totalWeight);

      // Limitar o ajuste ao máximo permitido
      const cappedAdjustment = Math.max(
        -this.config.maxAutoAdjustment,
        Math.min(this.config.maxAutoAdjustment, weightedAdjustment)
      );

      // Calcular preço sugerido
      const adjustmentFactor = 1 + cappedAdjustment;
      const suggestedPrice = this.roundPrice(product.basePrice * adjustmentFactor);

      // Garantir que o preço está dentro dos limites
      const boundedPrice = Math.max(product.minPrice, Math.min(product.maxPrice, suggestedPrice));

      // Calcular confiança na sugestão
      const confidence = this.calculateConfidence(salesHistory.length, reasons);

      return {
        productId: product.id,
        currentPrice: product.currentPrice,
        suggestedPrice: boundedPrice,
        minSuggestedPrice: product.minPrice,
        maxSuggestedPrice: product.maxPrice,
        adjustmentFactor,
        confidence,
        reasons,
        timestamp: Date.now(),
      };
    } catch (error) {
      loggingService.error(
        'Erro ao gerar sugestão de preço',
        error instanceof Error ? error : undefined,
        { productId: product.id }
      );
      return this.createBasicSuggestion(product, [
        {
          factor: 'erro',
          impact: 0,
          description: 'Erro ao processar dados para sugestão de preço',
        },
      ]);
    }
  }

  /**
   * Gera sugestões de preço para múltiplos produtos
   * @param products Lista de produtos
   * @param salesData Mapa de histórico de vendas por produto
   * @param similarProductsMap Mapa de produtos similares por produto
   * @returns Lista de sugestões de preço
   */
  public generateBulkPriceSuggestions(
    products: ProductPricing[],
    salesData: Map<string, SalesData[]>,
    similarProductsMap: Map<string, SalesData[]>
  ): PriceSuggestion[] {
    return products.map(product => {
      const productSales = salesData.get(product.id) || [];
      const similarSales = similarProductsMap.get(product.id) || [];
      return this.generatePriceSuggestion(product, productSales, similarSales);
    });
  }

  /**
   * Aplica um ajuste automático de preço baseado em uma sugestão,
   * se a confiança for alta o suficiente e estiver dentro dos limites configurados.
   */
  public applyAutomaticAdjustment(
    product: ProductPricing,
    suggestion: PriceSuggestion
  ): ProductPricing | null {
    if (!this.config.enabled) {
      return null;
    }

    // Validação de confiança mínima para ajuste automático
    const MIN_AUTO_CONFIDENCE = 0.85;
    if (suggestion.confidence < MIN_AUTO_CONFIDENCE) {
      loggingService.info('Ajuste automático ignorado: baixa confiança', {
        productId: product.id,
        confidence: suggestion.confidence
      });
      return null;
    }

    // Validação de limite máximo de ajuste
    const adjustmentPercent = Math.abs(suggestion.suggestedPrice / product.currentPrice - 1);
    if (adjustmentPercent > this.config.maxAutoAdjustment) {
      loggingService.info('Ajuste automático ignorado: excede limite configurado', {
        productId: product.id,
        adjustmentPercent,
        maxLimit: this.config.maxAutoAdjustment
      });
      return null;
    }

    loggingService.info('Aplicando ajuste automático de preço', {
      productId: product.id,
      oldPrice: product.currentPrice,
      newPrice: suggestion.suggestedPrice
    });

    return {
      ...product,
      currentPrice: suggestion.suggestedPrice,
      updatedAt: Date.now()
    };
  }

  /**
   * Analisa a demanda com base no histórico de vendas
   * @param salesHistory Histórico de vendas
   * @returns Fator de ajuste baseado na demanda (-1 a 1)
   */
  private analyzeDemand(salesHistory: SalesData[]): number {
    // Ordenar vendas por data
    const sortedSales = [...salesHistory].sort((a, b) => a.date - b.date);

    // Dividir em dois períodos para comparação
    const midpoint = Math.floor(sortedSales.length / 2);
    const recentSales = sortedSales.slice(midpoint);
    const olderSales = sortedSales.slice(0, midpoint);

    // Calcular quantidade média vendida em cada período
    const recentAvgQuantity = this.calculateAverageQuantity(recentSales);
    const olderAvgQuantity = this.calculateAverageQuantity(olderSales);

    // Se não houver vendas anteriores, considerar demanda neutra
    if (olderAvgQuantity === 0) {
      return 0;
    }

    // Calcular mudança percentual na demanda
    const demandChange = (recentAvgQuantity - olderAvgQuantity) / olderAvgQuantity;

    // Normalizar para o intervalo -1 a 1 com uma curva sigmoide
    return this.sigmoid(demandChange * 3) * 2 - 1;
  }

  /**
   * Analisa fatores sazonais que podem influenciar o preço
   * @param product Produto a ser analisado
   * @returns Fator de ajuste sazonal (-1 a 1)
   */
  private analyzeSeasonality(product: ProductPricing): number {
    const now = Date.now();
    let maxImpact = 0;

    // Verificar todos os eventos sazonais ativos
    for (const event of this.seasonalEvents) {
      // Verificar se o evento está ativo
      if (now >= event.startDate && now <= event.endDate) {
        // Verificar se o produto é afetado pelo evento (por categoria ou tags)
        const categoryMatch = event.categories.includes(product.category);
        const tagMatch = product.tags.some(tag => event.tags.includes(tag));

        if (categoryMatch || tagMatch) {
          // Calcular impacto normalizado (-1 a 1)
          const impact = event.adjustmentFactor - 1;

          // Manter o impacto de maior magnitude
          if (Math.abs(impact) > Math.abs(maxImpact)) {
            maxImpact = impact;
          }
        }
      }
    }

    return maxImpact;
  }

  /**
   * Analisa a competição com base em produtos similares
   * @param product Produto a ser analisado
   * @param similarProductsSales Vendas de produtos similares
   * @returns Fator de ajuste baseado na competição (-1 a 1)
   */
  private analyzeCompetition(product: ProductPricing, similarProductsSales: SalesData[]): number {
    if (similarProductsSales.length === 0) {
      return 0; // Sem dados de competição
    }

    // Agrupar por produto e calcular preço médio
    const productPrices = new Map<string, number[]>();
    for (const sale of similarProductsSales) {
      if (!productPrices.has(sale.productId)) {
        productPrices.set(sale.productId, []);
      }
      productPrices.get(sale.productId)?.push(sale.price);
    }

    // Calcular preço médio de cada produto similar
    const averagePrices: number[] = [];
    productPrices.forEach(prices => {
      const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      averagePrices.push(avg);
    });

    // Calcular preço médio da competição
    const competitionAvgPrice =
      averagePrices.reduce((sum, price) => sum + price, 0) / averagePrices.length;

    // Calcular diferença percentual
    const priceDifference = (product.currentPrice - competitionAvgPrice) / competitionAvgPrice;

    // Normalizar para o intervalo -1 a 1 e inverter (preço maior que concorrência = ajuste negativo)
    return -this.sigmoid(priceDifference * 5) * 2 + 1;
  }

  private analyzeElasticity(salesHistory: SalesData[]): number {
    if (salesHistory.length < 6) return 0;
    const sorted = [...salesHistory].sort((a, b) => a.price - b.price);
    const midpoint = Math.floor(sorted.length / 2);
    const low = sorted.slice(0, midpoint);
    const high = sorted.slice(midpoint);
    const lowAvgPrice = low.reduce((sum, sale) => sum + sale.price, 0) / Math.max(1, low.length);
    const highAvgPrice = high.reduce((sum, sale) => sum + sale.price, 0) / Math.max(1, high.length);
    const lowAvgQty = low.reduce((sum, sale) => sum + sale.quantity, 0) / Math.max(1, low.length);
    const highAvgQty = high.reduce((sum, sale) => sum + sale.quantity, 0) / Math.max(1, high.length);
    const priceChange = (highAvgPrice - lowAvgPrice) / Math.max(1, lowAvgPrice);
    if (priceChange === 0 || lowAvgQty === 0) return 0;
    const qtyChange = (highAvgQty - lowAvgQty) / lowAvgQty;
    const elasticity = qtyChange / priceChange;
    const normalized = Math.max(-1, Math.min(1, elasticity / 2));
    return normalized;
  }

  /**
   * Calcula a quantidade média vendida
   * @param sales Dados de vendas
   * @returns Quantidade média
   */
  private calculateAverageQuantity(sales: SalesData[]): number {
    if (sales.length === 0) return 0;
    return sales.reduce((sum, sale) => sum + sale.quantity, 0) / sales.length;
  }

  /**
   * Função sigmoide para normalizar valores
   * @param x Valor a ser normalizado
   * @returns Valor normalizado entre 0 e 1
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Arredonda o preço para um valor comercial
   * @param price Preço a ser arredondado
   * @returns Preço arredondado
   */
  private roundPrice(price: number): number {
    // Arredondar para 2 casas decimais
    const rounded = Math.round(price * 100) / 100;

    // Opcionalmente, ajustar para valores comerciais (ex: R$ 9,99 em vez de R$ 10,00)
    if (rounded >= 1) {
      const integerPart = Math.floor(rounded);
      const decimalPart = rounded - integerPart;

      // Se o decimal for muito próximo de 0, usar 0,99
      if (decimalPart < 0.1) {
        return integerPart - 0.01;
      }

      // Se o decimal for muito próximo de 1, ir para o próximo inteiro - 0,01
      if (decimalPart > 0.9) {
        return integerPart + 0.99;
      }
    }

    return rounded;
  }

  /**
   * Calcula a confiança na sugestão de preço
   * @param dataPoints Número de pontos de dados
   * @param reasons Razões de ajuste
   * @returns Valor de confiança entre 0 e 1
   */
  private calculateConfidence(dataPoints: number, reasons: PriceAdjustmentReason[]): number {
    // Fator de dados: mais dados = maior confiança
    const dataFactor = Math.min(1, dataPoints / (this.config.minDataPoints * 2));

    // Fator de consenso: se as razões apontam na mesma direção = maior confiança
    let positiveImpacts = 0;
    let negativeImpacts = 0;

    for (const reason of reasons) {
      if (reason.impact > 0.1) positiveImpacts++;
      if (reason.impact < -0.1) negativeImpacts++;
    }

    const consensusFactor =
      1 - Math.min(positiveImpacts, negativeImpacts) / Math.max(1, reasons.length);

    // Combinar fatores
    return dataFactor * 0.7 + consensusFactor * 0.3;
  }

  /**
   * Cria uma sugestão básica quando não há dados suficientes
   * @param product Produto
   * @param reasons Razões para a sugestão
   * @returns Sugestão básica
   */
  private createBasicSuggestion(
    product: ProductPricing,
    reasons: PriceAdjustmentReason[]
  ): PriceSuggestion {
    return {
      productId: product.id,
      currentPrice: product.currentPrice,
      suggestedPrice: product.currentPrice, // Sem mudança
      minSuggestedPrice: product.minPrice,
      maxSuggestedPrice: product.maxPrice,
      adjustmentFactor: 1, // Sem ajuste
      confidence: 0.3, // Baixa confiança
      reasons,
      timestamp: Date.now(),
    };
  }

  /**
   * Obtém descrição para o fator de demanda
   * @param factor Fator de demanda
   * @returns Descrição
   */
  private getDemandDescription(factor: number): string {
    if (factor > 0.3) {
      return 'Aumento significativo na demanda recente';
    } else if (factor > 0.1) {
      return 'Leve aumento na demanda recente';
    } else if (factor < -0.3) {
      return 'Queda significativa na demanda recente';
    } else if (factor < -0.1) {
      return 'Leve queda na demanda recente';
    } else {
      return 'Demanda estável';
    }
  }

  /**
   * Obtém descrição para o fator sazonal
   * @param factor Fator sazonal
   * @returns Descrição
   */
  private getSeasonalDescription(factor: number): string {
    if (factor > 0.3) {
      return 'Período sazonal de alta demanda';
    } else if (factor > 0) {
      return 'Leve influência sazonal positiva';
    } else if (factor < -0.3) {
      return 'Período sazonal de baixa demanda';
    } else {
      return 'Leve influência sazonal negativa';
    }
  }

  /**
   * Obtém descrição para o fator de competição
   * @param factor Fator de competição
   * @returns Descrição
   */
  private getCompetitionDescription(factor: number): string {
    if (factor > 0.3) {
      return 'Preço significativamente acima da concorrência';
    } else if (factor > 0.1) {
      return 'Preço levemente acima da concorrência';
    } else if (factor < -0.3) {
      return 'Preço significativamente abaixo da concorrência';
    } else if (factor < -0.1) {
      return 'Preço levemente abaixo da concorrência';
    } else {
      return 'Preço alinhado com a concorrência';
    }
  }

  private getElasticityDescription(factor: number): string {
    if (factor <= -0.4) {
      return 'Demanda sensível a preço, risco de queda com aumento';
    } else if (factor <= -0.15) {
      return 'Demanda moderadamente sensível a preço';
    } else if (factor >= 0.3) {
      return 'Baixa sensibilidade a preço, margem para ajuste';
    } else if (factor >= 0.1) {
      return 'Leve margem para ajuste de preço';
    }
    return 'Elasticidade neutra';
  }
}

// Exporta a instância única do serviço
export const dynamicPricingService = DynamicPricingService.getInstance();
