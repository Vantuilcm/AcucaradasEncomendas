import {
  dynamicPricingService,
  ProductPricing,
  SalesData,
  SeasonalEvent,
  PriceSuggestion,
} from '../services/DynamicPricingService';

/**
 * Este arquivo demonstra como utilizar o DynamicPricingService para gerar sugestões de preço
 * e aplicar ajustes automáticos respeitando a autonomia do produtor
 */

/**
 * Função que simula a obtenção de produtos do banco de dados
 */
function getProductsFromDatabase(): ProductPricing[] {
  // Simulação de produtos
  return [
    {
      id: 'product1',
      name: 'Bolo de Chocolate',
      basePrice: 45.0,
      currentPrice: 45.0,
      minPrice: 40.0,
      maxPrice: 55.0,
      producerId: 'producer1',
      category: 'bolos',
      tags: ['chocolate', 'festa', 'aniversário'],
      createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 dias atrás
      updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 dias atrás
    },
    {
      id: 'product2',
      name: 'Cupcake de Morango',
      basePrice: 8.5,
      currentPrice: 8.99,
      minPrice: 7.5,
      maxPrice: 10.0,
      producerId: 'producer1',
      category: 'cupcakes',
      tags: ['morango', 'frutas'],
      createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000, // 120 dias atrás
      updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 dias atrás
    },
    {
      id: 'product3',
      name: 'Torta de Limão',
      basePrice: 35.0,
      currentPrice: 32.99,
      minPrice: 30.0,
      maxPrice: 40.0,
      producerId: 'producer2',
      category: 'tortas',
      tags: ['limão', 'frutas', 'azedo'],
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 dias atrás
      updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 dias atrás
    },
  ];
}

/**
 * Função que simula a obtenção do histórico de vendas
 */
function getSalesHistory(): Map<string, SalesData[]> {
  const salesMap = new Map<string, SalesData[]>();

  // Histórico de vendas para o produto 1 (Bolo de Chocolate)
  const product1Sales: SalesData[] = [];
  // Gerar dados de vendas dos últimos 90 dias
  const now = Date.now();
  for (let i = 1; i <= 90; i++) {
    // Mais vendas nos fins de semana
    const dayOfWeek = new Date(now - i * 24 * 60 * 60 * 1000).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Quantidade base + variação para fins de semana
    const baseQuantity = 3;
    const quantity = isWeekend ? baseQuantity + 2 : baseQuantity;

    // Aumento gradual nas vendas recentes (últimos 30 dias)
    const recentBoost = i <= 30 ? 1 + (30 - i) / 30 : 0;

    product1Sales.push({
      productId: 'product1',
      date: now - i * 24 * 60 * 60 * 1000,
      quantity: Math.round(quantity + recentBoost),
      price: 45.0,
      promotionActive: i >= 60 && i <= 70, // Promoção entre 60 e 70 dias atrás
    });
  }
  salesMap.set('product1', product1Sales);

  // Histórico de vendas para o produto 2 (Cupcake de Morango)
  const product2Sales: SalesData[] = [];
  for (let i = 1; i <= 90; i++) {
    // Queda nas vendas recentes
    const recentDrop = i <= 30 ? 1 - (30 - i) / 60 : 0;

    product2Sales.push({
      productId: 'product2',
      date: now - i * 24 * 60 * 60 * 1000,
      quantity: Math.max(1, Math.round(5 * (1 - recentDrop))),
      price: 8.99,
      promotionActive: false,
    });
  }
  salesMap.set('product2', product2Sales);

  // Histórico de vendas para o produto 3 (Torta de Limão)
  const product3Sales: SalesData[] = [];
  for (let i = 1; i <= 60; i++) {
    // Apenas 60 dias de histórico
    // Vendas estáveis
    product3Sales.push({
      productId: 'product3',
      date: now - i * 24 * 60 * 60 * 1000,
      quantity: Math.round(2 + Math.random() * 2), // Entre 2 e 4 unidades
      price: i > 30 ? 35.0 : 32.99, // Mudança de preço há 30 dias
      promotionActive: false,
    });
  }
  salesMap.set('product3', product3Sales);

  return salesMap;
}

/**
 * Função que simula a obtenção de produtos similares
 */
