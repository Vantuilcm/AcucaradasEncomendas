/**
 * Sistema de Monitoramento em Tempo Real
 *
 * Este módulo implementa monitoramento em tempo real para o sistema de busca avançada,
 * conforme recomendado nos próximos passos do documento de otimizações.
 *
 * Funcionalidades:
 * - Monitoramento de métricas de performance em tempo real
 * - Alertas automáticos para anomalias
 * - Dashboard de métricas ao vivo
 * - Histórico de performance
 * - Integração com sistema de cache
 *
 * @author BugHunter - Sistema de Monitoramento
 * @version 1.0.0
 */

import { SearchMonitoring } from './SearchMonitoring';

/**
 * Interface para configuração do monitoramento em tempo real
 */
interface RealTimeConfig {
  /** Intervalo de coleta de métricas em milissegundos */
  metricsInterval: number;
  /** Intervalo de verificação de alertas em milissegundos */
  alertsInterval: number;
  /** Número máximo de pontos de dados mantidos em memória */
  maxDataPoints: number;
  /** Habilitar notificações em tempo real */
  enableNotifications: boolean;
  /** Limites personalizados para alertas */
  customThresholds?: {
    [metricType: string]: {
      warning: number;
      critical: number;
    };
  };
}

/**
 * Interface para dados de métrica em tempo real
 */
interface RealTimeMetric {
  timestamp: number;
  value: number;
  trend: 'up' | 'down' | 'stable';
  severity: 'normal' | 'warning' | 'critical';
}

/**
 * Interface para evento de alerta
 */
interface AlertEvent {
  id: string;
  timestamp: number;
  metricType: string;
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  resolved: boolean;
}

/**
 * Interface para estatísticas de dashboard
 */
interface DashboardStats {
  searchLatency: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  cacheHitRate: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  errorRate: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  memoryUsage: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  activeAlerts: number;
  totalSearches: number;
}

/**
 * Classe principal para monitoramento em tempo real
 */
export class RealTimeMonitoring {
  private static instance: RealTimeMonitoring;
  private config: RealTimeConfig;
  private searchMonitoring: SearchMonitoring;
  private metricsInterval: NodeJS.Timeout | null = null;
  private alertsInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // Armazenamento de métricas em tempo real
  private realTimeMetrics: Map<string, RealTimeMetric[]> = new Map();
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private alertHistory: AlertEvent[] = [];

  // Callbacks para notificações
  private alertCallbacks: ((alert: AlertEvent) => void)[] = [];
  private metricsCallbacks: ((metrics: DashboardStats) => void)[] = [];

  /**
   * Construtor privado para implementar padrão Singleton
   */
  private constructor(config: Partial<RealTimeConfig> = {}) {
    this.config = {
      metricsInterval: 5000, // 5 segundos
      alertsInterval: 10000, // 10 segundos
      maxDataPoints: 100,
      enableNotifications: true,
      ...config,
    };

    this.searchMonitoring = SearchMonitoring.getInstance();
    this.initializeMetrics();
  }

  /**
   * Obtém a instância singleton
   */
  public static getInstance(config?: Partial<RealTimeConfig>): RealTimeMonitoring {
    if (!RealTimeMonitoring.instance) {
      RealTimeMonitoring.instance = new RealTimeMonitoring(config);
    }
    return RealTimeMonitoring.instance;
  }

  /**
   * Inicializa as métricas em tempo real
   */
  private initializeMetrics(): void {
    const metricTypes = [
      'searchLatency',
      'cacheHitRate',
      'errorRate',
      'memoryUsage',
      'zeroResults',
    ];

    for (const metricType of metricTypes) {
      this.realTimeMetrics.set(metricType, []);
    }
  }

  /**
   * Inicia o monitoramento em tempo real
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('Monitoramento em tempo real já está em execução');
      return;
    }

    console.log('Iniciando monitoramento em tempo real...');
    this.isRunning = true;

    // Iniciar coleta de métricas
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    // Iniciar verificação de alertas
    this.alertsInterval = setInterval(() => {
      this.checkAlerts();
    }, this.config.alertsInterval);

    console.log(
      `Monitoramento iniciado - Métricas: ${this.config.metricsInterval}ms, Alertas: ${this.config.alertsInterval}ms`
    );
  }

  /**
   * Para o monitoramento em tempo real
   */
  public stop(): void {
    if (!this.isRunning) {
      console.warn('Monitoramento em tempo real não está em execução');
      return;
    }

    console.log('Parando monitoramento em tempo real...');
    this.isRunning = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.alertsInterval) {
      clearInterval(this.alertsInterval);
      this.alertsInterval = null;
    }

