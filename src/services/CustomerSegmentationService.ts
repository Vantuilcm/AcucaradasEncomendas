/**
 * Serviço de Segmentação de Clientes
 *
 * Este serviço implementa algoritmos para segmentar clientes com base em seu comportamento
 * de compra, frequência, valor gasto e preferências, permitindo estratégias de marketing direcionadas.
 */

// Interfaces
export interface CustomerPurchaseData {
  customerId: string;
  totalSpent: number;
  orderCount: number;
  lastPurchaseDate: Date;
  averageOrderValue: number;
  categories: { [category: string]: number }; // categoria -> quantidade de compras
  products: { [productId: string]: number }; // productId -> quantidade de compras
  purchaseFrequency: number; // média de dias entre compras
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  marketingStrategies: string[];
  customers: string[]; // IDs dos clientes no segmento
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentationConfig {
  // Configurações para RFM (Recency, Frequency, Monetary)
  recencyWeight: number; // Peso para recência (0-1)
  frequencyWeight: number; // Peso para frequência (0-1)
  monetaryWeight: number; // Peso para valor monetário (0-1)

  // Limiares para classificação RFM
  recencyThresholds: number[]; // em dias [30, 90, 180] -> 3 níveis
  frequencyThresholds: number[]; // em número de pedidos [1, 3, 5] -> 3 níveis
  monetaryThresholds: number[]; // em valor gasto [100, 300, 500] -> 3 níveis

  // Configurações para clustering
  numberOfClusters: number; // Número de clusters para K-means
  minClusterSize: number; // Tamanho mínimo de um cluster

  // Configurações para análise de preferências
  categoryPreferenceThreshold: number; // % mínima de compras em uma categoria para ser considerada preferência

  // Configurações para atualização
  autoUpdateFrequency: number; // em dias
}

export class CustomerSegmentationService {
  private static instance: CustomerSegmentationService;
  private config: SegmentationConfig;
  private segments: Map<string, CustomerSegment>;
  private customerData: Map<string, CustomerPurchaseData>;

  /**
   * Configuração padrão para segmentação
   */
  private readonly DEFAULT_CONFIG: SegmentationConfig = {
    recencyWeight: 0.35,
    frequencyWeight: 0.35,
    monetaryWeight: 0.3,
    recencyThresholds: [30, 90, 180], // dias
    frequencyThresholds: [1, 3, 5], // pedidos
    monetaryThresholds: [100, 300, 500], // reais
    numberOfClusters: 5,
    minClusterSize: 10,
    categoryPreferenceThreshold: 0.3, // 30%
    autoUpdateFrequency: 7, // atualizar semanalmente
  };

  /**
   * Construtor privado para implementar Singleton
   */
  private constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
    this.segments = new Map<string, CustomerSegment>();
    this.customerData = new Map<string, CustomerPurchaseData>();

