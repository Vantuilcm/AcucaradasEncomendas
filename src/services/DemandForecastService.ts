/**
 * ServiÃ§o de PrevisÃ£o de Demanda
 *
 * Este serviÃ§o implementa algoritmos para prever a demanda futura de produtos
 * com base em dados histÃ³ricos de vendas, sazonalidade e tendÃªncias.
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

export interface ExternalFactor {
  type: 'weather' | 'holiday' | 'event';
  name: string;
  date: Date;
  impactMultiplier: number;
  description?: string;
}

export interface ProductTrend {
  productId: string;
  trendCoefficient: number; // Positivo = tendÃªncia de crescimento, Negativo = tendÃªncia de queda
  confidenceScore: number; // 0-1, indica a confianÃ§a na tendÃªncia identificada
}

export interface DemandForecastConfig {
  historyWindowDays: number; // Quantidade de dias de histÃ³rico a considerar
  forecastHorizonDays: number; // Quantidade de dias para prever no futuro
  minimumDataPoints: number; // MÃ­nimo de pontos de dados necessÃ¡rios para fazer previsÃ£o
  seasonalFactors: SeasonalFactor[];
  smoothingFactorAlpha: number; // Fator de suavizaÃ§Ã£o para o algoritmo de suavizaÃ§Ã£o exponencial (0-1)
  smoothingFactorBeta: number; // Fator de suavizaÃ§Ã£o para tendÃªncia (0-1)
  smoothingFactorGamma: number; // Fator de suavizaÃ§Ã£o para sazonalidade (0-1)
  outlierDetectionThreshold: number; // Limiar para detecÃ§Ã£o de outliers (desvios padrÃ£o)
}

export interface DemandForecast {
  productId: string;
  forecastPoints: Array<{
    date: Date;
    expectedQuantity: number;
    lowerBound: number; // Limite inferior do intervalo de confianÃ§a
    upperBound: number; // Limite superior do intervalo de confianÃ§a
  }>;
  confidenceScore: number; // 0-1, indica a confianÃ§a na previsÃ£o
  influencingFactors: Array<{
    factor: string;
    impact: number; // -1 a 1, indica o impacto negativo ou positivo
  }>;
}

/**
 * ServiÃ§o Singleton para previsÃ£o de demanda de produtos
 */
export class DemandForecastService {
  private static instance: DemandForecastService;
  private config: DemandForecastConfig;
  private productTrends: Map<string, ProductTrend>;
  private externalFactors: ExternalFactor[] = [];
  public static useSimulation: boolean = !(
    process.env.EXPO_PUBLIC_APP_ENV === 'production' || process.env.NODE_ENV === 'production'
  );

  private constructor() {
    // ConfiguraÃ§Ã£o padrÃ£o
    this.config = {
      historyWindowDays: 365, // 1 ano de histÃ³rico
      forecastHorizonDays: 90, // PrevisÃ£o para 3 meses
      minimumDataPoints: 30, // MÃ­nimo de 30 pontos de dados
      seasonalFactors: [],
      smoothingFactorAlpha: 0.2,
      smoothingFactorBeta: 0.1,
      smoothingFactorGamma: 0.1,
      outlierDetectionThreshold: 2.5, // 2.5 desvios padrÃ£o
    };

    this.productTrends = new Map<string, ProductTrend>();
  }

  /**
   * ObtÃ©m a instÃ¢ncia Ãºnica do serviÃ§o
   */
  public static getInstance(): DemandForecastService {
    if (!DemandForecastService.instance) {
      DemandForecastService.instance = new DemandForecastService();
    }
    return DemandForecastService.instance;
  }