function getSimilarProductsSales(): Map<string, SalesData[]> {
  const similarMap = new Map<string, SalesData[]>();

  // Produtos similares ao Bolo de Chocolate
  const similarToProduct1: SalesData[] = [
    // Bolo de Chocolate Concorrente 1
    ...Array.from({ length: 30 }, (_, i) => ({
      productId: 'competitor1_chocolate_cake',
      date: Date.now() - i * 24 * 60 * 60 * 1000,
      quantity: 2,
      price: 42.9, // Mais barato
      promotionActive: false,
    })),
    // Bolo de Chocolate Concorrente 2
    ...Array.from({ length: 30 }, (_, i) => ({
      productId: 'competitor2_chocolate_cake',
      date: Date.now() - i * 24 * 60 * 60 * 1000,
      quantity: 1,
      price: 49.9, // Mais caro
      promotionActive: false,
    })),
  ];
  similarMap.set('product1', similarToProduct1);

  // Produtos similares ao Cupcake de Morango
  const similarToProduct2: SalesData[] = [
    // Cupcake de Morango Concorrente
    ...Array.from({ length: 30 }, (_, i) => ({
      productId: 'competitor_strawberry_cupcake',
      date: Date.now() - i * 24 * 60 * 60 * 1000,
      quantity: 8, // Vende bem
      price: 7.5, // Mais barato
      promotionActive: false,
    })),
  ];
  similarMap.set('product2', similarToProduct2);

  // Produtos similares à Torta de Limão
  const similarToProduct3: SalesData[] = [
    // Torta de Limão Concorrente
    ...Array.from({ length: 30 }, (_, i) => ({
      productId: 'competitor_lemon_pie',
      date: Date.now() - i * 24 * 60 * 60 * 1000,
      quantity: 3,
      price: 34.9, // Preço similar
      promotionActive: false,
    })),
  ];
  similarMap.set('product3', similarToProduct3);

  return similarMap;
}

/**
 * Função que configura eventos sazonais
 */
function setupSeasonalEvents(): void {
  // Limpar eventos existentes
  const currentEvents = dynamicPricingService.getSeasonalEvents();
  currentEvents.forEach(event => {
    dynamicPricingService.removeSeasonalEvent(event.id);
  });

  // Verificar se estamos próximos de datas festivas
  const now = new Date();
  const currentMonth = now.getMonth();

  // Natal (dezembro)
  if (currentMonth === 11) {
    const christmasEvent: SeasonalEvent = {
      id: 'christmas_2023',
      name: 'Natal 2023',
      startDate: new Date(now.getFullYear(), 11, 1).getTime(), // 1 de dezembro
      endDate: new Date(now.getFullYear(), 11, 25).getTime(), // 25 de dezembro
      categories: ['bolos', 'tortas', 'doces'],
      tags: ['chocolate', 'festa', 'especial'],
      adjustmentFactor: 1.15, // +15%
      description: 'Aumento de demanda para o período natalino',
    };
    dynamicPricingService.updateSeasonalEvent(christmasEvent);
    console.log('Evento sazonal configurado: Natal');
  }

  // Páscoa (geralmente março ou abril)
  if (currentMonth === 2 || currentMonth === 3) {
    const easterEvent: SeasonalEvent = {
      id: 'easter_2023',
      name: 'Páscoa 2023',
      startDate: new Date(now.getFullYear(), currentMonth, 1).getTime(),
      endDate: new Date(now.getFullYear(), currentMonth + 1, 15).getTime(),
      categories: ['chocolates', 'doces'],
      tags: ['chocolate', 'páscoa', 'especial'],
      adjustmentFactor: 1.2, // +20%
      description: 'Aumento de demanda para o período de Páscoa',
    };
    dynamicPricingService.updateSeasonalEvent(easterEvent);
    console.log('Evento sazonal configurado: Páscoa');
  }

  // Dia das Mães (maio)
  if (currentMonth === 4) {
    const mothersDay: SeasonalEvent = {
      id: 'mothers_day_2023',
      name: 'Dia das Mães 2023',
      startDate: new Date(now.getFullYear(), 4, 1).getTime(),
      endDate: new Date(now.getFullYear(), 4, 14).getTime(),
      categories: ['bolos', 'tortas', 'doces'],
      tags: ['presente', 'especial'],
      adjustmentFactor: 1.1, // +10%
      description: 'Aumento de demanda para o Dia das Mães',
    };
    dynamicPricingService.updateSeasonalEvent(mothersDay);
    console.log('Evento sazonal configurado: Dia das Mães');
  }

  // Período de baixa temporada (fevereiro)
  if (currentMonth === 1) {
    const lowSeason: SeasonalEvent = {
      id: 'low_season_feb',
      name: 'Baixa Temporada - Fevereiro',
      startDate: new Date(now.getFullYear(), 1, 1).getTime(),
      endDate: new Date(now.getFullYear(), 1, 28).getTime(),
      categories: ['bolos', 'tortas', 'doces', 'cupcakes'],
      tags: [],
      adjustmentFactor: 0.95, // -5%
      description: 'Redução de demanda no período pós-festas',
    };
    dynamicPricingService.updateSeasonalEvent(lowSeason);
    console.log('Evento sazonal configurado: Baixa Temporada');
  }
}

