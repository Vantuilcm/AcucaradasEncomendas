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
 * Interface para configuraÃ§Ã£o do serviÃ§o de detecÃ§Ã£o de fraudes
 */
export interface FraudDetectionConfig {
  // Limites para mÃºltiplos pedidos
  multipleOrdersThreshold: number; // NÃºmero de pedidos em 24h que gera alerta
  multipleOrdersWeight: number; // Peso deste fator na pontuaÃ§Ã£o final

  // Limites para endereÃ§o incomum
  unusualAddressWeight: number; // Peso deste fator na pontuaÃ§Ã£o final

  // Limites para valor alto
  highValuePercentage: number; // Percentual acima da mÃ©dia que gera alerta
  highValueWeight: number; // Peso deste fator na pontuaÃ§Ã£o final

  // Limites para horÃ¡rio incomum
  unusualTimeWeight: number; // Peso deste fator na pontuaÃ§Ã£o final

  // Limites para mÃ©todo de pagamento incomum
  unusualPaymentWeight: number; // Peso deste fator na pontuaÃ§Ã£o final

  // Limites para mudanÃ§a rÃ¡pida de endereÃ§o
  addressChangeHours: number; // PerÃ­odo em horas para considerar mudanÃ§a rÃ¡pida
  addressChangeWeight: number; // Peso deste fator na pontuaÃ§Ã£o final

  // Limites de pontuaÃ§Ã£o para classificaÃ§Ã£o de risco
  mediumRiskThreshold: number; // PontuaÃ§Ã£o mÃ­nima para risco mÃ©dio
  highRiskThreshold: number; // PontuaÃ§Ã£o mÃ­nima para risco alto
}

/**
 * Interface para resultado da anÃ¡lise de fraude
 */
export interface FraudAnalysisResult {
  riskScore: number; // PontuaÃ§Ã£o de risco (0-100)
  riskLevel: 'low' | 'medium' | 'high'; // NÃ­vel de risco
  flagsRaised: FraudFlag[]; // Flags de fraude levantadas
  details: Record<
    FraudFlag,
    {
      // Detalhes de cada flag
      raised: boolean; // Se a flag foi levantada
      score: number; // PontuaÃ§Ã£o atribuÃ­da
      reason: string; // RazÃ£o da pontuaÃ§Ã£o
    }
  >;
  timestamp: number; // Timestamp da anÃ¡lise
}

/**
 * ServiÃ§o para detecÃ§Ã£o de fraudes em pedidos
 * Implementa um sistema de pontuaÃ§Ã£o de risco baseado em mÃºltiplos fatores
 */
export class FraudDetectionService {
  private static instance: FraudDetectionService;
  private config: FraudDetectionConfig;

  /**
   * ConfiguraÃ§Ã£o padrÃ£o para detecÃ§Ã£o de fraudes
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
   * ObtÃ©m a instÃ¢ncia Ãºnica do serviÃ§o
   */
  public static getInstance(): FraudDetectionService {
    if (!FraudDetectionService.instance) {
      FraudDetectionService.instance = new FraudDetectionService();
    }
    return FraudDetectionService.instance;
  }

