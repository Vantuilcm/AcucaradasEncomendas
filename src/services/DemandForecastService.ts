/**
 * Serviço de Previsão de Demanda
 *
 * Este serviço implementa algoritmos para prever a demanda futura de produtos
 * com base em dados históricos de vendas, sazonalidade e tendências.
 */

// Interfaces
export interface SalesHistoryPoint {
  productId: string;
  date: Date;
  quantity: number;
  price: number;
}

export interface SeasonalFactor {
  name: string;
  startDate: Date;
  endDate: Date;
  impactMultiplier: number; // Ex: 1.5 = aumento de 50% na demanda
  affectedProductCategories?: string[];
}

export interface ProductTrend {
  productId: string;
  trendCoefficient: number; // Positivo = tendência de crescimento, Negativo = tendência de queda
  confidenceScore: number; // 0-1, indica a confiança na tendência identificada
}

export interface DemandForecastConfig {
  historyWindowDays: number; // Quantidade de dias de histórico a considerar
  forecastHorizonDays: number; // Quantidade de dias para prever no futuro
  minimumDataPoints: number; // Mínimo de pontos de dados necessários para fazer previsão
  seasonalFactors: SeasonalFactor[];
  smoothingFactorAlpha: number; // Fator de suavização para o algoritmo de suavização exponencial (0-1)
  smoothingFactorBeta: number; // Fator de suavização para tendência (0-1)
  smoothingFactorGamma: number; // Fator de suavização para sazonalidade (0-1)
  outlierDetectionThreshold: number; // Limiar para detecção de outliers (desvios padrão)
}

export interface DemandForecast {
  productId: string;
  forecastPoints: Array<{
    date: Date;
    expectedQuantity: number;
    lowerBound: number; // Limite inferior do intervalo de confiança
    upperBound: number; // Limite superior do intervalo de confiança
  }>;
  confidenceScore: number; // 0-1, indica a confiança na previsão
  influencingFactors: Array<{
    factor: string;
    impact: number; // -1 a 1, indica o impacto negativo ou positivo
  }>;
}

/**
 * Serviço Singleton para previsão de demanda de produtos
 */
export class DemandForecastService {
  private static instance: DemandForecastService;
  private config: DemandForecastConfig;
  private productTrends: Map<string, ProductTrend>;

