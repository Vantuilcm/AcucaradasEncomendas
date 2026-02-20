import { loggingService } from './LoggingService';

/**
 * Interface para representar um ponto de entrega
 */
export interface DeliveryPoint {
  id: string;
  address: {
    latitude: number;
    longitude: number;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    complement?: string;
  };
  timeWindow?: {
    start: string; // formato HH:MM
    end: string; // formato HH:MM
  };
  estimatedDeliveryTime: number; // em minutos
  priority: number; // 1 (alta) a 5 (baixa)
  orderId: string;
}

/**
 * Interface para representar uma rota de entrega
 */
export interface DeliveryRoute {
  id: string;
  driverId: string;
  deliveryPoints: DeliveryPoint[];
  optimizedOrder: string[]; // IDs dos pontos na ordem otimizada
  totalDistance: number; // em km
  totalTime: number; // em minutos
  startTime: string; // formato HH:MM
  estimatedEndTime: string; // formato HH:MM
  createdAt: number;
  updatedAt: number;
}

/**
 * Interface para configuração do serviço de otimização de rotas
 */
export interface RouteOptimizationConfig {
  maxPointsPerRoute: number; // Número máximo de pontos por rota
  maxRouteDistance: number; // Distância máxima por rota (km)
  maxRouteTime: number; // Tempo máximo por rota (minutos)
  priorityWeight: number; // Peso da prioridade na otimização
  timeWindowWeight: number; // Peso da janela de tempo na otimização
  distanceWeight: number; // Peso da distância na otimização
  clusteringEnabled: boolean; // Habilitar agrupamento por proximidade
  clusteringRadius: number; // Raio para agrupamento (km)
  trafficFactor: number; // Fator de ajuste para tráfego (1.0 = normal)
  useGreedyAlgorithm: boolean; // Usar algoritmo guloso em vez de exato
}

/**
 * Serviço para otimização de rotas de entrega
 * Implementa algoritmos baseados no Problema do Caixeiro Viajante
 */
export class DeliveryRouteService {
  private static instance: DeliveryRouteService;
  private config: RouteOptimizationConfig;

