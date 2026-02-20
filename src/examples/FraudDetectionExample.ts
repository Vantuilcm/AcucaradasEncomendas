/**
 * Exemplo de integração do FraudDetectionService com OrderService
 * Este arquivo demonstra como utilizar o serviço de detecção de fraudes
 * ao criar novos pedidos no sistema.
 */

import { Order } from '../types/Order';
import { fraudDetectionService, FraudFlag } from '../services/FraudDetectionService';
import { orderService } from '../services/OrderService';
import { userService } from '../services/UserService';
import { loggingService } from '../services/LoggingService';

/**
 * Função que demonstra como integrar a detecção de fraudes ao fluxo de criação de pedidos
 */
export async function createOrderWithFraudDetection(
  order: Order,
  userId: string
): Promise<{
  orderId: string;
  fraudDetected: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  requiresReview: boolean;
}> {
  try {
    // 1. Obter histórico de pedidos do usuário
    const previousOrders = await orderService.getUserOrders(userId, { limit: 20 });

    // 2. Obter valor médio dos pedidos do usuário (opcional)
    // Esta informação poderia vir de um serviço de estatísticas ou ser calculada
    const userStats = await userService.getUserStats(userId);
    const averageOrderValue = userStats?.averageOrderValue;

    // 3. Analisar o pedido em busca de possíveis fraudes
    const fraudAnalysis = fraudDetectionService.analyzeOrder(
      order,
      previousOrders,
      averageOrderValue
    );

    // 4. Registrar resultado da análise para auditoria
    loggingService.info('Análise de fraude realizada', {
      userId,
      orderId: order.id,
      riskScore: fraudAnalysis.riskScore,
      riskLevel: fraudAnalysis.riskLevel,
      flagsRaised: fraudAnalysis.flagsRaised,
    });

    // 5. Decidir se o pedido requer revisão manual
    const requiresReview =
      fraudAnalysis.riskLevel === 'high' ||
      (fraudAnalysis.riskLevel === 'medium' &&
        fraudAnalysis.flagsRaised.includes(FraudFlag.UNUSUAL_PAYMENT));

    // 6. Adicionar informações de fraude ao pedido
    const orderWithFraudInfo: Order = {
      ...order,
      metadata: {
        ...order.metadata,
        fraudAnalysis: {
          riskLevel: fraudAnalysis.riskLevel,
          riskScore: fraudAnalysis.riskScore,
          flagsRaised: fraudAnalysis.flagsRaised,
          requiresReview,
        },
      },
    };

    // 7. Criar o pedido no sistema
    const orderId = await orderService.createOrder(orderWithFraudInfo);

    // 8. Se for de alto risco, notificar equipe de segurança
    if (fraudAnalysis.riskLevel === 'high') {
      // Aqui poderia haver uma chamada para um serviço de notificação
      loggingService.warn('Pedido de alto risco detectado', {
        orderId,
        userId,
        riskScore: fraudAnalysis.riskScore,
        flags: fraudAnalysis.flagsRaised,
        details: fraudAnalysis.details,
      });
    }

    // 9. Retornar resultado
    return {
      orderId,
      fraudDetected: fraudAnalysis.riskLevel !== 'low',
      riskLevel: fraudAnalysis.riskLevel,
      requiresReview,
    };
  } catch (error) {
    loggingService.error('Erro ao processar pedido com detecção de fraude', {
      error,
      userId,
      orderId: order.id,
    });
    throw error;
  }
}

/**
 * Função que demonstra como ajustar a configuração do serviço de detecção de fraudes
 * baseado em métricas de negócio ou sazonalidade
 */
export function adjustFraudDetectionForHolidays(isHolidaySeason: boolean): void {
  if (isHolidaySeason) {
    // Durante períodos de alta demanda (como Natal), ajustar os limiares
    // para reduzir falsos positivos, já que é comum haver pedidos de maior valor
    fraudDetectionService.updateConfig({
      // Aumenta o limite de pedidos múltiplos (é comum fazer vários pedidos em datas festivas)
      multipleOrdersThreshold: 5,
      // Aumenta o percentual para considerar um pedido de alto valor
      highValuePercentage: 300,
      // Reduz o peso do horário atípico (pessoas compram em horários diferentes em feriados)
      unusualTimeWeight: 5,
    });
  } else {
    // Fora de períodos especiais, voltar à configuração padrão
    // que é mais sensível a comportamentos anômalos
    fraudDetectionService.updateConfig({
      multipleOrdersThreshold: 3,
      highValuePercentage: 200,
      unusualTimeWeight: 10,
    });
  }
}
