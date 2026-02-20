import { deliveryRouteService, DeliveryPoint } from '../services/DeliveryRouteService';

import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

/**
 * Simula a otimização de rotas para múltiplos entregadores
 */

/**
 * Função que simula a obtenção de pedidos pendentes para entrega
 * Em um cenário real, isso viria do banco de dados
 */
function getPendingDeliveries(): DeliveryPoint[] {
  // Simulação de pontos de entrega
  return [
    {
      id: 'delivery1',
      address: {
        latitude: -23.5505,
        longitude: -46.6333,
        street: 'Avenida Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      },
      estimatedDeliveryTime: 10,
      priority: 2,
      orderId: 'order1',
    },
    {
      id: 'delivery2',
      address: {
        latitude: -23.5635,
        longitude: -46.6522,
        street: 'Rua Augusta',
        number: '500',
        neighborhood: 'Consolação',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01304-000',
      },
      timeWindow: {
        start: '14:00',
        end: '16:00',
      },
      estimatedDeliveryTime: 15,
      priority: 1, // Alta prioridade
      orderId: 'order2',
    },
    {
      id: 'delivery3',
      address: {
        latitude: -23.5958,
        longitude: -46.6624,
        street: 'Avenida Ibirapuera',
        number: '2000',
        neighborhood: 'Moema',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '04028-000',
      },
      estimatedDeliveryTime: 8,
      priority: 3,
      orderId: 'order3',
    },
    {
      id: 'delivery4',
      address: {
        latitude: -23.5869,
        longitude: -46.6388,
        street: 'Rua Oscar Freire',
        number: '300',
        neighborhood: 'Jardins',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01426-000',
      },
      timeWindow: {
        start: '10:00',
        end: '12:00',
      },
      estimatedDeliveryTime: 12,
      priority: 2,
      orderId: 'order4',
    },
    {
      id: 'delivery5',
      address: {
        latitude: -23.6245,
        longitude: -46.6921,
        street: 'Avenida Santo Amaro',
        number: '1500',
        neighborhood: 'Santo Amaro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '04505-000',
      },
      estimatedDeliveryTime: 10,
      priority: 4, // Baixa prioridade
      orderId: 'order5',
    },
  ];
}

/**
 * Função que simula a obtenção de entregadores disponíveis
 * Em um cenário real, isso viria do banco de dados
 */
function getAvailableDrivers(): string[] {
  return ['driver1', 'driver2'];
}

/**
 * Função que demonstra o uso do serviço de otimização de rotas
 */
export function optimizeDeliveryRoutes() {
  console.log('Iniciando otimização de rotas de entrega...');

  // 1. Obter pedidos pendentes para entrega
  const deliveryPoints = getPendingDeliveries();
  console.log(`Encontrados ${deliveryPoints.length} pontos de entrega pendentes`);

  // 2. Obter entregadores disponíveis
  const availableDrivers = getAvailableDrivers();
  console.log(`Encontrados ${availableDrivers.length} entregadores disponíveis`);

  // 3. Definir o ponto de partida (localização da loja)
  const storeLocation = {
    latitude: -23.5505,
    longitude: -46.6333,
  };

  // 4. Configurar o serviço de otimização para o cenário atual
  // Por exemplo, ajustar para tráfego intenso em horários de pico
  const currentHour = new Date().getHours();
  if ((currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19)) {
    // Horário de pico: aumentar fator de tráfego
    deliveryRouteService.updateConfig({
      trafficFactor: 1.5,
      maxRouteTime: 300, // Aumentar tempo máximo por rota
    });
    console.log('Configuração ajustada para horário de pico');
  } else {
    // Horário normal
    deliveryRouteService.updateConfig({
      trafficFactor: 1.2,
      maxRouteTime: 240,
    });
    logger.info('Configuração ajustada para horário normal');
  }

  // 5. Otimizar as rotas
  const optimizedRoutes = deliveryRouteService.optimizeRoutes(
    deliveryPoints,
    availableDrivers,
    storeLocation
  );

  // 6. Exibir resultados
  logger.info(`Rotas otimizadas: ${optimizedRoutes.length}`);

  optimizedRoutes.forEach((route, index) => {
    logger.info(`\nRota ${index + 1} - Entregador: ${route.driverId}`);
    logger.info(`Distância total: ${route.totalDistance} km`);
    logger.info(`Tempo estimado: ${route.totalTime} minutos`);
    logger.info(`Horário de início: ${route.startTime}`);
    logger.info(`Horário de término estimado: ${route.estimatedEndTime}`);
    logger.info('Sequência de entregas:');

    // Encontrar os pontos de entrega na ordem otimizada
    route.optimizedOrder.forEach((pointId, i) => {
      const point = route.deliveryPoints.find(p => p.id === pointId);
      if (point) {
        logger.info(
          `  ${i + 1}. ${point.address.street}, ${point.address.number} - ${point.address.neighborhood}`
        );
        if (point.timeWindow) {
          logger.info(
            `     Janela de entrega: ${point.timeWindow.start} - ${point.timeWindow.end}`
          );
        }
        logger.info(`     Prioridade: ${point.priority}`);
      }
    });
  });

  return optimizedRoutes;
}

/**
 * Função para salvar as rotas otimizadas
 * Em um cenário real, isso salvaria no banco de dados
 */
export function saveOptimizedRoutes(routes: any[]) {
  console.log(`Salvando ${routes.length} rotas otimizadas...`);
  // Aqui seria implementada a lógica para salvar no banco de dados
  console.log('Rotas salvas com sucesso!');
}

/**
 * Função para notificar entregadores sobre suas rotas
 */
export function notifyDrivers(routes: any[]) {
  console.log('Notificando entregadores sobre suas rotas...');

  routes.forEach(route => {
    console.log(`Enviando notificação para o entregador ${route.driverId}`);
    // Aqui seria implementada a lógica de notificação (push, SMS, etc.)
  });

  console.log('Todos os entregadores foram notificados!');
}

/**
 * Função principal que demonstra o fluxo completo
 */
export function runDeliveryRouteOptimization() {
  try {
    // 1. Otimizar rotas
    const optimizedRoutes = optimizeDeliveryRoutes();

    // 2. Salvar rotas otimizadas
    saveOptimizedRoutes(optimizedRoutes);

    // 3. Notificar entregadores
    notifyDrivers(optimizedRoutes);

    logger.info('\nProcesso de otimização de rotas concluído com sucesso!');
    return {
      success: true,
      routesCount: optimizedRoutes.length,
      totalDeliveries: optimizedRoutes.reduce((sum, route) => sum + route.deliveryPoints.length, 0),
    };
  } catch (error) {
    logger.error('Erro durante o processo de otimização de rotas:', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Exemplo de uso:
// runDeliveryRouteOptimization();
