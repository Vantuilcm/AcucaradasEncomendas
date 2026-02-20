/**
 * Exemplo de uso do Serviço de Previsão de Demanda
 *
 * Este exemplo demonstra como utilizar o DemandForecastService para prever
 * a demanda futura de produtos com base em dados históricos de vendas.
 */

import {
  DemandForecastService,
  SalesHistoryPoint,
  SeasonalFactor,
  DemandForecast,
} from '../services/DemandForecastService';

/**
 * Função principal que demonstra o uso do serviço de previsão de demanda
 */
export function demonstrateDemandForecast(): void {
  console.log('Iniciando demonstração do Serviço de Previsão de Demanda...');

  // Obtém a instância do serviço
  const forecastService = DemandForecastService.getInstance();

  // Configura o serviço com parâmetros específicos para o negócio
  configureForecastService(forecastService);

  // Simula a obtenção de dados históricos de vendas
  const salesHistory = getSampleSalesHistory();

  // Obtém a lista de produtos para previsão
  const productIds = getUniqueProductIds(salesHistory);

  console.log(`Gerando previsões para ${productIds.length} produtos...`);

  // Gera previsões para todos os produtos
  const forecasts = forecastService.generateBulkForecasts(productIds, salesHistory);

  // Exibe os resultados das previsões
  displayForecasts(forecasts);

  // Agrupa produtos com padrões de demanda similares
  const productGroups = forecastService.groupProductsByDemandPattern(forecasts);

  // Exibe os grupos de produtos
  displayProductGroups(productGroups);

  // Demonstra como integrar as previsões com o planejamento de produção
  integrateWithProductionPlanning(forecasts);

  // Demonstra como ajustar o estoque com base nas previsões
  adjustInventoryBasedOnForecast(forecasts);

  console.log('Demonstração do Serviço de Previsão de Demanda concluída.');
}

/**
 * Configura o serviço de previsão de demanda com parâmetros específicos
 */
function configureForecastService(forecastService: DemandForecastService): void {
  console.log('Configurando o serviço de previsão de demanda...');

  // Atualiza a configuração geral
  forecastService.updateConfig({
    historyWindowDays: 365, // Considera 1 ano de histórico
    forecastHorizonDays: 90, // Prevê para os próximos 3 meses
    minimumDataPoints: 30, // Requer pelo menos 30 pontos de dados
    smoothingFactorAlpha: 0.2, // Fator de suavização para o nível
    smoothingFactorBeta: 0.1, // Fator de suavização para tendência
    smoothingFactorGamma: 0.1, // Fator de suavização para sazonalidade
    outlierDetectionThreshold: 2.5, // 2.5 desvios padrão para detecção de outliers
  });

  // Adiciona fatores sazonais relevantes para o negócio
  addSeasonalFactors(forecastService);

  console.log('Serviço de previsão configurado com sucesso.');
}

/**
 * Adiciona fatores sazonais ao serviço de previsão
 */
function addSeasonalFactors(forecastService: DemandForecastService): void {
  const currentYear = new Date().getFullYear();

  // Fator sazonal: Natal
  forecastService.addSeasonalFactor({
    name: 'Natal',
    startDate: new Date(`${currentYear}-12-01`),
    endDate: new Date(`${currentYear}-12-25`),
    impactMultiplier: 1.8, // Aumento de 80% na demanda
    affectedProductCategories: ['bolos', 'doces', 'tortas'],
  });

  // Fator sazonal: Páscoa
  const easterDate = calculateEasterDate(currentYear);
  const easterStart = new Date(easterDate);
  easterStart.setDate(easterDate.getDate() - 15);
  const easterEnd = new Date(easterDate);
  easterEnd.setDate(easterDate.getDate() + 1);

  forecastService.addSeasonalFactor({
    name: 'Páscoa',
    startDate: easterStart,
    endDate: easterEnd,
    impactMultiplier: 1.5, // Aumento de 50% na demanda
    affectedProductCategories: ['chocolates', 'doces', 'bolos'],
  });

  // Fator sazonal: Dia das Mães
  const mothersDay = calculateMothersDayDate(currentYear);
  const mothersDayStart = new Date(mothersDay);
  mothersDayStart.setDate(mothersDay.getDate() - 7);

  forecastService.addSeasonalFactor({
    name: 'Dia das Mães',
    startDate: mothersDayStart,
    endDate: mothersDay,
    impactMultiplier: 1.4, // Aumento de 40% na demanda
    affectedProductCategories: ['bolos', 'tortas', 'doces'],
  });

  // Fator sazonal: Férias de Verão
  forecastService.addSeasonalFactor({
    name: 'Férias de Verão',
    startDate: new Date(`${currentYear}-01-02`),
    endDate: new Date(`${currentYear}-02-28`),
    impactMultiplier: 1.3, // Aumento de 30% na demanda
    affectedProductCategories: ['sorvetes', 'mousses', 'bebidas'],
  });

  // Fator sazonal: Volta às Aulas
  forecastService.addSeasonalFactor({
    name: 'Volta às Aulas',
    startDate: new Date(`${currentYear}-02-15`),
    endDate: new Date(`${currentYear}-03-15`),
    impactMultiplier: 1.2, // Aumento de 20% na demanda
    affectedProductCategories: ['lanches', 'snacks', 'cookies'],
  });
}