    console.log('Monitoramento parado');
  }

  /**
   * Coleta métricas atuais do sistema
   */
  private collectMetrics(): void {
    try {
      const timestamp = Date.now();

      // Obter estatísticas do SearchMonitoring
      const stats = this.searchMonitoring.generatePerformanceReport();

      // Coletar métricas específicas
      this.addMetric('searchLatency', stats.averageLatency || 0, timestamp);
      this.addMetric('cacheHitRate', stats.cacheHitRate || 0, timestamp);
      this.addMetric('errorRate', stats.errorRate || 0, timestamp);
      this.addMetric('memoryUsage', this.getCurrentMemoryUsage(), timestamp);
      this.addMetric('zeroResults', stats.zeroResultsRate || 0, timestamp);

      // Notificar callbacks de métricas
      this.notifyMetricsCallbacks();
    } catch (error) {
      console.error('Erro ao coletar métricas:', error);
    }
  }

  /**
   * Adiciona uma métrica ao armazenamento em tempo real
   */
  private addMetric(metricType: string, value: number, timestamp: number): void {
    const metrics = this.realTimeMetrics.get(metricType) || [];

    // Calcular tendência
    const trend = this.calculateTrend(metrics, value);

    // Determinar severidade
    const severity = this.determineSeverity(metricType, value);

    const metric: RealTimeMetric = {
      timestamp,
      value,
      trend,
      severity,
    };

    metrics.push(metric);

    // Manter apenas os últimos N pontos de dados
    if (metrics.length > this.config.maxDataPoints) {
      metrics.shift();
    }

    this.realTimeMetrics.set(metricType, metrics);
  }

  /**
   * Calcula a tendência de uma métrica
   */
  private calculateTrend(
    metrics: RealTimeMetric[],
    currentValue: number
  ): 'up' | 'down' | 'stable' {
    if (metrics.length < 2) return 'stable';

    const recentMetrics = metrics.slice(-5); // Últimas 5 medições
    const average = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;

    const threshold = average * 0.05; // 5% de variação

    if (currentValue > average + threshold) return 'up';
    if (currentValue < average - threshold) return 'down';
    return 'stable';
  }

  /**
   * Determina a severidade de uma métrica
   */
  private determineSeverity(metricType: string, value: number): 'normal' | 'warning' | 'critical' {
    const customThresholds = this.config.customThresholds?.[metricType];

    if (customThresholds) {
      if (value >= customThresholds.critical) return 'critical';
      if (value >= customThresholds.warning) return 'warning';
      return 'normal';
    }

    // Limites padrão baseados no tipo de métrica
    switch (metricType) {
      case 'searchLatency':
        if (value > 2000) return 'critical'; // > 2s
        if (value > 1000) return 'warning'; // > 1s
        break;

      case 'errorRate':
        if (value > 10) return 'critical'; // > 10%
        if (value > 5) return 'warning'; // > 5%
        break;

      case 'memoryUsage':
        if (value > 90) return 'critical'; // > 90%
        if (value > 75) return 'warning'; // > 75%
        break;

      case 'cacheHitRate':
        if (value < 30) return 'critical'; // < 30%
        if (value < 50) return 'warning'; // < 50%
        break;

      case 'zeroResults':
        if (value > 50) return 'critical'; // > 50%
        if (value > 30) return 'warning'; // > 30%
        break;
    }

    return 'normal';
  }

  /**
   * Verifica alertas baseados nas métricas atuais
   */
  private checkAlerts(): void {
    try {
      for (const [metricType, metrics] of this.realTimeMetrics) {
        if (metrics.length === 0) continue;

        const latestMetric = metrics[metrics.length - 1];

        if (latestMetric.severity === 'warning' || latestMetric.severity === 'critical') {
          this.createAlert(metricType, latestMetric);
        } else {
          // Resolver alertas existentes se a métrica voltou ao normal
          this.resolveAlert(metricType);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar alertas:', error);
    }
  }

  /**
   * Cria um novo alerta
   */
  private createAlert(metricType: string, metric: RealTimeMetric): void {
    const alertId = `${metricType}_${metric.severity}`;

    // Verificar se já existe um alerta ativo para esta métrica
    if (this.activeAlerts.has(alertId)) {
      return; // Alerta já existe
    }

    const alert: AlertEvent = {
      id: alertId,
      timestamp: metric.timestamp,
      metricType,
      severity: metric.severity as 'warning' | 'critical',
      message: this.generateAlertMessage(metricType, metric),
      value: metric.value,
      threshold: this.getThreshold(metricType, metric.severity),
      resolved: false,
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Manter histórico limitado
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-500);
    }

    console.warn(`🚨 ALERTA ${alert.severity.toUpperCase()}: ${alert.message}`);

    // Notificar callbacks
    if (this.config.enableNotifications) {
      this.notifyAlertCallbacks(alert);
    }
  }

  /**
   * Resolve um alerta ativo
   */
  private resolveAlert(metricType: string): void {
    const alertIds = Array.from(this.activeAlerts.keys()).filter(id => id.startsWith(metricType));

    for (const alertId of alertIds) {
      const alert = this.activeAlerts.get(alertId);
      if (alert) {
        alert.resolved = true;
        this.activeAlerts.delete(alertId);
        console.log(`✅ Alerta resolvido: ${alert.message}`);
      }
    }
  }

  /**
   * Gera mensagem de alerta
   */
  private generateAlertMessage(metricType: string, metric: RealTimeMetric): string {
    const value = metric.value.toFixed(2);
    const threshold = this.getThreshold(metricType, metric.severity).toFixed(2);

    switch (metricType) {
      case 'searchLatency':
        return `Latência de busca elevada: ${value}ms (limite: ${threshold}ms)`;
      case 'errorRate':
        return `Taxa de erro elevada: ${value}% (limite: ${threshold}%)`;
      case 'memoryUsage':
        return `Uso de memória elevado: ${value}% (limite: ${threshold}%)`;
      case 'cacheHitRate':
        return `Taxa de acerto do cache baixa: ${value}% (mínimo: ${threshold}%)`;
      case 'zeroResults':
        return `Taxa de buscas sem resultado elevada: ${value}% (limite: ${threshold}%)`;
      default:
        return `Métrica ${metricType} fora do limite: ${value} (limite: ${threshold})`;
    }
  }

  /**
   * Obtém o limite para uma métrica e severidade
   */
  private getThreshold(metricType: string, severity: string): number {
    const customThresholds = this.config.customThresholds?.[metricType];

    if (customThresholds) {
      return severity === 'critical' ? customThresholds.critical : customThresholds.warning;
    }

    // Limites padrão
    const defaultThresholds: { [key: string]: { warning: number; critical: number } } = {
      searchLatency: { warning: 1000, critical: 2000 },
      errorRate: { warning: 5, critical: 10 },
      memoryUsage: { warning: 75, critical: 90 },
      cacheHitRate: { warning: 50, critical: 30 },
      zeroResults: { warning: 30, critical: 50 },
    };

    const thresholds = defaultThresholds[metricType] || { warning: 0, critical: 0 };
    return severity === 'critical' ? thresholds.critical : thresholds.warning;
  }

  /**
   * Obtém uso atual de memória
   */
  private getCurrentMemoryUsage(): number {
    try {
      if (typeof performance !== 'undefined' && performance.memory) {
        const memory = performance.memory;
        return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      }

      // Fallback para Node.js
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memory = process.memoryUsage();
        return (memory.heapUsed / memory.heapTotal) * 100;
      }

      return 0;
    } catch (error) {
      console.warn('Não foi possível obter uso de memória:', error);
      return 0;
    }
  }

  /**
   * Registra callback para alertas
   */
  public onAlert(callback: (alert: AlertEvent) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Registra callback para métricas
   */
  public onMetrics(callback: (metrics: DashboardStats) => void): void {
    this.metricsCallbacks.push(callback);
  }

  /**
   * Remove callback de alertas
   */
  public offAlert(callback: (alert: AlertEvent) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Remove callback de métricas
   */
  public offMetrics(callback: (metrics: DashboardStats) => void): void {
    const index = this.metricsCallbacks.indexOf(callback);
    if (index > -1) {
      this.metricsCallbacks.splice(index, 1);
    }
  }

  /**
   * Notifica callbacks de alertas
   */
  private notifyAlertCallbacks(alert: AlertEvent): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error('Erro ao notificar callback de alerta:', error);
      }
    }
  }

  /**
   * Notifica callbacks de métricas
   */
  private notifyMetricsCallbacks(): void {
    const stats = this.getDashboardStats();

    for (const callback of this.metricsCallbacks) {
      try {
        callback(stats);
      } catch (error) {
        console.error('Erro ao notificar callback de métricas:', error);
      }
    }
  }

  /**
   * Obtém estatísticas para dashboard
   */
  public getDashboardStats(): DashboardStats {
    const getMetricStats = (metricType: string) => {
      const metrics = this.realTimeMetrics.get(metricType) || [];
      if (metrics.length === 0) {
        return { current: 0, average: 0, trend: 'stable' as const };
      }

      const latest = metrics[metrics.length - 1];
      const average = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;

      return {
        current: latest.value,
        average,
        trend: latest.trend,
      };
    };

    return {
      searchLatency: getMetricStats('searchLatency'),
      cacheHitRate: getMetricStats('cacheHitRate'),
      errorRate: getMetricStats('errorRate'),
      memoryUsage: getMetricStats('memoryUsage'),
      activeAlerts: this.activeAlerts.size,
      totalSearches: this.getTotalSearches(),
    };
  }

  /**
   * Obtém total de buscas realizadas
   */
  private getTotalSearches(): number {
    try {
      const report = this.searchMonitoring.generatePerformanceReport();
      return report.totalSearches || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Obtém métricas históricas
   */
  public getHistoricalMetrics(
    metricType: string,
    timeRange?: { start: number; end: number }
  ): RealTimeMetric[] {
    const metrics = this.realTimeMetrics.get(metricType) || [];

    if (!timeRange) {
      return [...metrics];
    }

    return metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
  }

  /**
   * Obtém alertas ativos
   */
  public getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Obtém histórico de alertas
   */
  public getAlertHistory(limit?: number): AlertEvent[] {
    const history = [...this.alertHistory].reverse(); // Mais recentes primeiro
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Limpa dados históricos
   */
  public clearHistory(): void {
    this.realTimeMetrics.clear();
    this.alertHistory = [];
    this.activeAlerts.clear();
    this.initializeMetrics();
    console.log('Histórico de monitoramento limpo');
  }

  /**
   * Obtém configuração atual
   */
  public getConfig(): RealTimeConfig {
    return { ...this.config };
  }

  /**
   * Atualiza configuração
   */
  public updateConfig(newConfig: Partial<RealTimeConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning) {
      this.start();
    }

    console.log('Configuração de monitoramento atualizada:', this.config);
  }

  /**
   * Obtém status do monitoramento
   */
  public getStatus(): {
    isRunning: boolean;
    uptime: number;
    metricsCollected: number;
    activeAlerts: number;
    totalAlerts: number;
  } {
    const metricsCollected = Array.from(this.realTimeMetrics.values()).reduce(
      (total, metrics) => total + metrics.length,
      0
    );

    return {
      isRunning: this.isRunning,
      uptime: this.isRunning
        ? Date.now() - (this.realTimeMetrics.get('searchLatency')?.[0]?.timestamp || Date.now())
        : 0,
      metricsCollected,
      activeAlerts: this.activeAlerts.size,
      totalAlerts: this.alertHistory.length,
    };
  }

  /**
   * Gera relatório de saúde do sistema
   */
  public generateHealthReport(): {
    overall: 'healthy' | 'warning' | 'critical';
    metrics: { [key: string]: 'healthy' | 'warning' | 'critical' };
    recommendations: string[];
    summary: string;
  } {
    const stats = this.getDashboardStats();
    const activeAlerts = this.getActiveAlerts();

    // Avaliar saúde de cada métrica
    const metricHealth: { [key: string]: 'healthy' | 'warning' | 'critical' } = {};
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    for (const [metricType, metrics] of this.realTimeMetrics) {
      if (metrics.length === 0) {
        metricHealth[metricType] = 'healthy';
        continue;
      }

      const latest = metrics[metrics.length - 1];
      metricHealth[metricType] = latest.severity === 'normal' ? 'healthy' : latest.severity;

      if (latest.severity === 'critical') {
        overallHealth = 'critical';
      } else if (latest.severity === 'warning' && overallHealth !== 'critical') {
        overallHealth = 'warning';
      }
    }

    // Gerar recomendações
    const recommendations: string[] = [];

    if (stats.searchLatency.current > 1000) {
      recommendations.push('Otimizar algoritmos de busca para reduzir latência');
    }

    if (stats.cacheHitRate.current < 50) {
      recommendations.push('Revisar estratégia de cache para melhorar taxa de acerto');
    }

    if (stats.errorRate.current > 5) {
      recommendations.push('Investigar e corrigir causas de erros na busca');
    }

    if (stats.memoryUsage.current > 75) {
      recommendations.push('Otimizar uso de memória ou aumentar recursos disponíveis');
    }

    if (activeAlerts.length > 5) {
      recommendations.push('Resolver alertas ativos para melhorar estabilidade do sistema');
    }

    // Gerar resumo
    const summary =
      `Sistema ${
        overallHealth === 'healthy'
          ? 'saudável'
          : overallHealth === 'warning'
            ? 'com alertas'
            : 'crítico'
      }. ` +
      `${activeAlerts.length} alertas ativos, ` +
      `latência média: ${stats.searchLatency.average.toFixed(0)}ms, ` +
      `taxa de acerto do cache: ${stats.cacheHitRate.average.toFixed(1)}%`;

    return {
      overall: overallHealth,
      metrics: metricHealth,
      recommendations,
      summary,
    };
  }
}

// Exportar tipos para uso em outros módulos
export type { RealTimeConfig, RealTimeMetric, AlertEvent, DashboardStats };