/**
 * Função principal que demonstra o uso do serviço de precificação dinâmica
 */
export function runDynamicPricingExample(): void {
  console.log('Iniciando exemplo de precificação dinâmica...');

  // 1. Configurar o serviço
  dynamicPricingService.updateConfig({
    enabled: true,
    maxAutoAdjustment: 0.05, // 5% de ajuste máximo automático
    demandWeight: 0.5, // 50% de peso para demanda
    seasonalWeight: 0.3, // 30% de peso para sazonalidade
    competitionWeight: 0.2, // 20% de peso para competição
  });
  console.log('Serviço de precificação dinâmica configurado');

  // 2. Configurar eventos sazonais
  setupSeasonalEvents();

  // 3. Obter produtos e dados de vendas
  const products = getProductsFromDatabase();
  const salesHistory = getSalesHistory();
  const similarProductsSales = getSimilarProductsSales();

  console.log(`Analisando ${products.length} produtos...`);

  // 4. Gerar sugestões de preço para cada produto
  const suggestions: PriceSuggestion[] = [];

  for (const product of products) {
    const productSales = salesHistory.get(product.id) || [];
    const similarSales = similarProductsSales.get(product.id) || [];

    const suggestion = dynamicPricingService.generatePriceSuggestion(
      product,
      productSales,
      similarSales
    );

    suggestions.push(suggestion);

    // Exibir sugestão
    console.log(`\nSugestão para ${product.name}:`);
    console.log(`Preço atual: R$ ${product.currentPrice.toFixed(2)}`);
    console.log(`Preço sugerido: R$ ${suggestion.suggestedPrice.toFixed(2)}`);
    console.log(`Ajuste: ${((suggestion.adjustmentFactor - 1) * 100).toFixed(2)}%`);
    console.log(`Confiança: ${(suggestion.confidence * 100).toFixed(2)}%`);
    console.log('Razões:');

    suggestion.reasons.forEach(reason => {
      console.log(`  - ${reason.description} (impacto: ${(reason.impact * 100).toFixed(2)}%)`);
    });

    // 5. Verificar se o ajuste pode ser automático
    const adjustedProduct = dynamicPricingService.applyAutomaticAdjustment(product, suggestion);

    if (adjustedProduct) {
      console.log(`AJUSTE AUTOMÁTICO APLICADO: R$ ${adjustedProduct.currentPrice.toFixed(2)}`);
    } else {
      console.log('Ajuste requer aprovação manual do produtor');

      // Simular decisão do produtor
      const acceptSuggestion = Math.random() > 0.3; // 70% de chance de aceitar
      if (acceptSuggestion) {
        console.log('Produtor ACEITOU a sugestão de preço');
      } else {
        console.log('Produtor REJEITOU a sugestão de preço');
      }
    }
  }

  // 6. Resumo das sugestões
  console.log('\n=== RESUMO DAS SUGESTÕES ===');
  console.log(`Total de produtos analisados: ${products.length}`);

  const increaseSuggestions = suggestions.filter(s => s.adjustmentFactor > 1).length;
  const decreaseSuggestions = suggestions.filter(s => s.adjustmentFactor < 1).length;
  const noChangeSuggestions = suggestions.filter(s => s.adjustmentFactor === 1).length;

  console.log(`Sugestões de aumento: ${increaseSuggestions}`);
  console.log(`Sugestões de redução: ${decreaseSuggestions}`);
  console.log(`Sem alteração: ${noChangeSuggestions}`);

  // 7. Demonstrar como o produtor pode ajustar a configuração
  console.log('\n=== PAINEL DE CONTROLE DO PRODUTOR ===');
  console.log('O produtor pode ajustar as seguintes configurações:');
  console.log('1. Limite máximo de ajuste automático');
  console.log('2. Preço mínimo e máximo para cada produto');
  console.log('3. Pesos dos fatores (demanda, sazonalidade, competição)');
  console.log('4. Desativar completamente o sistema para produtos específicos');

  // Exemplo de ajuste de configuração pelo produtor
  console.log('\nProdutor ajustou a configuração:');
  dynamicPricingService.updateConfig({
    maxAutoAdjustment: 0.03, // Reduzindo para 3% o ajuste automático máximo
  });
  console.log('Limite de ajuste automático reduzido para 3%');

  console.log('\nExemplo de precificação dinâmica concluído!');
}

// Exemplo de uso:
// runDynamicPricingExample();
