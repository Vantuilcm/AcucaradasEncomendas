import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { performanceConfig } from '../config/performance';
import { startPerformanceTransaction } from '../config/sentry';
import cacheService from './CacheServiceOptimized';
import { LoggingService } from './LoggingService';

const logger = LoggingService.getInstance();

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
    osVersion: string;
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

interface OperationMetrics {
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface PerformanceData {
  operations: Map<string, OperationMetrics[]>;
  totalOperations: number;
  failedOperations: number;
  averageResponseTime: number;
}

export class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetrics;
  private userInteractions: Map<string, UserInteractionMetrics>;
  private cacheService: typeof cacheService;
  private isMonitoring: boolean = false;
  private readonly MAX_OPERATIONS = 1000;
  private readonly CACHE_KEY = 'performance_metrics';
  private operationStarts: Map<string, number>;
  private transactions: Map<string, any>;

  constructor() {
    this.cacheService = cacheService;
    this.userInteractions = new Map();
    this.operationStarts = new Map();
    this.transactions = new Map();
    this.metrics = {
      pageLoadTime: 0,
      apiResponseTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      deviceInfo: {
        platform: Platform.OS,
        model: Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android'),
        osVersion: String(Platform.Version),
      },
    };
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
  private updateNetworkInfo(): void {
    NetInfo.fetch().then((state) => {
      this.metrics.networkInfo = {
        type: state.type,
        effectiveType: (state.details as any)?.cellularGeneration,
        downlink: (state.details as any)?.downlink,
      } as any;
    });
    NetInfo.addEventListener((state) => {
      this.metrics.networkInfo = {
        type: state.type,
        effectiveType: (state.details as any)?.cellularGeneration,
        downlink: (state.details as any)?.downlink,
      } as any;
    });
  }

  /**
   * Inicia o monitoramento de performance da aplicação
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    const isTestEnv =
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
    if (isTestEnv) return;
    this.updateNetworkInfo();
    this.setupMemoryMonitoring();
    this.isMonitoring = true;
  }

  /**
   * Configura monitoramento de uso de memória
   */
  private setupMemoryMonitoring(): void {
    const memoryCheckInterval = setInterval(() => {
      const perfAny = (globalThis as any).performance;
      if (perfAny && perfAny.memory) {
        const memoryInfo = perfAny.memory;
        const usedMemory = memoryInfo.usedJSHeapSize;
        const totalMemory = memoryInfo.jsHeapSizeLimit;
        
        const memoryUsagePercent = (usedMemory / totalMemory) * 100;
        this.metrics.memoryUsage = memoryUsagePercent;
        if (memoryUsagePercent > performanceConfig.performanceThresholds.memoryWarningThreshold) {
          this.reportPerformanceIssue('high_memory_usage', {
            memoryUsage: memoryUsagePercent,
            threshold: performanceConfig.performanceThresholds.memoryWarningThreshold
          });
        }
      }
    }, 30000);
  }

  /**
   * Configura monitoramento de rede
   */
  private setupNetworkMonitoring(): void {
    // Monitorar informações de rede se disponível
    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      const connection = (navigator as any).connection;
      
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
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
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
    this.operationStarts.set(operationId, Date.now());
    const transaction = startPerformanceTransaction(name, operation);
    this.transactions.set(operationId, transaction);
    return operationId;
  }

  /**
   * Finaliza uma operação de performance e registra sua duração
   * @param operationId ID da operação retornado por startOperation
   * @param success Indica se a operação foi bem-sucedida
   * @param additionalData Dados adicionais para registrar
   */
  endOperation(operationId: string, success: boolean = true, additionalData?: Record<string, any>): void {
    const start = this.operationStarts.get(operationId);
    const duration = start ? Date.now() - start : 0;
    const transaction = this.transactions.get(operationId);
    if (transaction) {
      transaction.setData('duration', duration);
      transaction.setData('success', success);
      if (additionalData) {
        transaction.setData('additionalData', additionalData);
      }
      transaction.finish();
      this.transactions.delete(operationId);
    }
    this.operationStarts.delete(operationId);
  }

  trackOperation<T>(name: string, callback: () => T): T;
  trackOperation<T>(name: string, callback: () => Promise<T>): Promise<T | null>;
  trackOperation<T>(name: string, callback: (() => T) | (() => Promise<T>)): T | Promise<T | null> {
    const opId = this.startOperation(name, 'operation');
    try {
      const result = (callback as any)();
      if (result && typeof (result as any).then === 'function') {
        return (result as Promise<T>)
          .then((value) => {
            this.endOperation(opId, true);
            return value;
          })
          .catch((e: any) => {
            this.endOperation(opId, false, { error: String(e?.message || e) });
            return null;
          });
      }
      this.endOperation(opId, true);
      return result as T;
    } catch (e: any) {
      this.endOperation(opId, false, { error: String(e?.message || e) });
      // Para caminho síncrono, retornar valor neutro
      return null as any;
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
      
      const transaction = startPerformanceTransaction(`screen_load_${screenLoad.componentName}`, 'navigation');
      transaction.setData('duration', duration);
      transaction.setData('screenName', screenLoad.componentName);
      transaction.finish();
      
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
    logger.warn(`Performance issue: ${issueType}`, {
      issueType,
      severity: 'warning',
      ...data,
    });
  }

  /**
   * Salva métricas de performance em cache para análise offline
   */
  private async saveMetricsToCache(): Promise<void> {
    try {
      const ttlMs = 6 * 60 * 60 * 1000;
      await this.cacheService.set(this.CACHE_KEY, this.metrics, ttlMs);
    } catch (error: any) {
      logger.warn('Falha ao salvar métricas de performance no cache', error);
    }
  }

  /**
   * Recupera métricas de performance do cache
   */
  async getCachedMetrics(): Promise<PerformanceMetrics | null> {
    try {
      return await this.cacheService.get<PerformanceMetrics>(this.CACHE_KEY);
    } catch (error: any) {
      logger.warn('Falha ao recuperar métricas de performance do cache', error);
      return null;
    }
  }

  /**
   * Obtém as métricas atuais
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Limpa as métricas
   */
  clearMetrics(): void {
    this.metrics = {
      pageLoadTime: 0,
      apiResponseTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      deviceInfo: {
        platform: Platform.OS,
        model: Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android'),
        osVersion: String(Platform.Version),
      }
    };
  }

  
}




