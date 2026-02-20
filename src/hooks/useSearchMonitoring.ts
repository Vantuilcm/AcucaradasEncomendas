/**
 * Hook personalizado para integraÃ§Ã£o com o sistema de monitoramento de busca
 * Fornece uma interface React-friendly para o SearchMonitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchMonitor, MetricType, AlertLevel } from '../monitoring/SearchMonitoring';
import { LoggingService } from '../services/LoggingService';

const logger = LoggingService.getInstance();

// Interfaces para o hook
interface MonitoringHookState {
  isConnected: boolean;
  metrics: Record<string, any>;
  alerts: any[];
  systemHealth: any;
  isLoading: boolean;
  error: string | null;
}

interface MonitoringHookActions {
  recordMetric: (metric: MetricType, value: number, context?: Record<string, any>) => void;
  recordSearchLatency: (latency: number, query: string) => void;
  recordCacheHit: (hit: boolean) => void;
  recordZeroResults: (query: string, filters?: Record<string, any>) => void;
  acknowledgeAlert: (alertId: string) => boolean;
  refreshData: () => Promise<void>;
  configureNotifications: (config: any) => void;
  getPerformanceReport: () => Record<string, any>;
}

type UseSearchMonitoringReturn = MonitoringHookState & MonitoringHookActions;

/**
 * Hook para monitoramento de busca
 * @param autoRefresh Se deve atualizar automaticamente os dados
 * @param refreshInterval Intervalo de atualizaÃ§Ã£o em milissegundos
 * @returns Estado e aÃ§Ãµes do monitoramento
 */
export const useSearchMonitoring = (
  autoRefresh: boolean = true,
  refreshInterval: number = 5000
): UseSearchMonitoringReturn => {
  const [state, setState] = useState<MonitoringHookState>({
    isConnected: false,
    metrics: {},
    alerts: [],
    systemHealth: null,
    isLoading: true,
    error: null,
  });

  const refreshIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheHits = useRef(0);
  const cacheMisses = useRef(0);

  // FunÃ§Ã£o para atualizar dados do monitoramento
  const refreshData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Obter dados do sistema de monitoramento
      const performanceReport = searchMonitor.generatePerformanceReport();
      const systemHealth = searchMonitor.getSystemHealth();
      const recentAlerts = searchMonitor.getRecentAlerts(300000); // Ãšltimos 5 minutos

      setState({
        isConnected: true,
        metrics: performanceReport,
        alerts: recentAlerts,
        systemHealth,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar dados de monitoramento', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        isConnected: false,
      }));
    }
  }, []);

  // Função para registrar métrica genérica
  const recordMetric = useCallback(
    (metric: MetricType, value: number, context?: Record<string, any>) => {
      try {
        searchMonitor.recordMetric(metric, value, context);
      } catch (error: any) {
        logger.error('Erro ao registrar métrica', error);
      }
    },
    []
  );

  // FunÃ§Ã£o para registrar latÃªncia de busca
  const recordSearchLatency = useCallback((latency: number, query: string) => {
    try {
      searchMonitor.recordMetric(MetricType.SEARCH_LATENCY, latency, { query });
      searchMonitor.recordSearchTrend(query, latency, true);
    } catch (error: any) {
      logger.error('Erro ao registrar latência de busca', error);
    }
  }, []);

  // Função para registrar hit/miss do cache
  const recordCacheHit = useCallback((hit: boolean) => {
    try {
      if (hit) {
        cacheHits.current++;
      } else {
        cacheMisses.current++;
      }

      // Registrar taxa de acerto do cache a cada 10 operações
      const totalOperations = cacheHits.current + cacheMisses.current;
      if (totalOperations % 10 === 0) {
        searchMonitor.recordCacheHitRate(cacheHits.current, cacheMisses.current);
      }
    } catch (error: any) {
        logger.error('Erro ao registrar cache hit/miss', error);
      }
  }, []);

  // Função para registrar busca sem resultados
  const recordZeroResults = useCallback((query: string, filters?: Record<string, any>) => {
    try {
      searchMonitor.recordZeroResults(query, filters);
      searchMonitor.recordSearchTrend(query, 0, false);
    } catch (error: any) {
      logger.error('Erro ao registrar busca sem resultados', error);
    }
  }, []);

  // Função para reconhecer alerta
  const acknowledgeAlert = useCallback((alertId: string): boolean => {
    try {
      return searchMonitor.acknowledgeAlert(alertId, 'react_hook_user');
    } catch (error: any) {
      logger.error('Erro ao reconhecer alerta', error);
      return false;
    }
  }, []);

  // Função para configurar notificações
  const configureNotifications = useCallback((config: any) => {
    try {
      searchMonitor.configureNotifications(config);
    } catch (error: any) {
      logger.error('Erro ao configurar notificações', error);
    }
  }, []);

  // Função para obter relatório de performance
  const getPerformanceReport = useCallback((): Record<string, any> => {
    try {
      return searchMonitor.generatePerformanceReport();
    } catch (error: any) {
      logger.error('Erro ao gerar relatório de performance', error);
      return {};
    }
  }, []);

  // Configurar atualizaÃ§Ã£o automÃ¡tica
  useEffect(() => {
    // Carregar dados iniciais
    refreshData();

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(refreshData, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refreshData]);

  return {
    // Estado
    isConnected: state.isConnected,
    metrics: state.metrics,
    alerts: state.alerts,
    systemHealth: state.systemHealth,
    isLoading: state.isLoading,
    error: state.error,

    // AÃ§Ãµes
    recordMetric,
    recordSearchLatency,
    recordCacheHit,
    recordZeroResults,
    acknowledgeAlert,
    refreshData,
    configureNotifications,
    getPerformanceReport,
  };
};