/**
 * Calcula a data da Páscoa para um determinado ano
 * Algoritmo de Butcher/Meeus
 */
function calculateEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Calcula a data do Dia das Mães para um determinado ano (segundo domingo de maio)
 */
function calculateMothersDayDate(year: number): Date {
  const date = new Date(year, 4, 1); // 1º de maio
  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Segunda, ...
  const daysUntilSecondSunday = (14 - dayOfWeek) % 7;
  date.setDate(date.getDate() + daysUntilSecondSunday);
  return date;
}

/**
 * Simula a obtenção de dados históricos de vendas
 */
function getSampleSalesHistory(): SalesHistoryPoint[] {
  const salesHistory: SalesHistoryPoint[] = [];
  const productIds = [
    'bolos-chocolate',
    'bolos-morango',
    'bolos-limao',
    'tortas-limao',
    'tortas-morango',
    'tortas-chocolate',
    'doces-brigadeiro',
    'doces-beijinho',
    'doces-cajuzinho',
    'cookies-chocolate',
    'cookies-aveia',
    'cookies-baunilha',
  ];

  // Gera dados históricos para o último ano
  const today = new Date();
  const startDate = new Date(today);
  startDate.setFullYear(today.getFullYear() - 1);

  // Para cada dia no último ano
  for (let date = new Date(startDate); date <= today; date.setDate(date.getDate() + 1)) {
    // Para cada produto
    for (const productId of productIds) {
      // Quantidade base para o produto
      let baseQuantity = 0;

      if (productId.startsWith('bolos')) {
        baseQuantity = 15; // Média de 15 bolos por dia
      } else if (productId.startsWith('tortas')) {
        baseQuantity = 8; // Média de 8 tortas por dia
      } else if (productId.startsWith('doces')) {
        baseQuantity = 50; // Média de 50 unidades de doces por dia
      } else if (productId.startsWith('cookies')) {
        baseQuantity = 30; // Média de 30 cookies por dia
      }

      // Adiciona variação aleatória (±30%)
      const randomFactor = 0.7 + Math.random() * 0.6; // Entre 0.7 e 1.3
      let quantity = Math.round(baseQuantity * randomFactor);

      // Adiciona sazonalidade semanal (mais vendas nos fins de semana)
      const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        quantity = Math.round(quantity * 1.5); // 50% mais vendas nos fins de semana
      }

      // Adiciona sazonalidade para eventos especiais
      // Natal
      if (date.getMonth() === 11 && date.getDate() >= 15 && date.getDate() <= 25) {
        quantity = Math.round(quantity * 1.8);
      }
      // Páscoa (simplificado - apenas abril)
      if (date.getMonth() === 3 && date.getDate() >= 1 && date.getDate() <= 15) {
        quantity = Math.round(quantity * 1.5);
      }

      // Preço base para o produto
      let basePrice = 0;
      if (productId.startsWith('bolos')) {
        basePrice = 50.0; // R$ 50,00 por bolo
      } else if (productId.startsWith('tortas')) {
        basePrice = 45.0; // R$ 45,00 por torta
      } else if (productId.startsWith('doces')) {
        basePrice = 2.5; // R$ 2,50 por doce
      } else if (productId.startsWith('cookies')) {
        basePrice = 3.0; // R$ 3,00 por cookie
      }

      // Adiciona o ponto de dados ao histórico
      salesHistory.push({
        productId,
        date: new Date(date),
        quantity,
        price: basePrice,
      });
    }
  }

  return salesHistory;
}

/**
 * Extrai IDs únicos de produtos do histórico de vendas
 */
function getUniqueProductIds(salesHistory: SalesHistoryPoint[]): string[] {
  const productIdSet = new Set<string>();

  for (const point of salesHistory) {
    productIdSet.add(point.productId);
  }

  return Array.from(productIdSet);
}

/**
 * Exibe os resultados das previsões
 */
