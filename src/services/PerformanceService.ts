import { Platform } from 'react-native';
import { performanceConfig } from '../config/performance';
import CacheService from './cacheService';

const performance = typeof window !== 'undefined' ? window.performance : undefined;
const PerformanceObserver = typeof window !== 'undefined' ? (window as any).PerformanceObserver : undefined;

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

export class PerformanceService {
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
    if (!PerformanceObserver) return;
    try {
      this.observer = new PerformanceObserver((list: any) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.processPerformanceEntry(entry);
        });
      });

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
    const { name, entryType, duration } = entry;

    // Registrar no log para análise em desenvolvimento
    if (__DEV__) {
      console.log(`[Performance] ${name} (${entryType}): ${duration}ms`);
    }

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
    setInterval(() => {
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        const usedMemory = Number(memoryInfo?.usedJSHeapSize ?? 0);
        const totalMemory = Number(memoryInfo?.jsHeapSizeLimit ?? 0);

        if (totalMemory > 0) {
          const memoryUsagePercent = (usedMemory / totalMemory) * 100;
          this.metrics.memoryUsage = memoryUsagePercent;

          if (memoryUsagePercent > performanceConfig.performanceThresholds.memoryWarningThreshold) {
            this.reportPerformanceIssue('high_memory_usage', {
              memoryUsage: memoryUsagePercent,
              threshold: performanceConfig.performanceThresholds.memoryWarningThreshold
            });
          }
        }
      }
    }, 30000);
  }

  /**
   * Configura monitoramento de rede
   */
  private setupNetworkMonitoring(): void {
    // Monitorar informações de rede se disponível
    if (typeof navigator !== 'undefined') {
      const connection = (navigator as any).connection;
      if (!connection) return;

      this.metrics.networkInfo = {
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink
      };

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
    if (typeof navigator !== 'undefined') {
      const getBattery = (navigator as any).getBattery;
      if (!getBattery) return;

      (navigator as any).getBattery().then((battery: any) => {
        this.metrics.batteryLevel = battery.level * 100;

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
  startOperation(name: string, _operation: string): string {
    const operationId = `${name}_${Date.now()}`;
    
    // Iniciar marca de performance
    if (typeof performance !== 'undefined') {
      performance.mark(`${operationId}_start`);
    }
    
    return operationId;
  }

  /**
   * Finaliza uma operação de performance e registra sua duração
   * @param operationId ID da operação retornado por startOperation
   * @param success Indica se a operação foi bem-sucedida
   * @param additionalData Dados adicionais para registrar
   */
  endOperation(operationId: string, _success: boolean = true, _additionalData?: Record<string, any>): void {
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
        
        // Registrar em log de desenvolvimento
        if (__DEV__) {
          console.log(`[Performance] Operation ${operationId} duration: ${duration}ms`);
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
      
      // Registrar no log de desenvolvimento
      if (__DEV__) {
        console.log(`[Performance] Interaction ${interaction.componentName} duration: ${duration}ms`);
      }
      
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
      
      // Registrar no log de desenvolvimento
      if (__DEV__) {
        console.log(`[Performance] Screen ${screenLoad.componentName} load duration: ${duration}ms`);
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
  }

  /**
   * Obtém as métricas atuais de performance
   * @returns Métricas de performance
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  private saveMetricsToCache(): void {
    const cache = this.cacheService as any;
    if (cache?.set) {
      cache.set('performance_metrics', this.metrics);
      return;
    }
    if (cache?.save) {
      cache.save('performance_metrics', this.metrics);
    }
  }
}

// Instância singleton
export const performanceService = PerformanceService.getInstance();