  /**
   * Configuração padrão para otimização de rotas
   */
  private readonly DEFAULT_CONFIG: RouteOptimizationConfig = {
    maxPointsPerRoute: 15,
    maxRouteDistance: 30,
    maxRouteTime: 240,
    priorityWeight: 3,
    timeWindowWeight: 4,
    distanceWeight: 5,
    clusteringEnabled: true,
    clusteringRadius: 3,
    trafficFactor: 1.2,
    useGreedyAlgorithm: true,
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
  public static getInstance(): DeliveryRouteService {
    if (!DeliveryRouteService.instance) {
      DeliveryRouteService.instance = new DeliveryRouteService();
    }
    return DeliveryRouteService.instance;
  }

  /**
   * Atualiza a configuração do serviço
   * @param newConfig Nova configuração parcial ou completa
   */
  public updateConfig(newConfig: Partial<RouteOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtém a configuração atual
   */
  public getConfig(): RouteOptimizationConfig {
    return { ...this.config };
  }

  /**
   * Otimiza rotas para um conjunto de pontos de entrega
   * @param deliveryPoints Lista de pontos de entrega a serem otimizados
   * @param drivers Lista de IDs dos entregadores disponíveis
   * @param startingPoint Ponto de partida (geralmente o estabelecimento)
   * @returns Lista de rotas otimizadas
   */
  public optimizeRoutes(
    deliveryPoints: DeliveryPoint[],
    drivers: string[],
    startingPoint: { latitude: number; longitude: number }
  ): DeliveryRoute[] {
    try {
      // Se não houver pontos ou motoristas, retorna lista vazia
      if (!deliveryPoints.length || !drivers.length) {
        return [];
      }

      // 1. Agrupar pontos por proximidade (clustering)
      const clusters = this.config.clusteringEnabled
        ? this.clusterDeliveryPoints(deliveryPoints)
        : [deliveryPoints];

      // 2. Para cada cluster, criar uma rota otimizada
      const routes: DeliveryRoute[] = [];
      let driverIndex = 0;

      for (const cluster of clusters) {
        // Se o cluster for muito grande, dividir em sub-rotas
        const subClusters = this.splitLargeCluster(cluster);

        for (const subCluster of subClusters) {
          // Obter o próximo motorista disponível (round-robin)
          const driverId = drivers[driverIndex % drivers.length];
          driverIndex++;

          // Otimizar a ordem dos pontos para esta rota
          const optimizedRoute = this.optimizeRouteOrder(subCluster, startingPoint);

          // Calcular distância e tempo total
          const { totalDistance, totalTime } = this.calculateRouteMetrics(
            optimizedRoute,
            startingPoint
          );

          // Calcular horários estimados
          const startTime = this.formatTime(new Date());
          const endTimeDate = new Date();
          endTimeDate.setMinutes(endTimeDate.getMinutes() + totalTime);
          const estimatedEndTime = this.formatTime(endTimeDate);

          // Criar objeto de rota
          const route: DeliveryRoute = {
            id: this.generateId(),
            driverId,
            deliveryPoints: subCluster,
            optimizedOrder: optimizedRoute.map(point => point.id),
            totalDistance,
            totalTime,
            startTime,
            estimatedEndTime,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          routes.push(route);
        }
      }

      return routes;
    } catch (error) {
      loggingService.error('Erro ao otimizar rotas de entrega', { error });
      return [];
    }
  }

  /**
   * Agrupa pontos de entrega por proximidade geográfica
   * Implementa um algoritmo de clustering baseado em distância
   */
  private clusterDeliveryPoints(points: DeliveryPoint[]): DeliveryPoint[][] {
    // Se houver poucos pontos, não é necessário agrupar
    if (points.length <= this.config.maxPointsPerRoute) {
      return [points];
    }

    const clusters: DeliveryPoint[][] = [];
    const unassignedPoints = [...points];

    // Enquanto houver pontos não atribuídos
    while (unassignedPoints.length > 0) {
      // Escolhe um ponto como centro do cluster (prioriza pontos com maior prioridade)
      const sortedByPriority = [...unassignedPoints].sort((a, b) => a.priority - b.priority);
      const centerPoint = sortedByPriority[0];

      // Remove o ponto central da lista de não atribuídos
      const centerIndex = unassignedPoints.findIndex(p => p.id === centerPoint.id);
      unassignedPoints.splice(centerIndex, 1);

      // Cria um novo cluster com o ponto central
      const cluster: DeliveryPoint[] = [centerPoint];

      // Encontra pontos próximos dentro do raio de clustering
      const nearbyPoints: DeliveryPoint[] = [];

      for (let i = 0; i < unassignedPoints.length; i++) {
        const point = unassignedPoints[i];
        const distance = this.calculateDistance(
          centerPoint.address.latitude,
          centerPoint.address.longitude,
          point.address.latitude,
          point.address.longitude
        );

        if (distance <= this.config.clusteringRadius) {
          nearbyPoints.push(point);
        }
      }

      // Ordena pontos próximos por prioridade
      nearbyPoints.sort((a, b) => a.priority - b.priority);

      // Adiciona pontos ao cluster até atingir o limite
      for (const point of nearbyPoints) {
        if (cluster.length < this.config.maxPointsPerRoute) {
          cluster.push(point);
          // Remove o ponto da lista de não atribuídos
          const index = unassignedPoints.findIndex(p => p.id === point.id);
          if (index !== -1) {
            unassignedPoints.splice(index, 1);
          }
        } else {
          break;
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Divide um cluster grande em sub-clusters menores
   */
  private splitLargeCluster(cluster: DeliveryPoint[]): DeliveryPoint[][] {
    if (cluster.length <= this.config.maxPointsPerRoute) {
      return [cluster];
    }

    const result: DeliveryPoint[][] = [];
    let currentCluster: DeliveryPoint[] = [];

    // Ordena por prioridade primeiro
    const sortedPoints = [...cluster].sort((a, b) => a.priority - b.priority);

    for (const point of sortedPoints) {
      currentCluster.push(point);

      if (currentCluster.length >= this.config.maxPointsPerRoute) {
        result.push(currentCluster);
        currentCluster = [];
      }
    }

    // Adiciona o último cluster se não estiver vazio
    if (currentCluster.length > 0) {
      result.push(currentCluster);
    }

    return result;
  }

  /**
   * Otimiza a ordem dos pontos em uma rota
   * Implementa uma variante do algoritmo do Caixeiro Viajante
   */
  private optimizeRouteOrder(
    points: DeliveryPoint[],
    startingPoint: { latitude: number; longitude: number }
  ): DeliveryPoint[] {
    if (points.length <= 1) {
      return [...points];
    }

    // Se configurado para usar algoritmo guloso (mais rápido, menos preciso)
    if (this.config.useGreedyAlgorithm) {
      return this.greedyNearestNeighbor(points, startingPoint);
    }

    // Caso contrário, usa algoritmo mais preciso (para poucos pontos)
    return this.exactTSP(points, startingPoint);
  }

  /**
   * Implementa o algoritmo guloso do vizinho mais próximo
   * Complexidade: O(n²)
   */
  private greedyNearestNeighbor(
    points: DeliveryPoint[],
    startingPoint: { latitude: number; longitude: number }
  ): DeliveryPoint[] {
    const result: DeliveryPoint[] = [];
    const unvisited = [...points];

    // Ponto atual começa como o ponto de partida
    let currentLat = startingPoint.latitude;
    let currentLng = startingPoint.longitude;

    // Enquanto houver pontos não visitados
    while (unvisited.length > 0) {
      // Encontra o ponto mais próximo considerando distância e outros fatores
      let bestIndex = -1;
      let bestScore = Number.MAX_VALUE;

      for (let i = 0; i < unvisited.length; i++) {
        const point = unvisited[i];

        // Calcula distância
        const distance = this.calculateDistance(
          currentLat,
          currentLng,
          point.address.latitude,
          point.address.longitude
        );

        // Calcula penalidade por janela de tempo (se aplicável)
        let timeWindowPenalty = 0;
        if (point.timeWindow) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTimeMinutes = currentHour * 60 + currentMinute;

          const [startHour, startMinute] = point.timeWindow.start.split(':').map(Number);
          const startTimeMinutes = startHour * 60 + startMinute;

          const [endHour, endMinute] = point.timeWindow.end.split(':').map(Number);
          const endTimeMinutes = endHour * 60 + endMinute;

          // Se estiver fora da janela de tempo, adiciona penalidade
          if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
            timeWindowPenalty = 1000; // Penalidade alta para evitar violar janelas de tempo
          }
        }

        // Calcula score combinado (menor é melhor)
        const score =
          distance * this.config.distanceWeight +
          point.priority * this.config.priorityWeight +
          timeWindowPenalty * this.config.timeWindowWeight;

        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      // Adiciona o melhor ponto ao resultado
      const bestPoint = unvisited[bestIndex];
      result.push(bestPoint);
      unvisited.splice(bestIndex, 1);

      // Atualiza posição atual
      currentLat = bestPoint.address.latitude;
      currentLng = bestPoint.address.longitude;
    }

    return result;
  }

  /**
   * Implementa um algoritmo exato para o TSP usando força bruta
   * Só é viável para poucos pontos (até ~10)
   * Complexidade: O(n!)
   */
  private exactTSP(
    points: DeliveryPoint[],
    startingPoint: { latitude: number; longitude: number }
  ): DeliveryPoint[] {
    // Se houver muitos pontos, reverte para o algoritmo guloso
    if (points.length > 10) {
      return this.greedyNearestNeighbor(points, startingPoint);
    }

    // Gera todas as permutações possíveis
    const permutations = this.generatePermutations(points);
    let bestPermutation: DeliveryPoint[] = [];
    let bestDistance = Number.MAX_VALUE;

    // Avalia cada permutação
    for (const permutation of permutations) {
      let totalDistance = 0;

      // Distância do ponto inicial ao primeiro ponto
      totalDistance += this.calculateDistance(
        startingPoint.latitude,
        startingPoint.longitude,
        permutation[0].address.latitude,
        permutation[0].address.longitude
      );

      // Distância entre pontos consecutivos
      for (let i = 0; i < permutation.length - 1; i++) {
        totalDistance += this.calculateDistance(
          permutation[i].address.latitude,
          permutation[i].address.longitude,
          permutation[i + 1].address.latitude,
          permutation[i + 1].address.longitude
        );
      }

      // Atualiza melhor permutação se necessário
      if (totalDistance < bestDistance) {
        bestDistance = totalDistance;
        bestPermutation = [...permutation];
      }
    }

    return bestPermutation;
  }

  /**
   * Gera todas as permutações possíveis de um array
   * Atenção: cresce fatorialmente, só usar para arrays pequenos
   */
  private generatePermutations<T>(items: T[]): T[][] {
    if (items.length <= 1) {
      return [items];
    }

    const result: T[][] = [];

    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      const remaining = [...items.slice(0, i), ...items.slice(i + 1)];
      const remainingPermutations = this.generatePermutations(remaining);

      for (const permutation of remainingPermutations) {
        result.push([current, ...permutation]);
      }
    }

    return result;
  }

  /**
   * Calcula métricas totais de uma rota (distância e tempo)
   */
  private calculateRouteMetrics(
    orderedPoints: DeliveryPoint[],
    startingPoint: { latitude: number; longitude: number }
  ): { totalDistance: number; totalTime: number } {
    let totalDistance = 0;
    let totalTime = 0;

    // Se não houver pontos, retorna zeros
    if (orderedPoints.length === 0) {
      return { totalDistance: 0, totalTime: 0 };
    }

    // Distância do ponto inicial ao primeiro ponto
    totalDistance += this.calculateDistance(
      startingPoint.latitude,
      startingPoint.longitude,
      orderedPoints[0].address.latitude,
      orderedPoints[0].address.longitude
    );

    // Tempo estimado para chegar ao primeiro ponto (assumindo 30 km/h em média)
    totalTime += (totalDistance / 30) * 60;

    // Distância e tempo entre pontos consecutivos
    for (let i = 0; i < orderedPoints.length - 1; i++) {
      const distance = this.calculateDistance(
        orderedPoints[i].address.latitude,
        orderedPoints[i].address.longitude,
        orderedPoints[i + 1].address.latitude,
        orderedPoints[i + 1].address.longitude
      );

      totalDistance += distance;

      // Tempo de deslocamento entre pontos
      const travelTime = (distance / 30) * 60; // 30 km/h em média, convertido para minutos

      // Tempo de entrega no ponto
      const deliveryTime = orderedPoints[i].estimatedDeliveryTime;

      totalTime += travelTime * this.config.trafficFactor + deliveryTime;
    }

    // Adiciona o tempo de entrega do último ponto
    if (orderedPoints.length > 0) {
      totalTime += orderedPoints[orderedPoints.length - 1].estimatedDeliveryTime;
    }

    return {
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      totalTime: Math.ceil(totalTime),
    };
  }

  /**
   * Calcula a distância entre dois pontos usando a fórmula de Haversine
   * @returns Distância em quilômetros
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distância em km

    return parseFloat(distance.toFixed(2));
  }

  /**
   * Converte graus para radianos
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Formata uma data como string de hora (HH:MM)
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Gera um ID único
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

// Exporta a instância única do serviço
export const deliveryRouteService = DeliveryRouteService.getInstance();
