import { Order } from '../types/Order';
import { loggingService } from './LoggingService';

/**
 * Enum para flags de fraude que podem ser detectadas
 */
export enum FraudFlag {
  MULTIPLE_ORDERS = 'multiple_orders_short_period',
  UNUSUAL_ADDRESS = 'unusual_delivery_address',
  HIGH_VALUE = 'high_value_order',
  UNUSUAL_TIME = 'unusual_order_time',
  UNUSUAL_PAYMENT = 'unusual_payment_method',
  RAPID_ADDRESS_CHANGE = 'rapid_address_change',
}

/**
 * Interface para configuração do serviço de detecção de fraudes
 */
export interface FraudDetectionConfig {
  // Limites para múltiplos pedidos
  multipleOrdersThreshold: number; // Número de pedidos em 24h que gera alerta
  multipleOrdersWeight: number; // Peso deste fator na pontuação final

  // Limites para endereço incomum
  unusualAddressWeight: number; // Peso deste fator na pontuação final

  // Limites para valor alto
  highValuePercentage: number; // Percentual acima da média que gera alerta
  highValueWeight: number; // Peso deste fator na pontuação final

  // Limites para horário incomum
  unusualTimeWeight: number; // Peso deste fator na pontuação final

  // Limites para método de pagamento incomum
  unusualPaymentWeight: number; // Peso deste fator na pontuação final

  // Limites para mudança rápida de endereço
  addressChangeHours: number; // Período em horas para considerar mudança rápida
  addressChangeWeight: number; // Peso deste fator na pontuação final

  // Limites de pontuação para classificação de risco
  mediumRiskThreshold: number; // Pontuação mínima para risco médio
  highRiskThreshold: number; // Pontuação mínima para risco alto
}

/**
 * Interface para resultado da análise de fraude
 */
export interface FraudAnalysisResult {
  riskScore: number; // Pontuação de risco (0-100)
  riskLevel: 'low' | 'medium' | 'high'; // Nível de risco
  flagsRaised: FraudFlag[]; // Flags de fraude levantadas
  details: Record<
    FraudFlag,
    {
      // Detalhes de cada flag
      raised: boolean; // Se a flag foi levantada
      score: number; // Pontuação atribuída
      reason: string; // Razão da pontuação
    }
  >;
  timestamp: number; // Timestamp da análise
}

/**
 * Serviço para detecção de fraudes em pedidos
 * Implementa um sistema de pontuação de risco baseado em múltiplos fatores
 */
export class FraudDetectionService {
  private static instance: FraudDetectionService;
  private config: FraudDetectionConfig;