function displayForecasts(forecasts: Map<string, DemandForecast>): void {
  console.log('\nResultados das Previsões de Demanda:');
  console.log('====================================');

  forecasts.forEach((forecast, productId) => {
    console.log(`\nProduto: ${productId}`);
    console.log(`Confiança na previsão: ${(forecast.confidenceScore * 100).toFixed(1)}%`);

    console.log('\nFatores de Influência:');
    forecast.influencingFactors.forEach(factor => {
      const impact =
        factor.impact > 0
          ? `+${(factor.impact * 100).toFixed(1)}%`
          : `${(factor.impact * 100).toFixed(1)}%`;
      console.log(`- ${factor.factor}: ${impact}`);
    });

    console.log('\nPrevisão para os próximos 30 dias:');
    const next30Days = forecast.forecastPoints.slice(0, 30);

    // Agrupa por semana para simplificar a visualização
    const weeklyForecast: { week: number; total: number; average: number }[] = [];

    for (let i = 0; i < 4; i++) {
      // 4 semanas
      const weekPoints = next30Days.slice(i * 7, (i + 1) * 7);
      const total = weekPoints.reduce((sum, point) => sum + point.expectedQuantity, 0);
      const average = total / weekPoints.length;

      weeklyForecast.push({
        week: i + 1,
        total,
        average,
      });
    }

    weeklyForecast.forEach(week => {
      console.log(
        `Semana ${week.week}: Total=${week.total} unidades, Média=${week.average.toFixed(1)} por dia`
      );
    });

    // Calcula o total previsto para o próximo mês
    const totalNextMonth = forecast.forecastPoints
      .slice(0, 30)
      .reduce((sum, point) => sum + point.expectedQuantity, 0);

    console.log(`\nTotal previsto para o próximo mês: ${totalNextMonth} unidades`);
  });
}

/**
 * Exibe os grupos de produtos com padrões de demanda similares
 */
function displayProductGroups(productGroups: Map<string, string[]>): void {
  console.log('\nGrupos de Produtos com Padrões de Demanda Similares:');
  console.log('=================================================');

  productGroups.forEach((products, groupName) => {
    console.log(`\n${groupName}:`);
    products.forEach(productId => {
      console.log(`- ${productId}`);
    });
  });
}

/**
 * Demonstra como integrar as previsões com o planejamento de produção
 */
function integrateWithProductionPlanning(forecasts: Map<string, DemandForecast>): void {
  console.log('\nIntegração com Planejamento de Produção:');
  console.log('======================================');

  // Simula a geração de um plano de produção semanal
  const productionPlan: Map<string, number[]> = new Map();

  forecasts.forEach((forecast, productId) => {
    // Obtém as previsões para as próximas 4 semanas
    const weeklyProduction: number[] = [];

    for (let week = 0; week < 4; week++) {
      const startDay = week * 7;
      const endDay = startDay + 6;
      const weekForecast = forecast.forecastPoints.slice(startDay, endDay + 1);

      // Calcula a produção necessária para a semana
      // Adiciona 10% de margem de segurança
      const totalWeekDemand = weekForecast.reduce((sum, point) => sum + point.expectedQuantity, 0);
      const productionNeeded = Math.ceil(totalWeekDemand * 1.1); // +10% de margem

      weeklyProduction.push(productionNeeded);
    }

    productionPlan.set(productId, weeklyProduction);
  });

  // Exibe o plano de produção
  console.log('\nPlano de Produção Semanal (próximas 4 semanas):');
  productionPlan.forEach((weeklyProduction, productId) => {
    console.log(`\nProduto: ${productId}`);
    weeklyProduction.forEach((quantity, week) => {
      console.log(`Semana ${week + 1}: ${quantity} unidades`);
    });
  });

  // Calcula a capacidade de produção necessária
  calculateProductionCapacity(productionPlan);
}

/**
 * Calcula a capacidade de produção necessária com base no plano de produção
 */
function calculateProductionCapacity(productionPlan: Map<string, number[]>): void {
  // Simula tempos de produção por categoria de produto (minutos por unidade)
  const productionTimes: Record<string, number> = {
    bolos: 30, // 30 minutos por bolo
    tortas: 25, // 25 minutos por torta
    doces: 2, // 2 minutos por doce
    cookies: 1, // 1 minuto por cookie
  };

  // Calcula as horas de trabalho necessárias por semana
  const weeklyWorkHours: number[] = [0, 0, 0, 0]; // 4 semanas

  productionPlan.forEach((weeklyProduction, productId) => {
    const category = productId.split('-')[0];
    const timePerUnit = productionTimes[category] || 10; // Tempo padrão se categoria desconhecida

    weeklyProduction.forEach((quantity, week) => {
      const totalMinutes = quantity * timePerUnit;
      weeklyWorkHours[week] += totalMinutes / 60; // Converte para horas
    });
  });

  console.log('\nCapacidade de Produção Necessária:');
  weeklyWorkHours.forEach((hours, week) => {
    console.log(`Semana ${week + 1}: ${hours.toFixed(1)} horas de trabalho`);

    // Calcula quantos funcionários são necessários (assumindo 40h semanais por funcionário)
    const staffNeeded = Math.ceil(hours / 40);
    console.log(`Funcionários necessários: ${staffNeeded}`);
  });
}

