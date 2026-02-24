import * as Sentry from '@sentry/react-native';
import { PerformanceObserver, performance } from 'perf_hooks';
import { Platform } from 'react-native';
import { performanceConfig } from '../config/performance';
import { startPerformanceTransaction } from '../config/sentry';
import { CacheService } from './CacheService';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  renderTime: number;
  memoryUsage: number;
  batteryLevel?: number;
  networkInfo?: {
    type: string;
    effectiveType?: string;
    downlink?: number;
  };
  deviceInfo: {
    platform: string;
    model?: string;
    osVersion?: string;
  };
}

interface UserInteractionMetrics {
  interactionId: string;
  componentName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  additionalData?: Record<string, any>;
}

class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetrics;
  private userInteractions: Map<string, UserInteractionMetrics>;
  private cacheService: CacheService;
  private observer: any;
  private isMonitoring: boolean = false;

  private constructor() {
    this.metrics = {
      pageLoadTime: 0,
      apiResponseTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      deviceInfo: {
        platform: Platform.OS,
        model: Platform.OS === 'ios' ? 'iPhone' : 'Android',
        osVersion: Platform.Version.toString(),
      }
    };
    this.userInteractions = new Map();
    this.cacheService = CacheService.getInstance();
    
    // Inicializar o observer de performance se disponível
    if (typeof PerformanceObserver !== 'undefined') {
      this.setupPerformanceObserver();
    }
  }

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  /**
   * Configura o observer de performance para monitorar métricas automaticamente
   */
  private setupPerformanceObserver(): void {
    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          // Processar entradas de performance
          this.processPerformanceEntry(entry);
        });
      });

      // Observar diferentes tipos de métricas
      this.observer.observe({ entryTypes: ['measure', 'resource', 'navigation'] });
      this.isMonitoring = true;
    } catch (error) {
      console.error('Error setting up performance observer:', error);
    }
  }

  /**
   * Processa entradas de performance do observer
   */
  private processPerformanceEntry(entry: any): void {
    const { name, entryType, startTime, duration } = entry;

    // Registrar no Sentry para análise
    const transaction = startPerformanceTransaction(name, entryType);
    transaction.setData('duration', duration);
    transaction.setData('startTime', startTime);
    transaction.finish();

    // Armazenar métricas relevantes
    switch (entryType) {
      case 'navigation':
        this.metrics.pageLoadTime = duration;
        break;
      case 'resource':
        if (name.includes('/api/')) {
          this.metrics.apiResponseTime = duration;
        }
        break;
      case 'measure':
        if (name.includes('render')) {
          this.metrics.renderTime = duration;
        }
        break;
    }

    // Salvar métricas em cache para análise offline
    this.saveMetricsToCache();
  }

  /**
   * Inicia o monitoramento de performance da aplicação
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    // Marcar início da aplicação
    if (typeof performance !== 'undefined') {
      performance.mark('app_start');
    }

    // Configurar monitoramento de memória
    this.setupMemoryMonitoring();

    // Configurar monitoramento de rede
    this.setupNetworkMonitoring();

    // Configurar monitoramento de bateria se disponível
    this.setupBatteryMonitoring();

    this.isMonitoring = true;
  }

  /**
   * Configura monitoramento de uso de memória
   */
  private setupMemoryMonitoring(): void {
    // Verificar uso de memória periodicamente
    const memoryCheckInterval = setInterval(() => {
      if (typeof performance !== 'undefined' && performance.memory) {
        const memoryInfo = performance.memory;
        const usedMemory = memoryInfo.usedJSHeapSize;
        const totalMemory = memoryInfo.jsHeapSizeLimit;
        
        // Calcular porcentagem de uso
        const memoryUsagePercent = (usedMemory / totalMemory) * 100;
        this.metrics.memoryUsage = memoryUsagePercent;

        // Alertar se o uso de memória estiver acima do limite
        if (memoryUsagePercent > performanceConfig.performanceThresholds.memoryWarningThreshold) {
          this.reportPerformanceIssue('high_memory_usage', {
            memoryUsage: memoryUsagePercent,
            threshold: performanceConfig.performanceThresholds.memoryWarningThreshold
          });
        }
      }
    }, 30000); // Verificar a cada 30 segundos

    // Limpar intervalo quando o app for fechado
    return () => clearInterval(memoryCheckInterval);
  }

  /**
   * Configura monitoramento de rede
   */
  private setupNetworkMonitoring(): void {
    // Monitorar informações de rede se disponível
    if (typeof navigator !== 'undefined' && navigator.connection) {
      const connection = navigator.connection;
      
      this.metrics.networkInfo = {
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink
      };

      // Monitorar mudanças na conexão
      connection.addEventListener('change', () => {
        this.metrics.networkInfo = {
          type: connection.type,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink
        };
      });
    }
  }

  /**
   * Configura monitoramento de bateria
   */
  private setupBatteryMonitoring(): void {
    // Monitorar nível de bateria se disponível
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      navigator.getBattery().then(battery => {
        this.metrics.batteryLevel = battery.level * 100;

        // Monitorar mudanças no nível da bateria
        battery.addEventListener('levelchange', () => {
          this.metrics.batteryLevel = battery.level * 100;
        });
      });
    }
  }

  /**
   * Inicia o rastreamento de uma operação de performance
   * @param name Nome da operação
   * @param operation Tipo de operação
   * @returns ID da transação para finalização posterior
   */
  startOperation(name: string, operation: string): string {
    const operationId = `${name}_${Date.now()}`;
    
    // Iniciar marca de performance
    if (typeof performance !== 'undefined') {
      performance.mark(`${operationId}_start`);
    }
    
    // Iniciar transação no Sentry
    startPerformanceTransaction(name, operation);
    
    return operationId;
  }

  /**
   * Finaliza uma operação de performance e registra sua duração
   * @param operationId ID da operação retornado por startOperation
   * @param success Indica se a operação foi bem-sucedida
   * @param additionalData Dados adicionais para registrar
   */
  endOperation(operationId: string, success: boolean = true, additionalData?: Record<string, any>): void {
    if (typeof performance !== 'undefined') {
      // Marcar fim da operação
      performance.mark(`${operationId}_end`);
      
      // Medir duração entre início e fim
      performance.measure(
        operationId,
        `${operationId}_start`,
        `${operationId}_end`
      );
      
      // Obter a medição
      const entries = performance.getEntriesByName(operationId, 'measure');
      if (entries.length > 0) {
        const duration = entries[0].duration;
        
        // Registrar no Sentry
        const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
        if (transaction) {
          transaction.setData('duration', duration);
          transaction.setData('success', success);
          if (additionalData) {
            transaction.setData('additionalData', additionalData);
          }
          transaction.finish();
        }
        
        // Limpar marcas e medidas para economizar memória
        performance.clearMarks(`${operationId}_start`);
        performance.clearMarks(`${operationId}_end`);
        performance.clearMeasures(operationId);
      }
    }
  }

  /**
   * Rastreia uma interação do usuário
   * @param componentName Nome do componente
   * @param interactionType Tipo de interação
   * @param additionalData Dados adicionais
   * @returns ID da interação
   */
  trackUserInteraction(componentName: string, interactionType: string, additionalData?: Record<string, any>): string {
    const interactionId = `${componentName}_${interactionType}_${Date.now()}`;
    
    this.userInteractions.set(interactionId, {
      interactionId,
      componentName,
      startTime: Date.now(),
      success: false, // Será atualizado quando a interação for concluída
      additionalData
    });
    
    return interactionId;
  }

  /**
   * Finaliza o rastreamento de uma interação do usuário
   * @param interactionId ID da interação
   * @param success Indica se a interação foi bem-sucedida
   * @param additionalData Dados adicionais
   */
  completeUserInteraction(interactionId: string, success: boolean = true, additionalData?: Record<string, any>): void {
    const interaction = this.userInteractions.get(interactionId);
    
    if (interaction) {
      const endTime = Date.now();
      const duration = endTime - interaction.startTime;
      
      // Atualizar a interação
      this.userInteractions.set(interactionId, {
        ...interaction,
        endTime,
        duration,
        success,
        additionalData: {
          ...interaction.additionalData,
          ...additionalData
        }
      });
      
      // Registrar no Sentry
      const transaction = startPerformanceTransaction(
        `interaction_${interaction.componentName}`,
        'user-interaction'
      );
      
      transaction.setData('duration', duration);
      transaction.setData('success', success);
      transaction.setData('componentName', interaction.componentName);
      if (additionalData) {
        transaction.setData('additionalData', additionalData);
      }
      
      transaction.finish();
      
      // Verificar se a duração excede o limite aceitável
      if (duration > performanceConfig.performanceThresholds.renderTime * 10) {
        this.reportPerformanceIssue('slow_interaction', {
          interactionId,
          componentName: interaction.componentName,
          duration,
          threshold: performanceConfig.performanceThresholds.renderTime * 10
        });
      }
    }
  }

  /**
   * Rastreia o tempo de carregamento de uma página/tela
   * @param screenName Nome da tela
   * @param startTime Tempo de início (opcional, usa Date.now() se não fornecido)
   */
  trackScreenLoad(screenName: string, startTime?: number): string {
    const start = startTime || Date.now();
    const screenLoadId = `screen_load_${screenName}_${start}`;
    
    // Iniciar transação no Sentry
    startPerformanceTransaction(`screen_load_${screenName}`, 'navigation');
    
    // Armazenar tempo de início para cálculo posterior
    this.userInteractions.set(screenLoadId, {
      interactionId: screenLoadId,
      componentName: screenName,
      startTime: start,
      success: false
    });
    
    return screenLoadId;
  }

  /**
   * Finaliza o rastreamento de carregamento de uma tela
   * @param screenLoadId ID retornado por trackScreenLoad
   */
  completeScreenLoad(screenLoadId: string): void {
    const screenLoad = this.userInteractions.get(screenLoadId);
    
    if (screenLoad) {
      const endTime = Date.now();
      const duration = endTime - screenLoad.startTime;
      
      // Atualizar métricas
      this.metrics.pageLoadTime = duration;
      
      // Atualizar o registro de carregamento da tela
      this.userInteractions.set(screenLoadId, {
        ...screenLoad,
        endTime,
        duration,
        success: true
      });
      
      // Finalizar transação no Sentry
      const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
      if (transaction) {
        transaction.setData('duration', duration);
        transaction.setData('screenName', screenLoad.componentName);
        transaction.finish();
      }
      
      // Verificar se o tempo de carregamento excede o limite
      if (duration > performanceConfig.performanceThresholds.pageLoadTime) {
        this.reportPerformanceIssue('slow_screen_load', {
          screenName: screenLoad.componentName,
          duration,
          threshold: performanceConfig.performanceThresholds.pageLoadTime
        });
      }
    }
  }

  /**
   * Reporta um problema de performance
   * @param issueType Tipo do problema
   * @param data Dados do problema
   */
  private reportPerformanceIssue(issueType: string, data: Record<string, any>): void {
    if (__DEV__) {
      console.warn(`Performance Issue [${issueType}]:`, data);
    }
    
    // Reportar para Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `Performance issue: ${issueType}`,
      level: 'warning',
      data
    });
  }
}

// Instância singleton
export const performanceService = PerformanceService.getInstance();