  private constructor() {
    // Configuração padrão
    this.config = {
      historyWindowDays: 365, // 1 ano de histórico
      forecastHorizonDays: 90, // Previsão para 3 meses
      minimumDataPoints: 30, // Mínimo de 30 pontos de dados
      seasonalFactors: [],
      smoothingFactorAlpha: 0.2,
      smoothingFactorBeta: 0.1,
      smoothingFactorGamma: 0.1,
      outlierDetectionThreshold: 2.5, // 2.5 desvios padrão
    };

    this.productTrends = new Map<string, ProductTrend>();
  }

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): DemandForecastService {
    if (!DemandForecastService.instance) {
      DemandForecastService.instance = new DemandForecastService();
    }
    return DemandForecastService.instance;
  }

  /**
   * Atualiza a configuração do serviço
   */
  public updateConfig(newConfig: Partial<DemandForecastConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Adiciona ou atualiza um fator sazonal
   */
  public addSeasonalFactor(factor: SeasonalFactor): void {
    // Remove o fator existente com o mesmo nome, se houver
    this.config.seasonalFactors = this.config.seasonalFactors.filter(f => f.name !== factor.name);
    // Adiciona o novo fator
    this.config.seasonalFactors.push(factor);
  }

  /**
   * Remove um fator sazonal pelo nome
   */
  public removeSeasonalFactor(factorName: string): void {
    this.config.seasonalFactors = this.config.seasonalFactors.filter(f => f.name !== factorName);
  }

  /**
   * Gera uma previsão de demanda para um produto específico
   */
  public generateForecast(
    productId: string,
    salesHistory: SalesHistoryPoint[]
  ): DemandForecast | null {
    // Filtra o histórico para o produto específico
    const productHistory = salesHistory.filter(point => point.productId === productId);

    // Verifica se há dados suficientes para fazer a previsão
    if (productHistory.length < this.config.minimumDataPoints) {
      console.log(
        `Dados insuficientes para previsão do produto ${productId}. Necessário: ${this.config.minimumDataPoints}, Disponível: ${productHistory.length}`
      );
      return null;
    }

    // Ordena o histórico por data
    productHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Remove outliers
    const cleanHistory = this.removeOutliers(productHistory);

    // Calcula a tendência do produto
    const trend = this.calculateProductTrend(cleanHistory);
    this.productTrends.set(productId, trend);

    // Aplica o algoritmo de Suavização Exponencial Tripla (Holt-Winters)
    const forecastPoints = this.applyHoltWinters(cleanHistory, trend);

    // Calcula os fatores de influência
    const influencingFactors = this.calculateInfluencingFactors(productId, cleanHistory);

    // Calcula a pontuação de confiança
    const confidenceScore = this.calculateConfidenceScore(cleanHistory, trend);

    return {
      productId,
      forecastPoints,
      confidenceScore,
      influencingFactors,
    };
  }

  /**
   * Gera previsões de demanda para múltiplos produtos
   */
  public generateBulkForecasts(
    productIds: string[],
    salesHistory: SalesHistoryPoint[]
  ): Map<string, DemandForecast> {
    const forecasts = new Map<string, DemandForecast>();

    for (const productId of productIds) {
      const forecast = this.generateForecast(productId, salesHistory);
      if (forecast) {
        forecasts.set(productId, forecast);
      }
    }

    return forecasts;
  }

  /**
   * Remove outliers do histórico de vendas
   */
  private removeOutliers(history: SalesHistoryPoint[]): SalesHistoryPoint[] {
    if (history.length <= 3) return history; // Precisa de pelo menos 3 pontos para detectar outliers

    // Calcula a média e o desvio padrão das quantidades
    const quantities = history.map(point => point.quantity);
    const mean = quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length;
    const variance =
      quantities.reduce((sum, qty) => sum + Math.pow(qty - mean, 2), 0) / quantities.length;
    const stdDev = Math.sqrt(variance);

    // Remove pontos que estão além do limiar de desvios padrão
    const threshold = this.config.outlierDetectionThreshold * stdDev;
    return history.filter(point => {
      return Math.abs(point.quantity - mean) <= threshold;
    });
  }

  /**
   * Calcula a tendência de um produto com base no histórico
   */
  private calculateProductTrend(history: SalesHistoryPoint[]): ProductTrend {
    if (history.length < 2) {
      return {
        productId: history[0].productId,
        trendCoefficient: 0,
        confidenceScore: 0,
      };
    }

    // Implementação simplificada de regressão linear
    const n = history.length;
    const x = Array.from({ length: n }, (_, i) => i); // Índices como valores x
    const y = history.map(point => point.quantity); // Quantidades como valores y

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcula o coeficiente de determinação (R²) para medir a confiança
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => {
      const yPred = intercept + slope * x[i];
      return sum + Math.pow(val - yPred, 2);
    }, 0);
    const rSquared = 1 - ssResidual / ssTotal;

    // Normaliza o coeficiente de tendência para um valor entre -1 e 1
    const maxAbsSlope = Math.max(1, Math.abs(slope));
    const normalizedSlope = slope / maxAbsSlope;

    return {
      productId: history[0].productId,
      trendCoefficient: normalizedSlope,
      confidenceScore: Math.max(0, Math.min(1, rSquared)), // Limita entre 0 e 1
    };
  }

  /**
   * Aplica o algoritmo de Suavização Exponencial Tripla (Holt-Winters)
   */
  private applyHoltWinters(
    history: SalesHistoryPoint[],
    trend: ProductTrend
  ): Array<{
    date: Date;
    expectedQuantity: number;
    lowerBound: number;
    upperBound: number;
  }> {
    const result: Array<{
      date: Date;
      expectedQuantity: number;
      lowerBound: number;
      upperBound: number;
    }> = [];

    // Implementação simplificada do algoritmo Holt-Winters
    // Inicialização
    let level = history[0].quantity;
    let trend = 0;
    let seasonalPeriod = 7; // Assumindo sazonalidade semanal
    let seasonal: number[] = [];

    // Inicializa os fatores sazonais
    if (history.length >= seasonalPeriod * 2) {
      for (let i = 0; i < seasonalPeriod; i++) {
        let sum = 0;
        let count = 0;
        for (let j = i; j < history.length; j += seasonalPeriod) {
          sum += history[j].quantity;
          count++;
        }
        seasonal.push(sum / count);
      }

      // Normaliza os fatores sazonais
      const seasonalSum = seasonal.reduce((sum, val) => sum + val, 0);
      const seasonalMean = seasonalSum / seasonalPeriod;
      seasonal = seasonal.map(val => val / seasonalMean);
    } else {
      // Se não houver dados suficientes, inicializa com 1 (sem efeito sazonal)
      for (let i = 0; i < seasonalPeriod; i++) {
        seasonal.push(1);
      }
    }

    // Aplica o algoritmo para cada ponto do histórico
    for (let i = 0; i < history.length; i++) {
      const seasonalIndex = i % seasonalPeriod;
      const observation = history[i].quantity;

      if (i > 0) {
        const lastLevel = level;
        // Atualiza o nível, tendência e sazonalidade
        level =
          this.config.smoothingFactorAlpha * (observation / seasonal[seasonalIndex]) +
          (1 - this.config.smoothingFactorAlpha) * (lastLevel + trend);

        trend =
          this.config.smoothingFactorBeta * (level - lastLevel) +
          (1 - this.config.smoothingFactorBeta) * trend;

        seasonal[seasonalIndex] =
          this.config.smoothingFactorGamma * (observation / level) +
          (1 - this.config.smoothingFactorGamma) * seasonal[seasonalIndex];
      }
    }

    // Gera previsões para o horizonte de tempo especificado
    const lastDate = history[history.length - 1].date;
    const msPerDay = 24 * 60 * 60 * 1000;

    for (let i = 1; i <= this.config.forecastHorizonDays; i++) {
      const forecastDate = new Date(lastDate.getTime() + i * msPerDay);
      const seasonalIndex = (history.length + i - 1) % seasonalPeriod;

      // Calcula a previsão base
      let forecast = (level + i * trend) * seasonal[seasonalIndex];

      // Ajusta com fatores sazonais configurados
      const seasonalMultiplier = this.getSeasonalMultiplier(forecastDate, history[0].productId);
      forecast *= seasonalMultiplier;

      // Garante que a previsão não seja negativa
      forecast = Math.max(0, forecast);

      // Calcula os limites de confiança (simplificado)
      const confidenceInterval =
        forecast *
        (1 -
          this.calculateConfidenceScore(history, {
            productId: history[0].productId,
            trendCoefficient: trend,
            confidenceScore: 0.7, // Valor padrão
          })) *
        0.5;

      result.push({
        date: forecastDate,
        expectedQuantity: Math.round(forecast), // Arredonda para um número inteiro
        lowerBound: Math.max(0, Math.round(forecast - confidenceInterval)),
        upperBound: Math.round(forecast + confidenceInterval),
      });
    }

    return result;
  }

  /**
   * Obtém o multiplicador sazonal para uma data específica
   */
  private getSeasonalMultiplier(date: Date, productId: string): number {
    let multiplier = 1.0; // Valor padrão (sem efeito)

    // Verifica todos os fatores sazonais configurados
    for (const factor of this.config.seasonalFactors) {
      if (date >= factor.startDate && date <= factor.endDate) {
        // Verifica se o fator afeta todas as categorias ou a categoria do produto
        if (
          !factor.affectedProductCategories ||
          factor.affectedProductCategories.includes(productId.split('-')[0])
        ) {
          // Aplica o multiplicador (efeitos são multiplicativos)
          multiplier *= factor.impactMultiplier;
        }
      }
    }

    return multiplier;
  }

  /**
   * Calcula os fatores que influenciam a demanda
   */
  private calculateInfluencingFactors(
    productId: string,
    history: SalesHistoryPoint[]
  ): Array<{
    factor: string;
    impact: number;
  }> {
    const factors: Array<{
      factor: string;
      impact: number;
    }> = [];

    // Adiciona a tendência como um fator
    const trend = this.productTrends.get(productId);
    if (trend) {
      factors.push({
        factor: 'Tendência histórica',
        impact: trend.trendCoefficient,
      });
    }

    // Adiciona fatores sazonais relevantes
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    for (const factor of this.config.seasonalFactors) {
      // Verifica se o fator está ativo no próximo mês
      if (
        (factor.startDate <= nextMonth && factor.endDate >= today) ||
        factor.startDate.getMonth() === today.getMonth() ||
        factor.startDate.getMonth() === nextMonth.getMonth()
      ) {
        // Verifica se o fator afeta o produto
        if (
          !factor.affectedProductCategories ||
          factor.affectedProductCategories.includes(productId.split('-')[0])
        ) {
          // Normaliza o impacto para o intervalo -1 a 1
          const normalizedImpact = Math.min(1, Math.max(-1, factor.impactMultiplier - 1));

          factors.push({
            factor: `Sazonalidade: ${factor.name}`,
            impact: normalizedImpact,
          });
        }
      }
    }

    // Adiciona fator de preço (correlação preço-demanda)
    if (history.length >= 10) {
      const priceQuantityCorrelation = this.calculatePriceQuantityCorrelation(history);
      if (Math.abs(priceQuantityCorrelation) > 0.3) {
        // Só adiciona se a correlação for significativa
        factors.push({
          factor: 'Sensibilidade a preço',
          impact: -priceQuantityCorrelation, // Negativo porque preço maior geralmente significa menor demanda
        });
      }
    }

    return factors;
  }

  /**
   * Calcula a correlação entre preço e quantidade vendida
   */
  private calculatePriceQuantityCorrelation(history: SalesHistoryPoint[]): number {
    const n = history.length;
    const prices = history.map(point => point.price);
    const quantities = history.map(point => point.quantity);

    const sumPrices = prices.reduce((sum, val) => sum + val, 0);
    const sumQuantities = quantities.reduce((sum, val) => sum + val, 0);
    const sumPricesSquared = prices.reduce((sum, val) => sum + val * val, 0);
    const sumQuantitiesSquared = quantities.reduce((sum, val) => sum + val * val, 0);
    const sumPricesQuantities = prices.reduce((sum, val, i) => sum + val * quantities[i], 0);

    const numerator = n * sumPricesQuantities - sumPrices * sumQuantities;
    const denominator = Math.sqrt(
      (n * sumPricesSquared - sumPrices * sumPrices) *
        (n * sumQuantitiesSquared - sumQuantities * sumQuantities)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calcula a pontuação de confiança para a previsão
   */
  private calculateConfidenceScore(history: SalesHistoryPoint[], trend: ProductTrend): number {
    // Fatores que afetam a confiança
    const factors: Array<{
      factor: string;
      weight: number;
      score: number;
    }> = [];

    // Fator 1: Quantidade de dados históricos
    const dataPointsScore = Math.min(1, history.length / (this.config.minimumDataPoints * 2));
    factors.push({
      factor: 'Quantidade de dados históricos',
      weight: 0.3,
      score: dataPointsScore,
    });

    // Fator 2: Consistência dos dados (variabilidade)
    const quantities = history.map(point => point.quantity);
    const mean = quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length;
    const variance =
      quantities.reduce((sum, qty) => sum + Math.pow(qty - mean, 2), 0) / quantities.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    const consistencyScore = Math.max(0, 1 - Math.min(1, coefficientOfVariation / 2));
    factors.push({
      factor: 'Consistência dos dados',
      weight: 0.25,
      score: consistencyScore,
    });

    // Fator 3: Confiança na tendência identificada
    factors.push({
      factor: 'Confiança na tendência',
      weight: 0.25,
      score: trend.confidenceScore,
    });

    // Fator 4: Recência dos dados
    const today = new Date();
    const lastDataPointDate = history[history.length - 1].date;
    const daysSinceLastDataPoint =
      (today.getTime() - lastDataPointDate.getTime()) / (24 * 60 * 60 * 1000);
    const recencyScore = Math.max(0, 1 - daysSinceLastDataPoint / 30); // Penaliza se os dados são antigos
    factors.push({
      factor: 'Recência dos dados',
      weight: 0.2,
      score: recencyScore,
    });

    // Calcula a pontuação ponderada final
    const weightedScore = factors.reduce((sum, factor) => sum + factor.weight * factor.score, 0);
    return weightedScore;
  }

  /**
   * Obtém as tendências calculadas para os produtos
   */
  public getProductTrends(): Map<string, ProductTrend> {
    return new Map(this.productTrends);
  }

  /**
   * Agrupa produtos por padrões de demanda similares
   */
  public groupProductsByDemandPattern(
    forecasts: Map<string, DemandForecast>
  ): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    const processedProducts = new Set<string>();

    // Converte os forecasts para um formato mais fácil de processar
    const forecastArray = Array.from(forecasts.values());

    // Implementação simplificada de agrupamento
    for (let i = 0; i < forecastArray.length; i++) {
      const productId = forecastArray[i].productId;

      if (processedProducts.has(productId)) continue;
      processedProducts.add(productId);

      const group = [productId];
      const groupName = `Grupo ${i + 1}`;

      // Compara com outros produtos não processados
      for (let j = i + 1; j < forecastArray.length; j++) {
        const otherProductId = forecastArray[j].productId;
        if (processedProducts.has(otherProductId)) continue;

        // Calcula a similaridade entre os padrões de demanda
        const similarity = this.calculateForecastSimilarity(forecastArray[i], forecastArray[j]);

        // Se a similaridade for alta, adiciona ao grupo
        if (similarity > 0.7) {
          // Limiar de similaridade
          group.push(otherProductId);
          processedProducts.add(otherProductId);
        }
      }

      groups.set(groupName, group);
    }

    return groups;
  }

  /**
   * Calcula a similaridade entre duas previsões
   */
  private calculateForecastSimilarity(
    forecast1: DemandForecast,
    forecast2: DemandForecast
  ): number {
    // Verifica se as previsões têm o mesmo número de pontos
    if (forecast1.forecastPoints.length !== forecast2.forecastPoints.length) {
      return 0;
    }

    // Normaliza as quantidades para comparação
    const points1 = forecast1.forecastPoints.map(p => p.expectedQuantity);
    const points2 = forecast2.forecastPoints.map(p => p.expectedQuantity);

    const max1 = Math.max(...points1);
    const max2 = Math.max(...points2);

    const normalized1 = points1.map(p => p / max1);
    const normalized2 = points2.map(p => p / max2);

    // Calcula a distância euclidiana normalizada
    let sumSquaredDiff = 0;
    for (let i = 0; i < normalized1.length; i++) {
      sumSquaredDiff += Math.pow(normalized1[i] - normalized2[i], 2);
    }

    const distance = Math.sqrt(sumSquaredDiff / normalized1.length);

    // Converte distância para similaridade (0-1)
    return Math.max(0, 1 - distance);
  }
}