    // Inicializar segmentos padrão
    this.initializeDefaultSegments();
  }

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): CustomerSegmentationService {
    if (!CustomerSegmentationService.instance) {
      CustomerSegmentationService.instance = new CustomerSegmentationService();
    }
    return CustomerSegmentationService.instance;
  }

  /**
   * Atualiza a configuração do serviço
   */
  public updateConfig(newConfig: Partial<SegmentationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Inicializa os segmentos padrão
   */
  private initializeDefaultSegments(): void {
    const now = new Date();

    // Segmento: Clientes VIP
    this.segments.set('segment_vip', {
      id: 'segment_vip',
      name: 'Clientes VIP',
      description: 'Clientes de alto valor que compram com frequência',
      characteristics: ['Alto valor gasto', 'Compras frequentes', 'Compras recentes'],
      marketingStrategies: [
        'Programa de fidelidade exclusivo',
        'Acesso antecipado a novos produtos',
        'Descontos personalizados',
      ],
      customers: [],
      createdAt: now,
      updatedAt: now,
    });

    // Segmento: Clientes Frequentes
    this.segments.set('segment_frequent', {
      id: 'segment_frequent',
      name: 'Clientes Frequentes',
      description: 'Clientes que compram regularmente, mas com valor médio',
      characteristics: ['Valor médio gasto', 'Compras muito frequentes', 'Compras recentes'],
      marketingStrategies: [
        'Programa de pontos por frequência',
        'Cupons de desconto para próxima compra',
        'Comunicações regulares sobre novidades',
      ],
      customers: [],
      createdAt: now,
      updatedAt: now,
    });

    // Segmento: Clientes Ocasionais
    this.segments.set('segment_occasional', {
      id: 'segment_occasional',
      name: 'Clientes Ocasionais',
      description: 'Clientes que compram ocasionalmente',
      characteristics: [
        'Valor médio-baixo gasto',
        'Compras pouco frequentes',
        'Algumas compras recentes',
      ],
      marketingStrategies: [
        'Lembretes de produtos',
        'Ofertas sazonais',
        'Incentivos para aumentar frequência',
      ],
      customers: [],
      createdAt: now,
      updatedAt: now,
    });

    // Segmento: Clientes em Risco
    this.segments.set('segment_at_risk', {
      id: 'segment_at_risk',
      name: 'Clientes em Risco',
      description: 'Clientes que não compram há algum tempo',
      characteristics: [
        'Sem compras recentes',
        'Histórico de compras anterior',
        'Valor médio-alto em compras passadas',
      ],
      marketingStrategies: [
        'Campanhas de reativação',
        'Ofertas especiais de retorno',
        'Pesquisas de satisfação',
      ],
      customers: [],
      createdAt: now,
      updatedAt: now,
    });

    // Segmento: Novos Clientes
    this.segments.set('segment_new', {
      id: 'segment_new',
      name: 'Novos Clientes',
      description: 'Clientes que fizeram sua primeira compra recentemente',
      characteristics: [
        'Primeira compra recente',
        'Pouco histórico para análise',
        'Potencial desconhecido',
      ],
      marketingStrategies: [
        'Boas-vindas e onboarding',
        'Incentivos para segunda compra',
        'Educação sobre produtos e serviços',
      ],
      customers: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Processa os dados de compra de um cliente
   */
  public processCustomerData(customerId: string, orders: any[]): CustomerPurchaseData {
    // Inicializar dados do cliente
    const customerData: CustomerPurchaseData = {
      customerId,
      totalSpent: 0,
      orderCount: orders.length,
      lastPurchaseDate: new Date(0),
      averageOrderValue: 0,
      categories: {},
      products: {},
      purchaseFrequency: 0,
    };

    if (orders.length === 0) {
      return customerData;
    }

    // Ordenar pedidos por data
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Última data de compra
    customerData.lastPurchaseDate = new Date(sortedOrders[0].createdAt);

    // Calcular valor total gasto
    let totalSpent = 0;

    // Datas para cálculo de frequência
    const purchaseDates: Date[] = [];

    // Processar cada pedido
    for (const order of sortedOrders) {
      totalSpent += order.totalAmount;
      purchaseDates.push(new Date(order.createdAt));

      // Processar itens do pedido
      for (const item of order.items) {
        // Incrementar contagem de produtos
        customerData.products[item.productId] =
          (customerData.products[item.productId] || 0) + item.quantity;

        // Incrementar contagem de categorias (assumindo que temos acesso à categoria do produto)
        if (item.category) {
          customerData.categories[item.category] =
            (customerData.categories[item.category] || 0) + item.quantity;
        }
      }
    }

    customerData.totalSpent = totalSpent;
    customerData.averageOrderValue = totalSpent / orders.length;

    // Calcular frequência de compra (média de dias entre compras)
    if (purchaseDates.length > 1) {
      let totalDaysBetween = 0;
      for (let i = 0; i < purchaseDates.length - 1; i++) {
        const daysBetween =
          (purchaseDates[i].getTime() - purchaseDates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
        totalDaysBetween += daysBetween;
      }
      customerData.purchaseFrequency = totalDaysBetween / (purchaseDates.length - 1);
    }

    // Armazenar dados do cliente
    this.customerData.set(customerId, customerData);

    return customerData;
  }

  /**
   * Segmenta clientes usando o modelo RFM (Recency, Frequency, Monetary)
   */
  public segmentCustomersRFM(): void {
    // Limpar segmentos existentes
    this.segments.forEach(segment => {
      segment.customers = [];
    });

    const now = new Date();

    // Processar cada cliente
    this.customerData.forEach((data, customerId) => {
      // Calcular pontuação RFM

      // Recência (R) - quão recente foi a última compra
      const daysSinceLastPurchase =
        (now.getTime() - data.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24);
      let recencyScore = 3; // pontuação padrão média

      if (daysSinceLastPurchase <= this.config.recencyThresholds[0]) {
        recencyScore = 5; // muito recente
      } else if (daysSinceLastPurchase <= this.config.recencyThresholds[1]) {
        recencyScore = 4; // recente
      } else if (daysSinceLastPurchase <= this.config.recencyThresholds[2]) {
        recencyScore = 3; // médio
      } else if (daysSinceLastPurchase <= this.config.recencyThresholds[2] * 2) {
        recencyScore = 2; // não tão recente
      } else {
        recencyScore = 1; // muito antigo
      }

      // Frequência (F) - quantas vezes o cliente comprou
      let frequencyScore = 3; // pontuação padrão média

      if (data.orderCount >= this.config.frequencyThresholds[2]) {
        frequencyScore = 5; // muito frequente
      } else if (data.orderCount >= this.config.frequencyThresholds[1]) {
        frequencyScore = 4; // frequente
      } else if (data.orderCount >= this.config.frequencyThresholds[0]) {
        frequencyScore = 3; // médio
      } else {
        frequencyScore = 2; // pouco frequente
      }

      // Valor Monetário (M) - quanto o cliente gastou
      let monetaryScore = 3; // pontuação padrão média

      if (data.totalSpent >= this.config.monetaryThresholds[2]) {
        monetaryScore = 5; // alto valor
      } else if (data.totalSpent >= this.config.monetaryThresholds[1]) {
        monetaryScore = 4; // bom valor
      } else if (data.totalSpent >= this.config.monetaryThresholds[0]) {
        monetaryScore = 3; // valor médio
      } else {
        monetaryScore = 2; // baixo valor
      }

      // Calcular pontuação RFM ponderada
      const rfmScore =
        recencyScore * this.config.recencyWeight +
        frequencyScore * this.config.frequencyWeight +
        monetaryScore * this.config.monetaryWeight;

      // Atribuir cliente ao segmento apropriado
      if (data.orderCount === 1 && daysSinceLastPurchase <= 30) {
        // Novo cliente
        this.addCustomerToSegment('segment_new', customerId);
      } else if (rfmScore >= 4.5) {
        // Cliente VIP
        this.addCustomerToSegment('segment_vip', customerId);
      } else if (frequencyScore >= 4 && recencyScore >= 4) {
        // Cliente frequente
        this.addCustomerToSegment('segment_frequent', customerId);
      } else if (recencyScore <= 2 && frequencyScore >= 3) {
        // Cliente em risco
        this.addCustomerToSegment('segment_at_risk', customerId);
      } else {
        // Cliente ocasional
        this.addCustomerToSegment('segment_occasional', customerId);
      }
    });

    // Atualizar data de atualização dos segmentos
    this.segments.forEach(segment => {
      segment.updatedAt = now;
    });
  }

  /**
   * Adiciona um cliente a um segmento
   */
  private addCustomerToSegment(segmentId: string, customerId: string): void {
    const segment = this.segments.get(segmentId);
    if (segment && !segment.customers.includes(customerId)) {
      segment.customers.push(customerId);
    }
  }

  /**
   * Obtém todos os segmentos
   */
  public getAllSegments(): CustomerSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Obtém um segmento específico
   */
  public getSegmentById(segmentId: string): CustomerSegment | undefined {
    return this.segments.get(segmentId);
  }

  /**
   * Obtém o segmento de um cliente
   */
  public getCustomerSegment(customerId: string): CustomerSegment | undefined {
    for (const segment of this.segments.values()) {
      if (segment.customers.includes(customerId)) {
        return segment;
      }
    }
    return undefined;
  }

  /**
   * Identifica clientes com padrões de compra similares usando clustering
   */
  public findSimilarCustomers(customerId: string, limit: number = 5): string[] {
    const targetCustomer = this.customerData.get(customerId);
    if (!targetCustomer) {
      return [];
    }

    const similarCustomers: Array<{ id: string; similarity: number }> = [];

    // Calcular similaridade com outros clientes
    this.customerData.forEach((data, id) => {
      if (id === customerId) return; // Pular o próprio cliente

      // Calcular similaridade baseada em múltiplos fatores
      let similarity = 0;

      // Similaridade de valor médio de pedido (0-1)
      const aovSimilarity =
        1 -
        Math.min(
          1,
          Math.abs(targetCustomer.averageOrderValue - data.averageOrderValue) /
            Math.max(targetCustomer.averageOrderValue, data.averageOrderValue)
        );

      // Similaridade de frequência de compra (0-1)
      const freqSimilarity =
        1 -
        Math.min(
          1,
          Math.abs(targetCustomer.purchaseFrequency - data.purchaseFrequency) /
            Math.max(targetCustomer.purchaseFrequency, data.purchaseFrequency, 1)
        );

      // Similaridade de categorias (Coeficiente de Jaccard)
      const targetCategories = Object.keys(targetCustomer.categories);
      const dataCategories = Object.keys(data.categories);
      const commonCategories = targetCategories.filter(cat => dataCategories.includes(cat));
      const categorySimilarity =
        commonCategories.length /
        (targetCategories.length + dataCategories.length - commonCategories.length);

      // Similaridade de produtos (Coeficiente de Jaccard)
      const targetProducts = Object.keys(targetCustomer.products);
      const dataProducts = Object.keys(data.products);
      const commonProducts = targetProducts.filter(prod => dataProducts.includes(prod));
      const productSimilarity =
        commonProducts.length /
        (targetProducts.length + dataProducts.length - commonProducts.length);

      // Calcular similaridade total (média ponderada)
      similarity =
        aovSimilarity * 0.25 +
        freqSimilarity * 0.25 +
        categorySimilarity * 0.25 +
        productSimilarity * 0.25;

      similarCustomers.push({ id, similarity });
    });

    // Ordenar por similaridade e retornar os top N
    return similarCustomers
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.id);
  }

  /**
   * Identifica as categorias preferidas de um cliente
   */
  public getCustomerPreferredCategories(customerId: string): string[] {
    const customerData = this.customerData.get(customerId);
    if (!customerData) {
      return [];
    }

    const categories = customerData.categories;
    const totalItems = Object.values(categories).reduce((sum, count) => sum + count, 0);

    if (totalItems === 0) {
      return [];
    }

    // Calcular porcentagem de cada categoria
    const categoryPercentages: Array<{ category: string; percentage: number }> = [];

    for (const [category, count] of Object.entries(categories)) {
      const percentage = count / totalItems;
      if (percentage >= this.config.categoryPreferenceThreshold) {
        categoryPercentages.push({ category, percentage });
      }
    }

    // Ordenar por porcentagem e retornar as categorias
    return categoryPercentages
      .sort((a, b) => b.percentage - a.percentage)
      .map(item => item.category);
  }

  /**
   * Gera recomendações de marketing para um segmento
   */
  public generateMarketingRecommendations(segmentId: string): string[] {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      return [];
    }

    // Retornar estratégias de marketing do segmento
    return segment.marketingStrategies;
  }

  /**
   * Calcula o valor do tempo de vida (LTV) de um cliente
   */
  public calculateCustomerLTV(customerId: string): number {
    const customerData = this.customerData.get(customerId);
    if (!customerData) {
      return 0;
    }

    // Cálculo simples de LTV: Valor médio de pedido * Frequência anual * Tempo de vida esperado (em anos)
    const averageOrderValue = customerData.averageOrderValue;

    // Calcular frequência anual (pedidos por ano)
    let annualFrequency = 0;
    if (customerData.purchaseFrequency > 0) {
      // Converter frequência de dias para frequência anual
      annualFrequency = 365 / customerData.purchaseFrequency;
    } else if (customerData.orderCount > 0) {
      // Se não temos frequência calculada, usar contagem de pedidos
      const firstOrderDate = new Date(customerData.lastPurchaseDate);
      firstOrderDate.setDate(firstOrderDate.getDate() - customerData.orderCount * 30); // Estimativa grosseira

      const daysSinceFirstOrder =
        (new Date().getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24);
      const yearsSinceFirstOrder = daysSinceFirstOrder / 365;

      annualFrequency = customerData.orderCount / Math.max(yearsSinceFirstOrder, 0.1);
    }

    // Tempo de vida esperado em anos (assumindo 3 anos como padrão da indústria para e-commerce)
    const expectedLifetimeYears = 3;

    // Calcular LTV
    const ltv = averageOrderValue * annualFrequency * expectedLifetimeYears;

    return ltv;
  }
}

// Exportar instância única
export const customerSegmentationService = CustomerSegmentationService.getInstance();