/**
 * Hook simplificado para registrar mÃ©tricas de busca
 * @returns FunÃ§Ãµes para registrar mÃ©tricas comuns
 */
export const useSearchMetrics = () => {
  const recordSearchStart = useCallback(() => {
    return performance.now();
  }, []);

  const recordSearchEnd = useCallback((startTime: number, query: string, resultCount: number) => {
    const latency = performance.now() - startTime;

    // Registrar latÃªncia
    searchMonitor.recordMetric(MetricType.SEARCH_LATENCY, latency, { query, resultCount });

    // Registrar busca sem resultados se aplicÃ¡vel
    if (resultCount === 0) {
      searchMonitor.recordZeroResults(query);
    }

    // Registrar tendÃªncia de busca
    searchMonitor.recordSearchTrend(query, latency, resultCount > 0);

    return latency;
  }, []);

  const recordSuggestionLatency = useCallback((latency: number, query: string) => {
    searchMonitor.recordMetric(MetricType.SUGGESTION_LATENCY, latency, { query });
  }, []);

  const recordFilterLatency = useCallback((latency: number, filterType: string) => {
    searchMonitor.recordMetric(MetricType.FILTER_LATENCY, latency, { filterType });
  }, []);

  const recordError = useCallback((error: Error, context?: Record<string, any>) => {
    searchMonitor.recordMetric(MetricType.ERROR_RATE, 1, {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }, []);

  const recordMemoryUsage = useCallback(() => {
    searchMonitor.recordMemoryUsage('search_component');
  }, []);

  return {
    recordSearchStart,
    recordSearchEnd,
    recordSuggestionLatency,
    recordFilterLatency,
    recordError,
    recordMemoryUsage,
  };
};

/**
 * Hook para monitoramento de performance de componentes
 * @param componentName Nome do componente
 * @returns FunÃ§Ãµes para monitorar performance
 */
export const useComponentPerformance = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);

  const startRenderMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderMeasurement = useCallback(() => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      searchMonitor.recordMetric(MetricType.SEARCH_LATENCY, renderTime, {
        component: componentName,
        type: 'render_time',
      });
      renderStartTime.current = 0;
    }
  }, [componentName]);

  const recordComponentMount = useCallback(() => {
    mountTime.current = performance.now();
    searchMonitor.recordMetric(MetricType.SEARCH_LATENCY, 0, {
      component: componentName,
      type: 'component_mount',
      timestamp: mountTime.current,
    });
  }, [componentName]);

  const recordComponentUnmount = useCallback(() => {
    if (mountTime.current > 0) {
      const lifeTime = performance.now() - mountTime.current;
      searchMonitor.recordMetric(MetricType.SEARCH_LATENCY, lifeTime, {
        component: componentName,
        type: 'component_lifetime',
      });
    }
  }, [componentName]);

  // Registrar montagem do componente
  useEffect(() => {
    recordComponentMount();
    return recordComponentUnmount;
  }, [recordComponentMount, recordComponentUnmount]);

  return {
    startRenderMeasurement,
    endRenderMeasurement,
    recordComponentMount,
    recordComponentUnmount,
  };
};

export default useSearchMonitoring;

