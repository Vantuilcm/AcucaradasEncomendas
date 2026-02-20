/**
 * Sistema de monitoramento para o mÃ³dulo de busca avanÃ§ada
 * Implementa mÃ©tricas, alertas e diagnÃ³sticos para garantir
 * a performance e estabilidade do sistema de busca
 */

import { loggingService } from '../services/LoggingService';

// Interface para WebSocket de monitoramento em tempo real
// Estende as funcionalidades bÃ¡sicas necessÃ¡rias do WebSocket
interface MonitoringWebSocket {
  readonly readyState: number;
  send(data: string): void;
  close?(code?: number, reason?: string): void;
  addEventListener?(type: string, listener: EventListener): void;
  removeEventListener?(type: string, listener: EventListener): void;
}

// Constantes para estados do WebSocket (compatibilidade)
const WEBSOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

// Interface para dados do dashboard em tempo real
interface RealTimeDashboardData {
  metrics: Record<MetricType, any>;
  alerts: AlertData[];
  systemHealth: SystemHealthStatus;
  timestamp: number;
}

// Interface para dados de alerta
interface AlertData {
  id: string;
  metric: MetricType;
  level: AlertLevel;
  value: number;
  threshold: number;
  timestamp: number;
  message: string;
  acknowledged: boolean;
}

// Status de saÃºde do sistema
interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  components: Record<string, 'healthy' | 'warning' | 'critical'>;
  uptime: number;
  lastCheck: number;
}

// Interface para configuraÃ§Ã£o de notificaÃ§Ãµes
interface NotificationConfig {
  email?: string[];
  webhook?: string;
  sms?: string[];
  enabled: boolean;
}

// Interface para mÃ©tricas avanÃ§adas
interface AdvancedMetrics {
  searchTrends: SearchTrendData[];
  userBehavior: UserBehaviorMetrics;
  performanceBaseline: PerformanceBaseline;
  anomalies: AnomalyDetection[];
}

interface SearchTrendData {
  query: string;
  frequency: number;
  avgLatency: number;
  successRate: number;
  timestamp: number;
}

interface UserBehaviorMetrics {
  avgSessionDuration: number;
  searchesPerSession: number;
  abandonmentRate: number;
  refinementRate: number;
}

interface PerformanceBaseline {
  avgSearchLatency: number;
  avgSuggestionLatency: number;
  avgCacheHitRate: number;
  avgMemoryUsage: number;
  lastUpdated: number;
}

interface AnomalyDetection {
  metric: MetricType;
  value: number;
  expectedRange: [number, number];
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  description: string;
}

// Tipos de mÃ©tricas monitoradas
export enum MetricType {
  SEARCH_LATENCY = 'search_latency',
  SUGGESTION_LATENCY = 'suggestion_latency',
  CACHE_HIT_RATE = 'cache_hit_rate',
  ZERO_RESULTS = 'zero_results',
  ERROR_RATE = 'error_rate',
  MEMORY_USAGE = 'memory_usage',
  LEVENSHTEIN_CALLS = 'levenshtein_calls',
  FILTER_LATENCY = 'filter_latency',
}

// NÃ­veis de alerta
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// Interface para configuraÃ§Ã£o de alertas
interface AlertThreshold {
  metric: MetricType;
  warning: number;
  critical: number;
  duration: number; // Em milissegundos
  cooldown: number; // PerÃ­odo mÃ­nimo entre alertas repetidos (ms)
}

// Interface para dados de mÃ©tricas
interface MetricData {
  value: number;
  timestamp: number;
  context?: Record<string, any>;
}

/**
 * Classe responsÃ¡vel pelo monitoramento do sistema de busca
 */
export class SearchMonitoring {
  private static instance: SearchMonitoring;
  private metrics: Map<MetricType, MetricData[]> = new Map();
  private alertThresholds: AlertThreshold[] = [];
  private lastAlerts: Map<MetricType, number> = new Map();
  private readonly maxDataPoints = 1000; // MÃ¡ximo de pontos por mÃ©trica
  private readonly defaultRetentionPeriod = 24 * 60 * 60 * 1000; // 24 horas em ms