/**
 * Demonstra como ajustar o estoque com base nas previsões
 */
function adjustInventoryBasedOnForecast(forecasts: Map<string, DemandForecast>): void {
  console.log('\nAjuste de Estoque Baseado nas Previsões:');
  console.log('======================================');

  // Simula níveis atuais de estoque
  const currentInventory: Map<string, number> = new Map();

  // Inicializa com valores aleatórios
  forecasts.forEach((_, productId) => {
    const randomStock = Math.floor(Math.random() * 50) + 10; // Entre 10 e 59 unidades
    currentInventory.set(productId, randomStock);
  });

  // Calcula ajustes de estoque necessários
  const inventoryAdjustments: Map<
    string,
    {
      currentStock: number;
      recommendedStock: number;
      adjustment: number;
      urgency: 'Baixa' | 'Média' | 'Alta';
    }
  > = new Map();

  forecasts.forEach((forecast, productId) => {
    const currentStock = currentInventory.get(productId) || 0;

    // Calcula a demanda prevista para os próximos 7 dias
    const next7DaysDemand = forecast.forecastPoints
      .slice(0, 7)
      .reduce((sum, point) => sum + point.expectedQuantity, 0);

    // Calcula o estoque recomendado (demanda de 7 dias + 20% de margem de segurança)
    const recommendedStock = Math.ceil(next7DaysDemand * 1.2);

    // Calcula o ajuste necessário
    const adjustment = recommendedStock - currentStock;

    // Determina a urgência do ajuste
    let urgency: 'Baixa' | 'Média' | 'Alta' = 'Baixa';

    if (currentStock < next7DaysDemand * 0.5) {
      urgency = 'Alta'; // Menos de 50% da demanda prevista
    } else if (currentStock < next7DaysDemand) {
      urgency = 'Média'; // Menos de 100% da demanda prevista
    }

    inventoryAdjustments.set(productId, {
      currentStock,
      recommendedStock,
      adjustment,
      urgency,
    });
  });

  // Exibe os ajustes de estoque recomendados
  console.log('\nAjustes de Estoque Recomendados:');
  inventoryAdjustments.forEach((adjustment, productId) => {
    console.log(`\nProduto: ${productId}`);
    console.log(`Estoque atual: ${adjustment.currentStock} unidades`);
    console.log(`Estoque recomendado: ${adjustment.recommendedStock} unidades`);

    if (adjustment.adjustment > 0) {
      console.log(`Ação: Produzir mais ${adjustment.adjustment} unidades`);
    } else if (adjustment.adjustment < 0) {
      console.log(
        `Ação: Reduzir produção (excesso de ${Math.abs(adjustment.adjustment)} unidades)`
      );
    } else {
      console.log('Ação: Manter produção atual');
    }

    console.log(`Urgência: ${adjustment.urgency}`);
  });

  // Calcula o valor total do estoque atual e recomendado
  calculateInventoryValue(inventoryAdjustments);
}

/**
 * Calcula o valor do estoque atual e recomendado
 */
function calculateInventoryValue(inventoryAdjustments: Map<string, any>): void {
  // Simula preços dos produtos
  const productPrices: Record<string, number> = {
    'bolos-chocolate': 50.0,
    'bolos-morango': 55.0,
    'bolos-limao': 45.0,
    'tortas-limao': 40.0,
    'tortas-morango': 45.0,
    'tortas-chocolate': 50.0,
    'doces-brigadeiro': 2.5,
    'doces-beijinho': 2.5,
    'doces-cajuzinho': 2.5,
    'cookies-chocolate': 3.0,
    'cookies-aveia': 3.5,
    'cookies-baunilha': 3.0,
  };

  let currentValue = 0;
  let recommendedValue = 0;

  inventoryAdjustments.forEach((adjustment, productId) => {
    const price = productPrices[productId] || 10.0; // Preço padrão se desconhecido

    currentValue += adjustment.currentStock * price;
    recommendedValue += adjustment.recommendedStock * price;
  });

  console.log('\nValor do Estoque:');
  console.log(`Valor atual: R$ ${currentValue.toFixed(2)}`);
  console.log(`Valor recomendado: R$ ${recommendedValue.toFixed(2)}`);
  console.log(`Diferença: R$ ${(recommendedValue - currentValue).toFixed(2)}`);
}

// Executa a demonstração se este arquivo for executado diretamente
if (require.main === module) {
  demonstrateDemandForecast();
}