  /**
   * Configuração padrão para detecção de fraudes
   */
  private readonly DEFAULT_CONFIG: FraudDetectionConfig = {
    multipleOrdersThreshold: 3,
    multipleOrdersWeight: 25,

    unusualAddressWeight: 15,

    highValuePercentage: 200,
    highValueWeight: 20,

    unusualTimeWeight: 10,

    unusualPaymentWeight: 15,

    addressChangeHours: 24,
    addressChangeWeight: 15,

    mediumRiskThreshold: 30,
    highRiskThreshold: 60,
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
  public static getInstance(): FraudDetectionService {
    if (!FraudDetectionService.instance) {
      FraudDetectionService.instance = new FraudDetectionService();
    }
    return FraudDetectionService.instance;
  }

  /**
   * Atualiza a configuração do serviço
   * @param newConfig Nova configuração parcial ou completa
   */
  public updateConfig(newConfig: Partial<FraudDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtém a configuração atual
   */
  public getConfig(): FraudDetectionConfig {
    return { ...this.config };
  }

  /**
   * Analisa um pedido para detectar possíveis fraudes
   * @param order Pedido atual a ser analisado
   * @param previousOrders Histórico de pedidos do usuário
   * @param userAverageOrderValue Valor médio dos pedidos do usuário (opcional)
   * @returns Resultado da análise de fraude
   */
  public analyzeOrder(
    order: Order,
    previousOrders: Order[],
    userAverageOrderValue?: number
  ): FraudAnalysisResult {
    try {
      // Inicializa o resultado da análise
      const result: FraudAnalysisResult = {
        riskScore: 0,
        riskLevel: 'low',
        flagsRaised: [],
        details: {
          [FraudFlag.MULTIPLE_ORDERS]: { raised: false, score: 0, reason: '' },
          [FraudFlag.UNUSUAL_ADDRESS]: { raised: false, score: 0, reason: '' },
          [FraudFlag.HIGH_VALUE]: { raised: false, score: 0, reason: '' },
          [FraudFlag.UNUSUAL_TIME]: { raised: false, score: 0, reason: '' },
          [FraudFlag.UNUSUAL_PAYMENT]: { raised: false, score: 0, reason: '' },
          [FraudFlag.RAPID_ADDRESS_CHANGE]: { raised: false, score: 0, reason: '' },
        },
        timestamp: Date.now(),
      };

      // Verifica múltiplos pedidos em curto período
      this.checkMultipleOrders(order, previousOrders, result);

      // Verifica endereço incomum
      this.checkUnusualAddress(order, previousOrders, result);

      // Verifica valor alto
      this.checkHighValue(order, userAverageOrderValue, previousOrders, result);

      // Verifica horário atípico
      this.checkUnusualTime(order, previousOrders, result);

      // Verifica método de pagamento incomum
      this.checkUnusualPaymentMethod(order, previousOrders, result);

      // Verifica mudança rápida de endereço
      this.checkRapidAddressChange(order, previousOrders, result);

      // Calcula pontuação total e nível de risco
      this.calculateRiskLevel(result);

      return result;
    } catch (error) {
      loggingService.error('Erro ao analisar pedido para fraude', { orderId: order.id, error });
      // Em caso de erro, retorna risco baixo para não bloquear pedidos legítimos
      return {
        riskScore: 0,
        riskLevel: 'low',
        flagsRaised: [],
        details: {
          [FraudFlag.MULTIPLE_ORDERS]: { raised: false, score: 0, reason: '' },
          [FraudFlag.UNUSUAL_ADDRESS]: { raised: false, score: 0, reason: '' },
          [FraudFlag.HIGH_VALUE]: { raised: false, score: 0, reason: '' },
          [FraudFlag.UNUSUAL_TIME]: { raised: false, score: 0, reason: '' },
          [FraudFlag.UNUSUAL_PAYMENT]: { raised: false, score: 0, reason: '' },
          [FraudFlag.RAPID_ADDRESS_CHANGE]: { raised: false, score: 0, reason: '' },
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Verifica se há múltiplos pedidos em um curto período
   */
  private checkMultipleOrders(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Considera pedidos nas últimas 24 horas
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentOrders = previousOrders.filter(o => new Date(o.createdAt).getTime() > last24Hours);

    // Se o número de pedidos recentes exceder o limite, levanta a flag
    if (recentOrders.length >= this.config.multipleOrdersThreshold) {
      const score = this.config.multipleOrdersWeight;
      result.details[FraudFlag.MULTIPLE_ORDERS] = {
        raised: true,
        score,
        reason: `${recentOrders.length} pedidos nas últimas 24 horas (limite: ${this.config.multipleOrdersThreshold})`,
      };
      result.flagsRaised.push(FraudFlag.MULTIPLE_ORDERS);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se o endereço de entrega é incomum para o usuário
   */
  private checkUnusualAddress(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Se não houver pedidos anteriores ou endereço de entrega, pula a verificação
    if (previousOrders.length === 0 || !order.deliveryAddress) return;

    // Extrai endereços anteriores
    const previousAddresses = previousOrders
      .filter(o => o.deliveryAddress)
      .map(o => o.deliveryAddress);

    // Verifica se o endereço atual já foi usado antes
    const addressUsedBefore = previousAddresses.some(addr =>
      this.isSameAddress(addr, order.deliveryAddress!)
    );

    // Se o endereço nunca foi usado antes, levanta a flag
    if (!addressUsedBefore) {
      const score = this.config.unusualAddressWeight;
      result.details[FraudFlag.UNUSUAL_ADDRESS] = {
        raised: true,
        score,
        reason: 'Endereço de entrega nunca usado anteriormente',
      };
      result.flagsRaised.push(FraudFlag.UNUSUAL_ADDRESS);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se o valor do pedido é muito superior à média do usuário
   */
  private checkHighValue(
    order: Order,
    userAverageOrderValue: number | undefined,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Calcula o valor total do pedido atual
    const currentOrderValue = this.calculateOrderValue(order);

    // Se não foi fornecido valor médio, calcula com base no histórico
    let averageValue = userAverageOrderValue;
    if (averageValue === undefined && previousOrders.length > 0) {
      const totalValue = previousOrders.reduce((sum, o) => sum + this.calculateOrderValue(o), 0);
      averageValue = totalValue / previousOrders.length;
    }

    // Se não há média para comparar, pula a verificação
    if (averageValue === undefined || averageValue === 0) return;

    // Calcula a porcentagem acima da média
    const percentageAboveAverage = ((currentOrderValue - averageValue) / averageValue) * 100;

    // Se o valor for muito acima da média, levanta a flag
    if (percentageAboveAverage > this.config.highValuePercentage) {
      const score = this.config.highValueWeight;
      result.details[FraudFlag.HIGH_VALUE] = {
        raised: true,
        score,
        reason: `Valor ${percentageAboveAverage.toFixed(0)}% acima da média do usuário`,
      };
      result.flagsRaised.push(FraudFlag.HIGH_VALUE);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se o horário do pedido é atípico para o usuário
   */
  private checkUnusualTime(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Se não houver pedidos anteriores suficientes, pula a verificação
    if (previousOrders.length < 3) return;

    // Extrai a hora do dia do pedido atual
    const orderHour = new Date(order.createdAt).getHours();

    // Extrai as horas dos pedidos anteriores
    const previousHours = previousOrders.map(o => new Date(o.createdAt).getHours());

    // Verifica se a hora atual está dentro do padrão do usuário
    // Considera um intervalo de ±2 horas
    const isWithinPattern = previousHours.some(
      hour => Math.abs(hour - orderHour) <= 2 || Math.abs(hour - orderHour) >= 22 // Para lidar com casos como 23h vs 1h
    );

    // Se o horário for atípico, levanta a flag
    if (!isWithinPattern) {
      const score = this.config.unusualTimeWeight;
      result.details[FraudFlag.UNUSUAL_TIME] = {
        raised: true,
        score,
        reason: `Pedido realizado em horário atípico (${orderHour}h)`,
      };
      result.flagsRaised.push(FraudFlag.UNUSUAL_TIME);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se o método de pagamento é incomum para o usuário
   */
  private checkUnusualPaymentMethod(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Se não houver pedidos anteriores ou informação de pagamento, pula a verificação
    if (previousOrders.length === 0 || !order.paymentMethod) return;

    // Extrai métodos de pagamento anteriores
    const previousMethods = previousOrders.filter(o => o.paymentMethod).map(o => o.paymentMethod);

    // Verifica se o método atual já foi usado antes
    const methodUsedBefore = previousMethods.includes(order.paymentMethod);

    // Se o método nunca foi usado antes, levanta a flag
    if (!methodUsedBefore) {
      const score = this.config.unusualPaymentWeight;
      result.details[FraudFlag.UNUSUAL_PAYMENT] = {
        raised: true,
        score,
        reason: `Método de pagamento '${order.paymentMethod}' nunca usado anteriormente`,
      };
      result.flagsRaised.push(FraudFlag.UNUSUAL_PAYMENT);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se houve mudança rápida de endereço
   */
  private checkRapidAddressChange(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Se não houver pedidos anteriores ou endereço de entrega, pula a verificação
    if (previousOrders.length === 0 || !order.deliveryAddress) return;

    // Ordena pedidos por data (mais recente primeiro)
    const sortedOrders = [...previousOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Pega o pedido mais recente com endereço
    const lastOrder = sortedOrders.find(o => o.deliveryAddress);
    if (!lastOrder || !lastOrder.deliveryAddress) return;

    // Verifica se o endereço é diferente do último pedido
    const addressChanged = !this.isSameAddress(lastOrder.deliveryAddress, order.deliveryAddress);

    // Verifica se o pedido anterior foi feito dentro do período de configuração
    const hoursSinceLastOrder =
      (new Date(order.createdAt).getTime() - new Date(lastOrder.createdAt).getTime()) /
      (1000 * 60 * 60);

    // Se houve mudança rápida de endereço, levanta a flag
    if (addressChanged && hoursSinceLastOrder < this.config.addressChangeHours) {
      const score = this.config.addressChangeWeight;
      result.details[FraudFlag.RAPID_ADDRESS_CHANGE] = {
        raised: true,
        score,
        reason: `Mudança de endereço após ${hoursSinceLastOrder.toFixed(1)} horas do último pedido`,
      };
      result.flagsRaised.push(FraudFlag.RAPID_ADDRESS_CHANGE);
      result.riskScore += score;
    }
  }

  /**
   * Calcula o nível de risco com base na pontuação total
   */
  private calculateRiskLevel(result: FraudAnalysisResult): void {
    // Limita a pontuação máxima a 100
    result.riskScore = Math.min(result.riskScore, 100);

    // Define o nível de risco com base nos limiares configurados
    if (result.riskScore >= this.config.highRiskThreshold) {
      result.riskLevel = 'high';
    } else if (result.riskScore >= this.config.mediumRiskThreshold) {
      result.riskLevel = 'medium';
    } else {
      result.riskLevel = 'low';
    }
  }

  /**
   * Calcula o valor total de um pedido
   */
  private calculateOrderValue(order: Order): number {
    let total = 0;

    // Soma o valor de cada item
    if (order.items && Array.isArray(order.items)) {
      total = order.items.reduce((sum, item) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        // Adiciona o valor das opções, se houver
        const optionsTotal = item.options
          ? item.options.reduce((optSum, opt) => optSum + (opt.price || 0), 0)
          : 0;
        return sum + itemTotal + optionsTotal;
      }, 0);
    }

    return total;
  }

  /**
   * Verifica se dois endereços são considerados iguais
   * Simplificação: compara apenas CEP e número
   */
  private isSameAddress(addr1: any, addr2: any): boolean {
    // Verifica se ambos os endereços têm as propriedades necessárias
    if (!addr1 || !addr2) return false;

    // Compara CEP e número, se disponíveis
    const sameCep = addr1.zipCode && addr2.zipCode && addr1.zipCode === addr2.zipCode;
    const sameNumber = addr1.number && addr2.number && addr1.number === addr2.number;

    return sameCep && sameNumber;
  }
}

// Exporta a instância única do serviço
export const fraudDetectionService = FraudDetectionService.getInstance();