  /**
   * Atualiza a configuraÃ§Ã£o do serviÃ§o
   */
  public updateConfig(newConfig: Partial<DemandForecastConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Calcula a pontuação de confiança para uma previsão
   */
  private calculateConfidenceScore(history: SalesHistoryPoint[], trend: ProductTrend): number {
    const factors: Array<{
      factor: string;
      weight: number;
      score: number;
    }> = [];

    // Fator 1: Quantidade de dados históricos
    const dataPointsScore = Math.min(1, history.length / (this.config.minimumDataPoints * 2));
    factors.push({
      factor: 'Volume de dados históricos',
      weight: 0.3,
      score: dataPointsScore,
    });

    // Fator 2: Consistência dos dados (variância)
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

    // Fator 3: Confiança na tendência
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
    const recencyScore = Math.max(0, 1 - daysSinceLastDataPoint / 30); // Queda de confiança após 30 dias sem dados
    factors.push({
      factor: 'Recência dos dados',
      weight: 0.2,
      score: recencyScore,
    });

    const weightedScore = factors.reduce((sum, factor) => sum + factor.weight * factor.score, 0);

    // Logging para monitoramento de performance do modelo
    console.log(`[DemandForecast] Confidence Score for ${trend.productId}: ${weightedScore.toFixed(2)}`, {
      factors: factors.map(f => `${f.factor}: ${(f.score * 100).toFixed(1)}%`)
    });

    return weightedScore;
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

  public async fetchExternalData(startDate: Date, endDate: Date, city: string = 'Sao Paulo'): Promise<void> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
      let weatherImpacts: ExternalFactor[] = [];
      let holidayImpacts: ExternalFactor[] = [];
      const useSimulation = DemandForecastService.useSimulation;

      // 1. Integração com API de Clima
      if (apiKey && apiKey !== 'sua_chave_api_openweathermap' && !useSimulation) {
        try {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`
          );
          const data = await response.json();

          if (data.list) {
            const heatWaves = data.list.filter((item: any) => item.main.temp > 30);
            weatherImpacts = heatWaves.map((item: any) => ({
              type: 'weather',
              name: 'Onda de Calor',
              date: new Date(item.dt * 1000),
              impactMultiplier: 1.25,
              description: `Temperatura prevista: ${item.main.temp}°C`
            }));
          }
        } catch (err) {
          console.warn('[DemandForecast] Erro ao acessar API de clima', err);
        }
      }

      // 2. Simulação de Clima (se habilitado ou sem chave)
      if (weatherImpacts.length === 0 && useSimulation) {
        // Gerar uma onda de calor aleatória nos próximos 7 dias
        const randomDay = Math.floor(Math.random() * 7);
        const heatWaveDate = new Date();
        heatWaveDate.setDate(heatWaveDate.getDate() + randomDay);
        
        weatherImpacts.push({
          type: 'weather',
          name: 'Onda de Calor (Simulada)',
          date: heatWaveDate,
          impactMultiplier: 1.3, // +30% de demanda
          description: 'Simulação: Temperatura acima de 32°C prevista.'
        });

        // Simulação de Chuva Intensa
        const rainyDay = (randomDay + 3) % 7;
        const rainyDate = new Date();
        rainyDate.setDate(rainyDate.getDate() + rainyDay);
        weatherImpacts.push({
          type: 'weather',
          name: 'Chuva Intensa (Simulada)',
          date: rainyDate,
          impactMultiplier: 0.7, // -30% de demanda para loja física, mas pode aumentar delivery
          description: 'Simulação: Chuva forte prevista.'
        });
      }

      // 2. Calendário de Feriados Nacional (Simulado ou via API de feriados)
      if (!useSimulation) {
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        const years = startYear === endYear ? [startYear] : [startYear, endYear];
        for (const year of years) {
          try {
            const resp = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
            const data = await resp.json();
            if (Array.isArray(data)) {
              for (const h of data) {
                if (!h?.date || !h?.name) continue;
                const d = new Date(h.date);
                if (Number.isNaN(d.getTime())) continue;
                holidayImpacts.push({
                  type: 'holiday',
                  name: String(h.name),
                  date: d,
                  impactMultiplier: 1.25,
                  description: 'Feriado nacional'
                });
              }
            }
          } catch (err) {
            console.warn('[DemandForecast] Erro ao acessar API de feriados', err);
          }
        }
      } else {
        holidayImpacts = [
          {
            type: 'holiday',
            name: 'Natal',
            date: new Date(2025, 11, 25),
            impactMultiplier: 1.8,
            description: 'Aumento expressivo na demanda por doces e encomendas'
          },
          {
            type: 'holiday',
            name: 'Véspera de Ano Novo',
            date: new Date(2025, 11, 31),
            impactMultiplier: 1.5,
            description: 'Aumento na demanda para festas'
          },
          {
            type: 'holiday',
            name: 'Páscoa',
            date: new Date(2026, 3, 5),
            impactMultiplier: 2.2,
            description: 'Pico máximo de demanda por chocolates'
          }
        ];
      }

      const allFactors = [...weatherImpacts, ...holidayImpacts];

      // Filtrar apenas os que estão no intervalo solicitado
      this.externalFactors = allFactors.filter(f => {
        const fDate = new Date(f.date);
        return fDate >= startDate && fDate <= endDate;
      });
      
      console.log(`[DemandForecast] ${this.externalFactors.length} fatores externos carregados para ${city}.`);
    } catch (error) {
      console.error('[DemandForecast] Erro ao processar dados externos:', error);
    }
  }

  /**
   * Gera uma previsÃ£o de demanda para um produto especÃ­fico
   */
  public generateForecast(
    productId: string,
    salesHistory: SalesHistoryPoint[]
  ): DemandForecast | null {
    // Filtra o histÃ³rico para o produto especÃ­fico
    const productHistory = salesHistory.filter(point => point.productId === productId);

    if (productHistory.length < this.config.minimumDataPoints) {
      const history = [...productHistory].sort((a, b) => a.date.getTime() - b.date.getTime());
      const k = Math.max(1, Math.min(7, history.length));
      const lastK = history.slice(-k);
      const avg = lastK.reduce((sum, p) => sum + p.quantity, 0) / k;
      const mean = avg;
      const variance = lastK.reduce((sum, p) => sum + Math.pow(p.quantity - mean, 2), 0) / k;
      const stdDev = Math.sqrt(variance);
      const lastDate = history[history.length - 1].date;
      const msPerDay = 24 * 60 * 60 * 1000;
      const forecastPoints: DemandForecast['forecastPoints'] = [];
      for (let i = 1; i <= this.config.forecastHorizonDays; i++) {
        const forecastDate = new Date(lastDate.getTime() + i * msPerDay);
        const seasonalMultiplier = this.getSeasonalMultiplier(forecastDate, productId);
        const base = Math.max(0, avg * seasonalMultiplier);
        const expected = Math.round(base);
        const lowerBound = Math.max(0, Math.round(expected - stdDev));
        const upperBound = Math.round(expected + stdDev);
        forecastPoints.push({ date: forecastDate, expectedQuantity: expected, lowerBound, upperBound });
      }
      const confidenceScore = Math.max(0, Math.min(1, 0.3 + Math.min(0.2, history.length / this.config.minimumDataPoints)));
      const influencingFactors = this.calculateInfluencingFactors(productId, history);
      return { productId, forecastPoints, confidenceScore, influencingFactors };
    }

    // Ordena o histÃ³rico por data
    productHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Remove outliers
    const cleanHistory = this.removeOutliers(productHistory);

    // Calcula a tendÃªncia do produto
    const trend = this.calculateProductTrend(cleanHistory);
    this.productTrends.set(productId, trend);

    // Aplica o algoritmo de SuavizaÃ§Ã£o Exponencial Tripla (Holt-Winters)
    const forecastPoints = this.applyHoltWinters(cleanHistory, trend);

    // Calcula os fatores de influÃªncia
    const influencingFactors = this.calculateInfluencingFactors(productId, cleanHistory);

    // Calcula a pontuaÃ§Ã£o de confianÃ§a
    const confidenceScore = this.calculateConfidenceScore(cleanHistory, trend);

    return {
      productId,
      forecastPoints,
      confidenceScore,
      influencingFactors,
    };
  }

  /**
   * Gera previsÃµes de demanda para mÃºltiplos produtos
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
   * Remove outliers do histÃ³rico de vendas
   */
  private removeOutliers(history: SalesHistoryPoint[]): SalesHistoryPoint[] {
    if (history.length <= 3) return history; // Precisa de pelo menos 3 pontos para detectar outliers

    // Calcula a mÃ©dia e o desvio padrÃ£o das quantidades
    const quantities = history.map(point => point.quantity);
    const mean = quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length;
    const variance =
      quantities.reduce((sum, qty) => sum + Math.pow(qty - mean, 2), 0) / quantities.length;
    const stdDev = Math.sqrt(variance);

    // Remove pontos que estÃ£o alÃ©m do limiar de desvios padrÃ£o
    const threshold = this.config.outlierDetectionThreshold * stdDev;
    return history.filter(point => {
      return Math.abs(point.quantity - mean) <= threshold;
    });
  }

  /**
   * Calcula a tendÃªncia de um produto com base no histÃ³rico
   */
  private calculateProductTrend(history: SalesHistoryPoint[]): ProductTrend {
    if (history.length < 2) {
      return {
        productId: history[0].productId,
        trendCoefficient: 0,
        confidenceScore: 0,
      };
    }

    // ImplementaÃ§Ã£o simplificada de regressÃ£o linear
    const n = history.length;
    const x = Array.from({ length: n }, (_, i) => i); // Ãndices como valores x
    const y = history.map(point => point.quantity); // Quantidades como valores y

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcula o coeficiente de determinaÃ§Ã£o (RÂ²) para medir a confianÃ§a
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => {
      const yPred = intercept + slope * x[i];
      return sum + Math.pow(val - yPred, 2);
    }, 0);
    const rSquared = 1 - ssResidual / ssTotal;

    // Normaliza o coeficiente de tendÃªncia para um valor entre -1 e 1
    const maxAbsSlope = Math.max(1, Math.abs(slope));
    const normalizedSlope = slope / maxAbsSlope;

    return {
      productId: history[0].productId,
      trendCoefficient: normalizedSlope,
      confidenceScore: Math.max(0, Math.min(1, rSquared)), // Limita entre 0 e 1
    };
  }

  /**
   * Aplica o algoritmo de SuavizaÃ§Ã£o Exponencial Tripla (Holt-Winters)
   */
  private applyHoltWinters(history: SalesHistoryPoint[], initialTrend?: ProductTrend): Array<{
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

    // ImplementaÃ§Ã£o simplificada do algoritmo Holt-Winters
    // InicializaÃ§Ã£o
    let level = history[0].quantity;
    let trendValue = 0;
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
      // Se nÃ£o houver dados suficientes, inicializa com 1 (sem efeito sazonal)
      for (let i = 0; i < seasonalPeriod; i++) {
        seasonal.push(1);
      }
    }

    // Aplica o algoritmo para cada ponto do histÃ³rico
    for (let i = 0; i < history.length; i++) {
      const seasonalIndex = i % seasonalPeriod;
      const observation = history[i].quantity;

      if (i > 0) {
        const lastLevel = level;
        // Atualiza o nÃ­vel, tendÃªncia e sazonalidade
        level =
          this.config.smoothingFactorAlpha * (observation / seasonal[seasonalIndex]) +
          (1 - this.config.smoothingFactorAlpha) * (lastLevel + trendValue);

        trendValue =
          this.config.smoothingFactorBeta * (level - lastLevel) +
          (1 - this.config.smoothingFactorBeta) * trendValue;

        seasonal[seasonalIndex] =
          this.config.smoothingFactorGamma * (observation / level) +
          (1 - this.config.smoothingFactorGamma) * seasonal[seasonalIndex];
      }
    }

    // Gera previsÃµes para o horizonte de tempo especificado
    const lastDate = history[history.length - 1].date;
    const msPerDay = 24 * 60 * 60 * 1000;

    for (let i = 1; i <= this.config.forecastHorizonDays; i++) {
      const forecastDate = new Date(lastDate.getTime() + i * msPerDay);
      const seasonalIndex = (history.length + i - 1) % seasonalPeriod;

      // Calcula a previsÃ£o base
      let forecast = (level + i * trendValue) * seasonal[seasonalIndex];

      // Ajusta com fatores sazonais configurados
      const seasonalMultiplier = this.getSeasonalMultiplier(forecastDate, history[0].productId);
      forecast *= seasonalMultiplier;

      // Garante que a previsÃ£o nÃ£o seja negativa
      forecast = Math.max(0, forecast);

      // Calcula os limites de confianÃ§a (simplificado)
      const confidenceInterval =
        forecast *
        (1 -
          this.calculateConfidenceScore(history, {
            productId: history[0].productId,
            trendCoefficient: trendValue,
            confidenceScore: 0.7, // Valor padrÃ£o
          })) *
        0.5;

      result.push({
        date: forecastDate,
        expectedQuantity: Math.round(forecast), // Arredonda para um nÃºmero inteiro
        lowerBound: Math.max(0, Math.round(forecast - confidenceInterval)),
        upperBound: Math.round(forecast + confidenceInterval),
      });
    }

    return result;
  }

  /**
   * ObtÃ©m o multiplicador sazonal para uma data especÃ­fica
   */
  private getSeasonalMultiplier(date: Date, productId: string): number {
    let multiplier = 1.0; // Valor padrÃ£o (sem efeito)

    // 1. Verifica todos os fatores sazonais configurados manualmente
    for (const factor of this.config.seasonalFactors) {
      if (date >= factor.startDate && date <= factor.endDate) {
        // Verifica se o fator afeta todas as categorias ou a categoria do produto
        if (
          !factor.affectedProductCategories ||
          factor.affectedProductCategories.includes(productId.split('-')[0])
        ) {
          // Aplica o multiplicador (efeitos sÃ£o multiplicativos)
          multiplier *= factor.impactMultiplier;
        }
      }
    }

    // 2. Verifica fatores externos carregados (Clima, Feriados)
    for (const factor of this.externalFactors) {
      const factorDate = new Date(factor.date);
      if (
        date.getDate() === factorDate.getDate() &&
        date.getMonth() === factorDate.getMonth() &&
        date.getFullYear() === factorDate.getFullYear()
      ) {
        multiplier *= factor.impactMultiplier;
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

    // Adiciona a tendÃªncia como um fator
    const trend = this.productTrends.get(productId);
    if (trend) { factors.push({ factor: 'Tendência histórica', impact: trend.trendCoefficient }); }

    // Adiciona fatores sazonais relevantes
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    for (const factor of this.config.seasonalFactors) {
      // Verifica se o fator estÃ¡ ativo no prÃ³ximo mÃªs
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

    // Adiciona fator de preÃ§o (correlaÃ§Ã£o preÃ§o-demanda)
    if (history.length >= 10) {
      const priceQuantityCorrelation = this.calculatePriceQuantityCorrelation(history);
      if (Math.abs(priceQuantityCorrelation) > 0.3) {
        // SÃ³ adiciona se a correlaÃ§Ã£o for significativa
        factors.push({
          factor: 'Sensibilidade a preÃ§o',
          impact: -priceQuantityCorrelation, // Negativo porque preÃ§o maior geralmente significa menor demanda
        });
      }
    }

    return factors;
  }

  /**
   * Calcula a correlaÃ§Ã£o entre preÃ§o e quantidade vendida
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
   * ObtÃ©m as tendÃªncias calculadas para os produtos
   */
  public getProductTrends(): Map<string, ProductTrend> {
    return new Map(this.productTrends);
  }

  /**
   * Agrupa produtos por padrÃµes de demanda similares
   */
  public groupProductsByDemandPattern(
    forecasts: Map<string, DemandForecast>
  ): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    const processedProducts = new Set<string>();

    // Converte os forecasts para um formato mais fÃ¡cil de processar
    const forecastArray = Array.from(forecasts.values());

    // ImplementaÃ§Ã£o simplificada de agrupamento
    for (let i = 0; i < forecastArray.length; i++) {
      const productId = forecastArray[i].productId;

      if (processedProducts.has(productId)) continue;
      processedProducts.add(productId);

      const group = [productId];
      const groupName = `Grupo ${i + 1}`;

      // Compara com outros produtos nÃ£o processados
      for (let j = i + 1; j < forecastArray.length; j++) {
        const otherProductId = forecastArray[j].productId;
        if (processedProducts.has(otherProductId)) continue;

        // Calcula a similaridade entre os padrÃµes de demanda
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
   * Calcula a similaridade entre duas previsÃµes
   */
  private calculateForecastSimilarity(
    forecast1: DemandForecast,
    forecast2: DemandForecast
  ): number {
    // Verifica se as previsÃµes tÃªm o mesmo nÃºmero de pontos
    if (forecast1.forecastPoints.length !== forecast2.forecastPoints.length) {
      return 0;
    }

    // Normaliza as quantidades para comparaÃ§Ã£o
    const points1 = forecast1.forecastPoints.map(p => p.expectedQuantity);
    const points2 = forecast2.forecastPoints.map(p => p.expectedQuantity);

    const max1 = Math.max(...points1);
    const max2 = Math.max(...points2);

    const normalized1 = points1.map(p => p / max1);
    const normalized2 = points2.map(p => p / max2);

    // Calcula a distÃ¢ncia euclidiana normalizada
    let sumSquaredDiff = 0;
    for (let i = 0; i < normalized1.length; i++) {
      sumSquaredDiff += Math.pow(normalized1[i] - normalized2[i], 2);
    }

    const distance = Math.sqrt(sumSquaredDiff / normalized1.length);

    // Converte distÃ¢ncia para similaridade (0-1)
    return Math.max(0, 1 - distance);
  }
}