  // Propriedades para monitoramento em tempo real
  private webSocketConnections: Set<MonitoringWebSocket> = new Set();
  private realTimeUpdateInterval: ReturnType<typeof setTimeout> | null = null;
  private cleanupInterval: ReturnType<typeof setTimeout> | null = null;
  private anomalyDetectionInterval: ReturnType<typeof setTimeout> | null = null;
  private alertHistory: AlertData[] = [];
  private systemStartTime: number = Date.now();
  private notificationConfig: NotificationConfig = { enabled: false };
  private advancedMetrics: AdvancedMetrics = {
    searchTrends: [],
    userBehavior: {
      avgSessionDuration: 0,
      searchesPerSession: 0,
      abandonmentRate: 0,
      refinementRate: 0,
    },
    performanceBaseline: {
      avgSearchLatency: 0,
      avgSuggestionLatency: 0,
      avgCacheHitRate: 0,
      avgMemoryUsage: 0,
      lastUpdated: Date.now(),
    },
    anomalies: [],
  };
  private performanceBaseline: Map<MetricType, number> = new Map();
  private anomalyDetectionEnabled: boolean = true;
  private readonly anomalyThreshold = 2; // Desvios padrÃ£o para detectar anomalias

  private constructor() {
    const isTestEnv =
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
    // Inicializar mÃ©tricas
    Object.values(MetricType).forEach(metric => {
      this.metrics.set(metric as MetricType, []);
    });

    // Configurar alertas padrÃ£o
    this.setupDefaultAlerts();

    // Inicializar baseline de performance
    this.initializePerformanceBaseline();

    if (!isTestEnv) {
      this.cleanupInterval = setInterval(() => this.cleanupOldData(), 60 * 60 * 1000);
      this.startRealTimeMonitoring();
      this.anomalyDetectionInterval = setInterval(() => this.detectAnomalies(), 5 * 60 * 1000);
    }
  }

  /**
   * ObtÃ©m a instÃ¢ncia Ãºnica do monitor (Singleton)
   */
  public static getInstance(): SearchMonitoring {
    if (!SearchMonitoring.instance) {
      SearchMonitoring.instance = new SearchMonitoring();
    }
    return SearchMonitoring.instance;
  }

  /**
   * Configura os alertas padrÃ£o do sistema
   */
  private setupDefaultAlerts(): void {
    this.alertThresholds = [
      {
        metric: MetricType.SEARCH_LATENCY,
        warning: 500, // ms
        critical: 1000, // ms
        duration: 60000, // Alertar se persistir por 1 minuto
        cooldown: 300000, // 5 minutos entre alertas
      },
      {
        metric: MetricType.ERROR_RATE,
        warning: 0.05, // 5% de taxa de erro
        critical: 0.1, // 10% de taxa de erro
        duration: 300000, // 5 minutos
        cooldown: 900000, // 15 minutos entre alertas
      },
      {
        metric: MetricType.ZERO_RESULTS,
        warning: 0.3, // 30% de buscas sem resultados
        critical: 0.5, // 50% de buscas sem resultados
        duration: 300000, // 5 minutos
        cooldown: 1800000, // 30 minutos entre alertas
      },
      {
        metric: MetricType.MEMORY_USAGE,
        warning: 80, // 80% do limite de memÃ³ria
        critical: 90, // 90% do limite de memÃ³ria
        duration: 120000, // 2 minutos
        cooldown: 600000, // 10 minutos entre alertas
      },
    ];
  }