  /**
   * Atualiza a configuraÃ§Ã£o do serviÃ§o
   * @param newConfig Nova configuraÃ§Ã£o parcial ou completa
   */
  public updateConfig(newConfig: Partial<FraudDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * ObtÃ©m a configuraÃ§Ã£o atual
   */
  public getConfig(): FraudDetectionConfig {
    return { ...this.config };
  }

  /**
   * Analisa um pedido para detectar possÃ­veis fraudes
   * @param order Pedido atual a ser analisado
   * @param previousOrders HistÃ³rico de pedidos do usuÃ¡rio
   * @param userAverageOrderValue Valor mÃ©dio dos pedidos do usuÃ¡rio (opcional)
   * @returns Resultado da anÃ¡lise de fraude
   */
  public analyzeOrder(
    order: Order,
    previousOrders: Order[],
    userAverageOrderValue?: number
  ): FraudAnalysisResult {
    try {
      // Inicializa o resultado da anÃ¡lise
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

      // Verifica mÃºltiplos pedidos em curto perÃ­odo
      this.checkMultipleOrders(order, previousOrders, result);

      // Verifica endereÃ§o incomum
      this.checkUnusualAddress(order, previousOrders, result);

      // Verifica valor alto
      this.checkHighValue(order, userAverageOrderValue, previousOrders, result);

      // Verifica horÃ¡rio atÃ­pico
      this.checkUnusualTime(order, previousOrders, result);

      // Verifica mÃ©todo de pagamento incomum
      this.checkUnusualPaymentMethod(order, previousOrders, result);

      // Verifica mudanÃ§a rÃ¡pida de endereÃ§o
      this.checkRapidAddressChange(order, previousOrders, result);

      // Calcula pontuaÃ§Ã£o total e nÃ­vel de risco
      this.calculateRiskLevel(result);

      return result;
    } catch (error) {
      loggingService.error('Erro ao analisar pedido para fraude', { orderId: order.id, error });
      // Em caso de erro, retorna risco baixo para nÃ£o bloquear pedidos legÃ­timos
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
   * Verifica se hÃ¡ mÃºltiplos pedidos em um curto perÃ­odo
   */
  private checkMultipleOrders(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Considera pedidos nas Ãºltimas 24 horas
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentOrders = previousOrders.filter(o => new Date(o.createdAt).getTime() > last24Hours);

    // Se o nÃºmero de pedidos recentes exceder o limite, levanta a flag
    if (recentOrders.length >= this.config.multipleOrdersThreshold) {
      const score = this.config.multipleOrdersWeight;
      result.details[FraudFlag.MULTIPLE_ORDERS] = {
        raised: true,
        score,
        reason: `${recentOrders.length} pedidos nas Ãºltimas 24 horas (limite: ${this.config.multipleOrdersThreshold})`,
      };
      result.flagsRaised.push(FraudFlag.MULTIPLE_ORDERS);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se o endereÃ§o de entrega Ã© incomum para o usuÃ¡rio
   */
  private checkUnusualAddress(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Se nÃ£o houver pedidos anteriores ou endereÃ§o de entrega, pula a verificaÃ§Ã£o
    if (previousOrders.length === 0 || !order.deliveryAddress) return;

    // Extrai endereÃ§os anteriores
    const previousAddresses = previousOrders
      .filter(o => o.deliveryAddress)
      .map(o => o.deliveryAddress);

    // Verifica se o endereÃ§o atual jÃ¡ foi usado antes
    const addressUsedBefore = previousAddresses.some(addr =>
      this.isSameAddress(addr, order.deliveryAddress!)
    );

    // Se o endereÃ§o nunca foi usado antes, levanta a flag
    if (!addressUsedBefore) {
      const score = this.config.unusualAddressWeight;
      result.details[FraudFlag.UNUSUAL_ADDRESS] = {
        raised: true,
        score,
        reason: 'EndereÃ§o de entrega nunca usado anteriormente',
      };
      result.flagsRaised.push(FraudFlag.UNUSUAL_ADDRESS);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se o valor do pedido Ã© muito superior Ã  mÃ©dia do usuÃ¡rio
   */
  private checkHighValue(
    order: Order,
    userAverageOrderValue: number | undefined,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Calcula o valor total do pedido atual
    const currentOrderValue = this.calculateOrderValue(order);

    // Se nÃ£o foi fornecido valor mÃ©dio, calcula com base no histÃ³rico
    let averageValue = userAverageOrderValue;
    if (averageValue === undefined && previousOrders.length > 0) {
      const totalValue = previousOrders.reduce((sum, o) => sum + this.calculateOrderValue(o), 0);
      averageValue = totalValue / previousOrders.length;
    }

    // Se nÃ£o hÃ¡ mÃ©dia para comparar, pula a verificaÃ§Ã£o
    if (averageValue === undefined || averageValue === 0) return;

    // Calcula a porcentagem acima da mÃ©dia
    const percentageAboveAverage = ((currentOrderValue - averageValue) / averageValue) * 100;

    // Se o valor for muito acima da mÃ©dia, levanta a flag
    if (percentageAboveAverage > this.config.highValuePercentage) {
      const score = this.config.highValueWeight;
      result.details[FraudFlag.HIGH_VALUE] = {
        raised: true,
        score,
        reason: `Valor ${percentageAboveAverage.toFixed(0)}% acima da mÃ©dia do usuÃ¡rio`,
      };
      result.flagsRaised.push(FraudFlag.HIGH_VALUE);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se o horÃ¡rio do pedido Ã© atÃ­pico para o usuÃ¡rio
   */
  private checkUnusualTime(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Se nÃ£o houver pedidos anteriores suficientes, pula a verificaÃ§Ã£o
    if (previousOrders.length < 3) return;

    // Extrai a hora do dia do pedido atual
    const orderHour = new Date(order.createdAt).getHours();

    // Extrai as horas dos pedidos anteriores
    const previousHours = previousOrders.map(o => new Date(o.createdAt).getHours());

    // Verifica se a hora atual estÃ¡ dentro do padrÃ£o do usuÃ¡rio
    // Considera um intervalo de Â±2 horas
    const isWithinPattern = previousHours.some(
      hour => Math.abs(hour - orderHour) <= 2 || Math.abs(hour - orderHour) >= 22 // Para lidar com casos como 23h vs 1h
    );

    // Se o horÃ¡rio for atÃ­pico, levanta a flag
    if (!isWithinPattern) {
      const score = this.config.unusualTimeWeight;
      result.details[FraudFlag.UNUSUAL_TIME] = {
        raised: true,
        score,
        reason: `Pedido realizado em horÃ¡rio atÃ­pico (${orderHour}h)`,
      };
      result.flagsRaised.push(FraudFlag.UNUSUAL_TIME);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se o mÃ©todo de pagamento Ã© incomum para o usuÃ¡rio
   */
  private checkUnusualPaymentMethod(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Se nÃ£o houver pedidos anteriores ou informaÃ§Ã£o de pagamento, pula a verificaÃ§Ã£o
    if (previousOrders.length === 0 || !order.paymentMethod) return;

    // Extrai mÃ©todos de pagamento anteriores
    const previousMethods = previousOrders.filter(o => o.paymentMethod).map(o => o.paymentMethod);

    // Verifica se o mÃ©todo atual jÃ¡ foi usado antes
    const methodUsedBefore = previousMethods.includes(order.paymentMethod);

    // Se o mÃ©todo nunca foi usado antes, levanta a flag
    if (!methodUsedBefore) {
      const score = this.config.unusualPaymentWeight;
      result.details[FraudFlag.UNUSUAL_PAYMENT] = {
        raised: true,
        score,
        reason: `MÃ©todo de pagamento '${order.paymentMethod}' nunca usado anteriormente`,
      };
      result.flagsRaised.push(FraudFlag.UNUSUAL_PAYMENT);
      result.riskScore += score;
    }
  }

  /**
   * Verifica se houve mudanÃ§a rÃ¡pida de endereÃ§o
   */
  private checkRapidAddressChange(
    order: Order,
    previousOrders: Order[],
    result: FraudAnalysisResult
  ): void {
    // Se nÃ£o houver pedidos anteriores ou endereÃ§o de entrega, pula a verificaÃ§Ã£o
    if (previousOrders.length === 0 || !order.deliveryAddress) return;

    // Ordena pedidos por data (mais recente primeiro)
    const sortedOrders = [...previousOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Pega o pedido mais recente com endereÃ§o
    const lastOrder = sortedOrders.find(o => o.deliveryAddress);
    if (!lastOrder || !lastOrder.deliveryAddress) return;

    // Verifica se o endereÃ§o Ã© diferente do Ãºltimo pedido
    const addressChanged = !this.isSameAddress(lastOrder.deliveryAddress, order.deliveryAddress);

    // Verifica se o pedido anterior foi feito dentro do perÃ­odo de configuraÃ§Ã£o
    const hoursSinceLastOrder =
      (new Date(order.createdAt).getTime() - new Date(lastOrder.createdAt).getTime()) /
      (1000 * 60 * 60);

    // Se houve mudanÃ§a rÃ¡pida de endereÃ§o, levanta a flag
    if (addressChanged && hoursSinceLastOrder < this.config.addressChangeHours) {
      const score = this.config.addressChangeWeight;
      result.details[FraudFlag.RAPID_ADDRESS_CHANGE] = {
        raised: true,
        score,
        reason: `MudanÃ§a de endereÃ§o apÃ³s ${hoursSinceLastOrder.toFixed(1)} horas do Ãºltimo pedido`,
      };
      result.flagsRaised.push(FraudFlag.RAPID_ADDRESS_CHANGE);
      result.riskScore += score;
    }
  }

  /**
   * Calcula o nÃ­vel de risco com base na pontuaÃ§Ã£o total
   */
  private calculateRiskLevel(result: FraudAnalysisResult): void {
    // Limita a pontuaÃ§Ã£o mÃ¡xima a 100
    result.riskScore = Math.min(result.riskScore, 100);

    // Define o nÃ­vel de risco com base nos limiares configurados
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
        const itemTotal = (item.unitPrice || 0) * (item.quantity || 1);
        // Adiciona o valor das opÃ§Ãµes, se houver
        return sum + itemTotal ;
      }, 0);
    }

    return total;
  }

  /**
   * Verifica se dois endereÃ§os sÃ£o considerados iguais
   * SimplificaÃ§Ã£o: compara apenas CEP e nÃºmero
   */
  private isSameAddress(addr1: any, addr2: any): boolean {
    // Verifica se ambos os endereÃ§os tÃªm as propriedades necessÃ¡rias
    if (!addr1 || !addr2) return false;

    // Compara CEP e nÃºmero, se disponÃ­veis
    const sameCep = addr1.zipCode && addr2.zipCode && addr1.zipCode === addr2.zipCode;
    const sameNumber = addr1.number && addr2.number && addr1.number === addr2.number;

    return sameCep && sameNumber;
  }
}

// Exporta a instÃ¢ncia Ãºnica do serviÃ§o
export const fraudDetectionService = FraudDetectionService.getInstance();