  /**
   * Registra uma mÃ©trica no sistema de monitoramento
   * @param metric Tipo da mÃ©trica
   * @param value Valor da mÃ©trica
   * @param context Contexto adicional (opcional)
   */
  public recordMetric(metric: MetricType, value: number, context?: Record<string, any>): void {
    const metricData: MetricData = {
      value,
      timestamp: Date.now(),
      context,
    };

    const currentData = this.metrics.get(metric) || [];
    currentData.push(metricData);

    // Limitar o nÃºmero de pontos de dados armazenados
    if (currentData.length > this.maxDataPoints) {
      currentData.shift(); // Remove o ponto mais antigo
    }

    this.metrics.set(metric, currentData);

    // Verificar alertas
    this.checkAlerts(metric);
  }

  /**
   * Registra o tempo de execuÃ§Ã£o de uma operaÃ§Ã£o
   * @param metric Tipo da mÃ©trica de latÃªncia
   * @param callback FunÃ§Ã£o a ser executada e medida
   * @param context Contexto adicional
   * @returns O resultado da funÃ§Ã£o callback
   */
  public async measureExecutionTime<T>(
    metric: MetricType,
    callback: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await callback();
      const duration = performance.now() - startTime;
      this.recordMetric(metric, duration, context);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errMsg = error instanceof Error ? error.message : String(error);
      this.recordMetric(metric, duration, { ...context, error: errMsg });
      this.recordMetric(MetricType.ERROR_RATE, 1, { ...context, error: errMsg });
      throw error;
    }
  }

  /**
   * Registra uma busca sem resultados
   * @param query Consulta de busca
   * @param filters Filtros aplicados
   */
  public recordZeroResults(query: string, filters?: Record<string, any>): void {
    this.recordMetric(MetricType.ZERO_RESULTS, 1, { query, filters });

    // Log para anÃ¡lise posterior
    loggingService.info('Busca sem resultados', {
      query,
      filters,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Registra o uso de memÃ³ria do sistema de busca
   * @param component Componente especÃ­fico (opcional)
   */
  public recordMemoryUsage(component?: string): void {
    try {
      // Verificar se estamos no Node.js
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memoryUsage = process.memoryUsage();
        const usagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        this.recordMetric(MetricType.MEMORY_USAGE, usagePercentage, { component });
      }
      // Verificar se estamos no navegador com suporte a performance.memory
      else if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        const usedHeapSize = memoryInfo.usedJSHeapSize;
        const totalHeapSize = memoryInfo.jsHeapSizeLimit;
        const usagePercentage = (usedHeapSize / totalHeapSize) * 100;

        this.recordMetric(MetricType.MEMORY_USAGE, usagePercentage, { component });
      }
      // Fallback: registrar valor padrÃ£o se nÃ£o conseguir obter dados reais
      else {
        loggingService.warn(
          'NÃ£o foi possÃ­vel obter informaÃ§Ãµes de memÃ³ria - usando valor estimado'
        );
        this.recordMetric(MetricType.MEMORY_USAGE, 50, { component }); // Valor padrÃ£o estimado
      }
    } catch (error) {
      loggingService.error('Erro ao registrar uso de memÃ³ria', error instanceof Error ? error : undefined);
      this.recordMetric(MetricType.MEMORY_USAGE, 50, { component }); // Valor padrÃ£o em caso de erro
    }
  }

  /**
   * Registra chamadas ao algoritmo de Levenshtein
   * @param count NÃºmero de chamadas
   * @param context Contexto adicional
   */
  public recordLevenshteinCalls(count: number, context?: Record<string, any>): void {
    this.recordMetric(MetricType.LEVENSHTEIN_CALLS, count, context);
  }

  /**
   * Registra taxa de acerto do cache
   * @param hits NÃºmero de acertos
   * @param misses NÃºmero de falhas
   */
  public recordCacheHitRate(hits: number, misses: number): void {
    const total = hits + misses;
    if (total > 0) {
      const hitRate = hits / total;
      this.recordMetric(MetricType.CACHE_HIT_RATE, hitRate, { hits, misses, total });
    }
  }

  /**
   * Verifica se algum alerta deve ser disparado
   * @param metric Tipo de mÃ©trica a verificar
   */
  private checkAlerts(metric: MetricType): void {
    const thresholds = this.alertThresholds.filter(t => t.metric === metric);
    if (thresholds.length === 0) return;

    const now = Date.now();
    const metricData = this.metrics.get(metric) || [];

    // Verificar cada configuraÃ§Ã£o de alerta para esta mÃ©trica
    thresholds.forEach(threshold => {
      // Verificar se estamos no perÃ­odo de cooldown
      const lastAlertTime = this.lastAlerts.get(metric) || 0;
      if (now - lastAlertTime < threshold.cooldown) return;

      // Filtrar dados dentro do perÃ­odo de duraÃ§Ã£o
      const recentData = metricData.filter(data => now - data.timestamp <= threshold.duration);

      if (recentData.length === 0) return;

      // Calcular valor mÃ©dio para o perÃ­odo
      const avgValue = recentData.reduce((sum, data) => sum + data.value, 0) / recentData.length;

      // Verificar nÃ­veis de alerta
      if (avgValue >= threshold.critical) {
        this.triggerAlert(metric, AlertLevel.CRITICAL, avgValue, threshold.critical);
        this.lastAlerts.set(metric, now);
      } else if (avgValue >= threshold.warning) {
        this.triggerAlert(metric, AlertLevel.WARNING, avgValue, threshold.warning);
        this.lastAlerts.set(metric, now);
      }
    });
  }

  /**
   * Dispara um alerta no sistema
   * @param metric MÃ©trica que gerou o alerta
   * @param level NÃ­vel do alerta
   * @param value Valor atual da mÃ©trica
   * @param threshold Limite que foi ultrapassado
   */
  private triggerAlert(
    metric: MetricType,
    level: AlertLevel,
    value: number,
    threshold: number
  ): void {
    const formattedValue = this.formatMetricValue(metric, value);
    const formattedThreshold = this.formatMetricValue(metric, threshold);

    const message = `Alerta de ${level} para ${metric}: ${formattedValue} (limite: ${formattedThreshold})`;

    // Criar objeto de alerta
    const alertData: AlertData = {
      id: `${metric}_${level}_${Date.now()}`,
      metric,
      level,
      value,
      threshold,
      timestamp: Date.now(),
      message,
      acknowledged: false,
    };

    // Adicionar ao histÃ³rico de alertas
    this.alertHistory.push(alertData);

    // Limitar histÃ³rico de alertas (manter apenas os Ãºltimos 1000)
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }

    // Registrar alerta no sistema de logging
    switch (level) {
      case AlertLevel.INFO:
        loggingService.info(message, { metric, value, threshold });
        break;
      case AlertLevel.WARNING:
        loggingService.warn(message, { metric, value, threshold });
        break;
      case AlertLevel.CRITICAL:
        loggingService.error(message, { metric, value, threshold });
        // Enviar notificaÃ§Ãµes crÃ­ticas
        this.sendCriticalNotification(alertData);
        break;
    }

    // Enviar alerta em tempo real via WebSocket
    this.broadcastAlert(alertData);
  }

  /**
   * Formata o valor da mÃ©trica para exibiÃ§Ã£o
   * @param metric Tipo da mÃ©trica
   * @param value Valor a ser formatado
   * @returns Valor formatado como string
   */
  private formatMetricValue(metric: MetricType, value: number): string {
    switch (metric) {
      case MetricType.SEARCH_LATENCY:
      case MetricType.SUGGESTION_LATENCY:
      case MetricType.FILTER_LATENCY:
        return `${value.toFixed(2)}ms`;
      case MetricType.CACHE_HIT_RATE:
      case MetricType.ERROR_RATE:
      case MetricType.ZERO_RESULTS:
        return `${(value * 100).toFixed(2)}%`;
      case MetricType.MEMORY_USAGE:
        return `${value.toFixed(2)}%`;
      case MetricType.LEVENSHTEIN_CALLS:
        return value.toString();
      default:
        return value.toString();
    }
  }

  /**
   * Remove dados antigos para economizar memÃ³ria
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - this.defaultRetentionPeriod;

    this.metrics.forEach((dataPoints, metric) => {
      const filteredData = dataPoints.filter(data => data.timestamp >= cutoffTime);
      this.metrics.set(metric, filteredData);
    });
  }

  /**
   * ObtÃ©m estatÃ­sticas resumidas para uma mÃ©trica
   * @param metric Tipo da mÃ©trica
   * @param duration PerÃ­odo de tempo para anÃ¡lise (ms)
   * @returns Objeto com estatÃ­sticas
   */
  public getMetricStats(metric: MetricType, duration: number = 3600000): Record<string, any> {
    const metricData = this.metrics.get(metric) || [];
    const cutoffTime = Date.now() - duration;
    const recentData = metricData.filter(data => data.timestamp >= cutoffTime);

    if (recentData.length === 0) {
      return {
        count: 0,
        min: null,
        max: null,
        avg: null,
        p95: null,
      };
    }

    const values = recentData.map(data => data.value);
    values.sort((a, b) => a - b);

    const sum = values.reduce((acc, val) => acc + val, 0);
    const p95Index = Math.floor(values.length * 0.95);

    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p95: values[p95Index],
    };
  }

  /**
   * Inicializa o baseline de performance do sistema
   */
  private initializePerformanceBaseline(): void {
    // Valores iniciais baseados em benchmarks tÃ­picos
    this.performanceBaseline.set(MetricType.SEARCH_LATENCY, 200); // 200ms
    this.performanceBaseline.set(MetricType.SUGGESTION_LATENCY, 100); // 100ms
    this.performanceBaseline.set(MetricType.CACHE_HIT_RATE, 0.8); // 80%
    this.performanceBaseline.set(MetricType.MEMORY_USAGE, 50); // 50%
    this.performanceBaseline.set(MetricType.ERROR_RATE, 0.01); // 1%
  }

  /**
   * Inicia o monitoramento em tempo real
   */
  private startRealTimeMonitoring(): void {
    // Atualizar dados em tempo real a cada 5 segundos
    this.realTimeUpdateInterval = setInterval(() => {
      this.broadcastRealTimeData();
    }, 5000);
  }

  /**
   * Para o monitoramento em tempo real
   */
  public stopRealTimeMonitoring(): void {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
      this.realTimeUpdateInterval = null;
    }
  }

  /**
   * Para todos os intervalos e limpa recursos para evitar memory leaks
   */
  public cleanup(): void {
    // Parar monitoramento em tempo real
    this.stopRealTimeMonitoring();

    // Parar intervalo de limpeza
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Parar detecÃ§Ã£o de anomalias
    if (this.anomalyDetectionInterval) {
      clearInterval(this.anomalyDetectionInterval);
      this.anomalyDetectionInterval = null;
    }

    // Limpar conexÃµes WebSocket
    this.webSocketConnections.clear();

    loggingService.info('Sistema de monitoramento limpo com sucesso');
  }

  /**
   * Limpa todas as mÃ©tricas e histÃ³rico de alertas sem parar o monitoramento
   */
  public clearMetrics(): void {
    try {
      // Resetar mÃ©tricas
      this.metrics.clear();
      Object.values(MetricType).forEach(metric => {
        this.metrics.set(metric as MetricType, []);
      });

      // Limpar histÃ³rico e estado de alertas
      this.alertHistory = [];
      this.lastAlerts.clear();

      // Opcional: zerar mÃ©tricas avanÃ§adas volÃ¡teis
      this.advancedMetrics.searchTrends = [];
      this.advancedMetrics.anomalies = [];

      loggingService.info('MÃ©tricas de monitoramento limpas', { component: 'monitoring' });
    } catch (err) {
      loggingService.error(
        'Falha ao limpar mÃ©tricas',
        err instanceof Error ? err : { error: String(err) },
        { component: 'monitoring' }
      );
      throw err;
    }
  }

  /**
   * Adiciona uma conexÃ£o WebSocket para monitoramento em tempo real
   * @param ws ConexÃ£o WebSocket
   */
  public addWebSocketConnection(ws: MonitoringWebSocket): void {
    this.webSocketConnections.add(ws);

    // Enviar dados iniciais
    this.sendRealTimeData(ws);
  }

  /**
   * Remove uma conexÃ£o WebSocket
   * @param ws ConexÃ£o WebSocket
   */
  public removeWebSocketConnection(ws: MonitoringWebSocket): void {
    this.webSocketConnections.delete(ws);
  }

  /**
   * Envia dados em tempo real para uma conexÃ£o especÃ­fica
   * @param ws ConexÃ£o WebSocket
   */
  private sendRealTimeData(ws: MonitoringWebSocket): void {
    try {
      // Verificar se WebSocket estÃ¡ aberto
      if (ws.readyState === WEBSOCKET_STATES.OPEN) {
        const data = this.getRealTimeDashboardData();
        ws.send(JSON.stringify(data));
      }
      } catch (error) {
        loggingService.error('Erro ao enviar dados em tempo real via WebSocket', error instanceof Error ? error : { error: String(error) });
        // Remover conexÃ£o com problema
        this.webSocketConnections.delete(ws);
      }
  }

  /**
   * Transmite dados em tempo real para todas as conexÃµes
   */
  private broadcastRealTimeData(): void {
    const data = this.getRealTimeDashboardData();
    const message = JSON.stringify(data);

    // Usar Array.from para evitar problemas de modificaÃ§Ã£o durante iteraÃ§Ã£o
    const connections = Array.from(this.webSocketConnections);

    connections.forEach(ws => {
      try {
        if (ws.readyState === WEBSOCKET_STATES.OPEN) {
          ws.send(message);
        } else {
          // Remove conexÃµes fechadas
          this.webSocketConnections.delete(ws);
        }
      } catch (error) {
        loggingService.error('Erro ao transmitir dados em tempo real', error instanceof Error ? error : { error: String(error) });
        this.webSocketConnections.delete(ws);
      }
    });
  }

  /**
   * Transmite um alerta para todas as conexÃµes
   * @param alert Dados do alerta
   */
  private broadcastAlert(alert: AlertData): void {
    const message = JSON.stringify({ type: 'alert', data: alert });

    // Usar Array.from para evitar problemas de modificaÃ§Ã£o durante iteraÃ§Ã£o
    const connections = Array.from(this.webSocketConnections);

    connections.forEach(ws => {
      try {
        if (ws.readyState === WEBSOCKET_STATES.OPEN) {
          ws.send(message);
        } else {
          // Remove conexÃµes fechadas
          this.webSocketConnections.delete(ws);
        }
      } catch (error) {
        loggingService.error('Erro ao transmitir alerta via WebSocket', error instanceof Error ? error : { error: String(error) });
        this.webSocketConnections.delete(ws);
      }
    });
  }

  /**
   * ObtÃ©m dados do dashboard em tempo real
   * @returns Dados formatados para o dashboard
   */
  private getRealTimeDashboardData(): RealTimeDashboardData {
    const metrics: Record<MetricType, any> = {} as Record<MetricType, any>;

    // Obter estatÃ­sticas recentes para cada mÃ©trica
    Object.values(MetricType).forEach(metric => {
      metrics[metric as MetricType] = this.getMetricStats(metric as MetricType, 300000); // Ãšltimos 5 minutos
    });

    return {
      metrics,
      alerts: this.getRecentAlerts(300000), // Ãšltimos 5 minutos
      systemHealth: this.getSystemHealth(),
      timestamp: Date.now(),
    };
  }

  /**
   * ObtÃ©m alertas recentes
   * @param duration PerÃ­odo em milissegundos
   * @returns Array de alertas recentes
   */
  public getRecentAlerts(duration: number = 3600000): AlertData[] {
    const cutoffTime = Date.now() - duration;
    return this.alertHistory.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * ObtÃ©m o status de saÃºde do sistema
   * @returns Status de saÃºde do sistema
   */
  public getSystemHealth(): SystemHealthStatus {
    const components: Record<string, 'healthy' | 'warning' | 'critical'> = {};
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Verificar cada mÃ©trica
    Object.values(MetricType).forEach(metric => {
      const stats = this.getMetricStats(metric as MetricType, 300000);
      const threshold = this.alertThresholds.find(t => t.metric === metric);

      if (threshold && stats.avg !== null) {
        if (stats.avg >= threshold.critical) {
          components[metric] = 'critical';
          overallStatus = 'critical';
        } else if (stats.avg >= threshold.warning) {
          components[metric] = 'warning';
          if (overallStatus !== 'critical') {
            overallStatus = 'warning';
          }
        } else {
          components[metric] = 'healthy';
        }
      } else {
        components[metric] = 'healthy';
      }
    });

    return {
      overall: overallStatus,
      components,
      uptime: Date.now() - this.systemStartTime,
      lastCheck: Date.now(),
    };
  }

  /**
   * Detecta anomalias nas mÃ©tricas
   */
  private detectAnomalies(): void {
    if (!this.anomalyDetectionEnabled) return;

    Object.values(MetricType).forEach(metric => {
      const metricType = metric as MetricType;
      const recentData = this.metrics.get(metricType) || [];

      if (recentData.length < 10) return; // Precisa de dados suficientes

      const values = recentData.slice(-50).map(d => d.value); // Ãšltimos 50 pontos
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      const latestValue = values[values.length - 1];
      const zScore = Math.abs((latestValue - mean) / stdDev);

      if (zScore > this.anomalyThreshold) {
        const anomaly: AnomalyDetection = {
          metric: metricType,
          value: latestValue,
          expectedRange: [mean - stdDev, mean + stdDev],
          severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
          timestamp: Date.now(),
          description: `Valor anÃ´malo detectado: ${latestValue.toFixed(2)} (esperado: ${mean.toFixed(2)} Â± ${stdDev.toFixed(2)})`,
        };

        this.advancedMetrics.anomalies.push(anomaly);

        // Limitar histÃ³rico de anomalias
        if (this.advancedMetrics.anomalies.length > 100) {
          this.advancedMetrics.anomalies.shift();
        }

        // Log da anomalia
        loggingService.warn('Anomalia detectada', anomaly);
      }
    });
  }

  /**
   * Configura notificaÃ§Ãµes
   * @param config ConfiguraÃ§Ã£o de notificaÃ§Ãµes
   */
  public configureNotifications(config: NotificationConfig): void {
    this.notificationConfig = { ...config };
  }

  /**
   * Envia notificaÃ§Ã£o crÃ­tica
   * @param alert Dados do alerta
   */
  private async sendCriticalNotification(alert: AlertData): Promise<void> {
    if (!this.notificationConfig.enabled) return;

    try {
      // Webhook notification
      if (this.notificationConfig.webhook) {
        await fetch(this.notificationConfig.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'critical_alert',
            alert,
            timestamp: new Date().toISOString(),
          }),
        });
      }

      // Email notifications (implementaÃ§Ã£o dependeria do serviÃ§o de email)
      if (this.notificationConfig.email && this.notificationConfig.email.length > 0) {
        loggingService.info('Email notification would be sent', {
          recipients: this.notificationConfig.email,
          alert,
        });
      }

      // SMS notifications (implementaÃ§Ã£o dependeria do serviÃ§o de SMS)
      if (this.notificationConfig.sms && this.notificationConfig.sms.length > 0) {
        loggingService.info('SMS notification would be sent', {
          recipients: this.notificationConfig.sms,
          alert,
        });
      }
    } catch (error) {
      loggingService.error('Erro ao enviar notificaÃ§Ã£o crÃ­tica', error instanceof Error ? error : { error: String(error) }, { alert });
    }
  }

  /**
   * Reconhece um alerta
   * @param alertId ID do alerta
   * @param acknowledgedBy UsuÃ¡rio que reconheceu
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      loggingService.info('Alerta reconhecido', { alertId, acknowledgedBy });
      return true;
    }
    return false;
  }

  /**
   * Registra tendÃªncias de busca
   * @param query Consulta de busca
   * @param latency LatÃªncia da busca
   * @param success Se a busca foi bem-sucedida
   */
  public recordSearchTrend(query: string, latency: number, success: boolean): void {
    const existing = this.advancedMetrics.searchTrends.find(t => t.query === query);

    if (existing) {
      const totalAttempts = existing.frequency;
      const currentSuccesses = Math.round(existing.successRate * totalAttempts);

      existing.frequency++;
      // Calcular mÃ©dia ponderada da latÃªncia
      existing.avgLatency = (existing.avgLatency * totalAttempts + latency) / existing.frequency;
      // Calcular taxa de sucesso real baseada no total de tentativas
      const newSuccesses = currentSuccesses + (success ? 1 : 0);
      existing.successRate = newSuccesses / existing.frequency;
      existing.timestamp = Date.now();
    } else {
      this.advancedMetrics.searchTrends.push({
        query,
        frequency: 1,
        avgLatency: latency,
        successRate: success ? 1 : 0,
        timestamp: Date.now(),
      });
    }

    // Limitar nÃºmero de tendÃªncias armazenadas
    if (this.advancedMetrics.searchTrends.length > 1000) {
      this.advancedMetrics.searchTrends.sort((a, b) => b.frequency - a.frequency);
      this.advancedMetrics.searchTrends = this.advancedMetrics.searchTrends.slice(0, 1000);
    }
  }

  /**
   * ObtÃ©m mÃ©tricas avanÃ§adas
   * @returns MÃ©tricas avanÃ§adas do sistema
   */
  public getAdvancedMetrics(): AdvancedMetrics {
    return { ...this.advancedMetrics };
  }

  /**
   * Atualiza baseline de performance
   */
  public updatePerformanceBaseline(): void {
    const duration = 7 * 24 * 60 * 60 * 1000; // 7 dias

    Object.values(MetricType).forEach(metric => {
      const stats = this.getMetricStats(metric as MetricType, duration);
      if (stats.avg !== null) {
        this.performanceBaseline.set(metric as MetricType, stats.avg);
      }
    });

    this.advancedMetrics.performanceBaseline = {
      avgSearchLatency: this.performanceBaseline.get(MetricType.SEARCH_LATENCY) || 0,
      avgSuggestionLatency: this.performanceBaseline.get(MetricType.SUGGESTION_LATENCY) || 0,
      avgCacheHitRate: this.performanceBaseline.get(MetricType.CACHE_HIT_RATE) || 0,
      avgMemoryUsage: this.performanceBaseline.get(MetricType.MEMORY_USAGE) || 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Gera um relatÃ³rio de desempenho do sistema de busca
   * @returns Objeto com relatÃ³rio de desempenho
   */
  public generatePerformanceReport(): Record<string, any> {
    const report: Record<string, any> = {};

    // EstatÃ­sticas para cada mÃ©trica nas Ãºltimas 24 horas
    Object.values(MetricType).forEach(metric => {
      report[metric] = this.getMetricStats(metric as MetricType, 24 * 60 * 60 * 1000);
    });

    // Adicionar mÃ©tricas avanÃ§adas
    report.advancedMetrics = this.getAdvancedMetrics();
    report.systemHealth = this.getSystemHealth();
    report.recentAlerts = this.getRecentAlerts(24 * 60 * 60 * 1000);

    // Adicionar timestamp do relatÃ³rio
    report.generatedAt = new Date().toISOString();

    return report;
  }
}

// Exportar instÃ¢ncia singleton para uso em toda a aplicaÃ§Ã£o
export const searchMonitor = SearchMonitoring.getInstance();

