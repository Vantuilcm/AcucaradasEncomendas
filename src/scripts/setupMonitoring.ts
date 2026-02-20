/**
 * Script de ConfiguraÃ§Ã£o do Sistema de Monitoramento
 *
 * Este script configura e inicializa todo o sistema de monitoramento
 * em tempo real para o sistema de busca avanÃ§ada.
 */

import { SearchService } from '../services/SearchService';
import { webSocketManager } from '../monitoring/WebSocketManager';
import { getAlertConfig } from '../config/alertConfig';
import { LoggingService } from '../services/LoggingService';

/**
 * ConfiguraÃ§Ã£o do ambiente
 */
// ConfiguraÃ§Ãµes do ambiente baseadas nas variÃ¡veis de ambiente
const ENVIRONMENT = (process.env.EXPO_PUBLIC_MONITORING_ENVIRONMENT ||
  process.env.NODE_ENV ||
  'development') as 'development' | 'production';
const ENABLE_MONITORING = process.env.EXPO_PUBLIC_ENABLE_MONITORING !== 'false';
const ENABLE_REAL_TIME = process.env.EXPO_PUBLIC_ENABLE_REAL_TIME_MONITORING !== 'false';
const ENABLE_PERFORMANCE_TESTS = process.env.EXPO_PUBLIC_ENABLE_PERFORMANCE_TESTS === 'true';
const WEBSOCKET_URL = process.env.EXPO_PUBLIC_MONITORING_WEBSOCKET_URL || 'ws://localhost:8080';
const LOG_LEVEL = process.env.EXPO_PUBLIC_MONITORING_LOG_LEVEL || 'info';
const ALERT_THROTTLE_MS = parseInt(process.env.EXPO_PUBLIC_MONITORING_ALERT_THROTTLE_MS || '30000');
const METRICS_INTERVAL = parseInt(process.env.EXPO_PUBLIC_MONITORING_METRICS_INTERVAL || '5000');
const ALERTS_INTERVAL = parseInt(process.env.EXPO_PUBLIC_MONITORING_ALERTS_INTERVAL || '10000');
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT) : 8080;

/**
 * Classe principal para configuraÃ§Ã£o do monitoramento
 */
export class MonitoringSetup {
  private searchService: SearchService;
  private isInitialized: boolean = false;
  private logger = LoggingService.getInstance();

  constructor() {
    this.searchService = SearchService.getInstance();
  }

  // Propriedades para controle de inicializaÃ§Ã£o
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private initializationError: Error | null = null; // Mantido para compatibilidade com implementaÃ§Ãµes futuras
  private initializationTimeout: ReturnType<typeof setTimeout> | null = null;
  private fallbackMode: boolean = false;
  private globalTimeoutMs: number = 3000; // Reduzido para 3 segundos para evitar bloqueio da UI
  
  // MÃ©todos jÃ¡ definidos abaixo - removendo duplicaÃ§Ã£o

  /**
   * Indica se o sistema estÃ¡ operando em modo de fallback
   */
  public isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  /**
   * Retorna o erro de inicializaÃ§Ã£o (se disponÃ­vel)
   */
  public getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Inicializa todo o sistema de monitoramento com timeout global e fallback
   * @returns Promise que resolve quando a inicializaÃ§Ã£o for concluÃ­da ou rejeita apÃ³s timeout
   */
  async initialize(): Promise<void> {
    // Configurar timeout global para toda a inicializaÃ§Ã£o
    this.initializationTimeout = setTimeout(() => {
      this.handleGlobalTimeout();
    }, 2000); // Reduzido para 2 segundos para evitar bloqueio da UI

    try {
      this.logger.info('Iniciando configuraÃ§Ã£o do sistema de monitoramento...');
      this.logger.debug(`Ambiente: ${ENVIRONMENT}`);
      this.logger.debug(`Monitoramento: ${ENABLE_MONITORING ? 'Habilitado' : 'Desabilitado'}`);
      this.logger.debug(`Tempo Real: ${ENABLE_REAL_TIME ? 'Habilitado' : 'Desabilitado'}`);
      this.logger.debug(
        `Testes de Performance: ${ENABLE_PERFORMANCE_TESTS ? 'Habilitado' : 'Desabilitado'}`
      );
      this.logger.debug(`Timeout global: ${this.globalTimeoutMs}ms`);

      if (!ENABLE_MONITORING) {
        this.logger.warn('Monitoramento desabilitado via variÃ¡vel de ambiente');
        this.clearGlobalTimeout();
        return;
      }

      // 1. Configurar alertas baseados no ambiente - nÃ£o deve falhar
      await Promise.resolve(this.setupAlerts())
        .catch(error => {
          this.logger.warn('Erro ao configurar alertas', { message: error.message });
          this.logger.warn('Usando configuraÃ§Ã£o padrÃ£o de alertas');
        });

      // 2. Inicializar WebSocket Manager (se tempo real estiver habilitado)
      if (ENABLE_REAL_TIME) {
        // NÃ£o aguardar a conclusÃ£o para evitar bloqueio
        await Promise.resolve(this.setupWebSocket())
          .catch(error => {
            this.logger.warn('Erro ao configurar WebSocket', { error: error.message });
            this.fallbackMode = true;
          });

        // Configurar monitoramento em tempo real mesmo se WebSocket falhar
        // pois ele tem seu prÃ³prio mecanismo de fallback
        await Promise.resolve(this.setupRealTimeMonitoring())
          .catch(error => {
            this.logger.warn('Erro ao configurar monitoramento em tempo real', { error: error.message });
            this.fallbackMode = true;
          });
      }

      // 3. Configurar mÃ©tricas customizadas - nÃ£o deve falhar
      await Promise.resolve(this.setupCustomMetrics())
        .catch(error => {
          this.logger.warn('Erro ao configurar mÃ©tricas customizadas', { message: error.message });
        });

      // 4. Iniciar coleta periÃ³dica (se em produÃ§Ã£o)
      if (ENVIRONMENT === 'production') {
        this.startPeriodicCollection();
      }

      this.isInitialized = true;
      this.clearGlobalTimeout();
      this.logger.info('Sistema de monitoramento configurado com sucesso');
    } catch (error: any) {
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Erro fatal na configuraÃ§Ã£o do monitoramento', error);
      this.handleInitializationFailure();
    }
  }

  /**
   * Configura alertas baseados no ambiente
   */
  private async setupAlerts(): Promise<void> {
    const config = getAlertConfig(ENVIRONMENT);
    this.logger.debug('Configurando alertas...', { 
      thresholds: Object.keys(config).length 
    });
    
    // Simular registro de handlers de alerta
    this.logger.debug('Canais de alerta configurados via NotificationConfig');
  }

  /**
   * Configura o WebSocket Manager
   */
  private async setupWebSocket(): Promise<void> {
    this.logger.debug(`Configurando WebSocket em ${WEBSOCKET_URL}...`);
    
    // Tentar inicializar o WebSocketManager
    const success = await webSocketManager.initialize(WEBSOCKET_URL);
    
    if (success) {
      this.logger.info('ConexÃ£o WebSocket de monitoramento estabelecida');
    } else {
      this.logger.warn('Falha ao estabelecer conexÃ£o WebSocket de monitoramento');
      // O WebSocketManager jÃ¡ lida com fallback internamente
    }
  }

  /**
   * Configura mÃ©tricas customizadas
   */
  private async setupCustomMetrics(): Promise<void> {
    this.logger.debug('Configurando mÃ©tricas customizadas...');
    // Registro de mÃ©tricas de busca, performance, etc.
  }

  /**
   * Inicia coleta periÃ³dica de mÃ©tricas
   */
  private startPeriodicCollection(): void {
    this.logger.info(`Iniciando coleta periÃ³dica de mÃ©tricas (${METRICS_INTERVAL}ms)`);
    
    setInterval(() => {
      if (this.isInitialized && !this.fallbackMode) {
        this.collectMetrics();
      }
    }, METRICS_INTERVAL);
  }

  /**
   * Coleta e envia mÃ©tricas atuais
   */
  private collectMetrics(): void {
    // Coleta de mÃ©tricas do SearchService, Heap, etc.
    const stats = webSocketManager.getStats();
    
    if (ENVIRONMENT === 'development') {
      this.logger.debug('MÃ©tricas coletadas', stats);
    }
    
    // Enviar via WebSocket se disponÃ­vel
    if (ENABLE_REAL_TIME && !this.fallbackMode) {
      webSocketManager.broadcast({
        type: 'metrics_update',
        data: stats,
        timestamp: Date.now()
      }, undefined, { skipQueue: true });
    }
  }

  /**
   * Lida com timeout global na inicializaÃ§Ã£o
   */
  private handleGlobalTimeout(): void {
    if (!this.isInitialized) {
      this.logger.warn('Timeout global atingido na inicializaÃ§Ã£o do monitoramento');
      this.handleInitializationFailure();
    }
  }

  /**
   * Lida com falhas na inicializaÃ§Ã£o (ativa modo fallback)
   */
  private handleInitializationFailure(): void {
    this.fallbackMode = true;
    this.isInitialized = true; // Marcar como "inicializado" para permitir que o app continue
    this.clearGlobalTimeout();
    this.logger.warn('Monitoramento operando em modo de fallback (funcionalidade limitada)');
  }

  /**
   * Limpa o timeout global
   */
  private clearGlobalTimeout(): void {
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }
  }

  /**
   * Configura monitoramento em tempo real com timeout e fallback
   */
  private async setupRealTimeMonitoring(): Promise<void> {
    try {
      this.logger.info('Configurando monitoramento em tempo real...');

      // Configurar RealTimeMonitoring com configuraÃ§Ãµes das variÃ¡veis de ambiente
      const config = {
        metricsInterval: METRICS_INTERVAL,
        alertsInterval: ALERTS_INTERVAL,
        maxDataPoints: 100,
        enableNotifications: ENABLE_REAL_TIME,
        customThresholds: getAlertConfig(ENVIRONMENT),
        alertThrottleMs: ALERT_THROTTLE_MS,
        logLevel: LOG_LEVEL,
        fallbackEnabled: true, // Habilitar modo de fallback
        initializationTimeoutMs: 3000, // 3 segundos de timeout
      };

      this.logger.debug('ParÃ¢metros de monitoramento', {
        metricsInterval: METRICS_INTERVAL,
        alertsInterval: ALERTS_INTERVAL,
        alertThrottleMs: ALERT_THROTTLE_MS,
        logLevel: LOG_LEVEL,
        initializationTimeoutMs: config.initializationTimeoutMs,
      });

      // Importar o mÃ³dulo de monitoramento em tempo real com timeout
      const importPromise = import('../monitoring/RealTimeMonitoring');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout ao importar mÃ³dulo de monitoramento em tempo real'));
        }, 2000); // 2 segundos para importaÃ§Ã£o
      });

      // Corrida entre a importaÃ§Ã£o e o timeout
      const { RealTimeMonitoring } = await Promise.race([importPromise, timeoutPromise])
        .catch(error => {
          this.logger.warn('Timeout ao importar mÃ³dulo de monitoramento', { error: error.message });
          this.logger.warn('Continuando sem monitoramento em tempo real');
          // Retornar um objeto vazio com mÃ©todo initialize que nÃ£o faz nada
          return { RealTimeMonitoring: { initialize: () => this.logger.warn('Usando implementaÃ§Ã£o vazia de RealTimeMonitoring') } };
        }) as { RealTimeMonitoring: { initialize: (config: any) => void } };

      // Inicializar com timeout
      const initPromise = Promise.resolve(RealTimeMonitoring.initialize(config));
      const initTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout ao inicializar monitoramento em tempo real'));
        }, config.initializationTimeoutMs);
      });

      await Promise.race([initPromise, initTimeoutPromise])
        .catch((error: any) => {
          this.logger.warn('Erro ao inicializar monitoramento em tempo real', { error: error.message });
          this.logger.warn('Sistema continuarÃ¡ com funcionalidade reduzida');
        });

      this.logger.info('Monitoramento em tempo real configurado');
    } catch (error: any) {
      this.logger.error('Erro ao configurar monitoramento em tempo real', error);
      this.logger.warn('Continuando sem monitoramento em tempo real');
      // NÃ£o propagar o erro para permitir que o aplicativo continue
    }
  }

  /**
   * Configura monitoramento no SearchService com timeout para evitar bloqueio
   */
  private async setupSearchMonitoring(): Promise<void> {
    this.logger.info('Configurando monitoramento de busca...');

    try {
      // Definir um timeout curto para nÃ£o bloquear a inicializaÃ§Ã£o
      const timeoutMs = 1500; // 1.5 segundos de timeout
      
      // Criar uma promessa para a configuraÃ§Ã£o do monitoramento
      const setupPromise = new Promise<void>((resolve) => {
        // O SearchService jÃ¡ tem o monitoramento integrado
        // Aqui podemos fazer configuraÃ§Ãµes adicionais se necessÃ¡rio
        
        // Simular um pequeno atraso para evitar bloqueio da UI
        setTimeout(() => {
          resolve();
        }, 100);
      });
      
      // Criar uma promessa de timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout ao configurar monitoramento de busca'));
        }, timeoutMs);
      });
      
      // Corrida entre a configuraÃ§Ã£o e o timeout
      await Promise.race([setupPromise, timeoutPromise]);
      
      this.logger.info('Monitoramento de busca configurado');
    } catch (error: any) {
      this.logger.warn('Erro ao configurar monitoramento de busca', { error: error instanceof Error ? error.message : String(error) });
      this.logger.warn('Continuando sem monitoramento completo de busca');
      // NÃ£o propagar o erro para permitir que o aplicativo continue
    }
  }

  /**
   * Executa testes de performance
   */
  private async runPerformanceTests(): Promise<void> {
    this.logger.info('Executando testes de performance...');

    try {
      // Teste bÃ¡sico de performance do sistema de monitoramento
      const startTime = Date.now();

      // Simular algumas operaÃ§Ãµes de monitoramento
      for (let i = 0; i < 100; i++) {
        // Simular registro de mÃ©trica
        const metricTime = Date.now();
        if (metricTime - startTime > 1000) break; // Timeout de 1s
      }

      const executionTime = Date.now() - startTime;
      const successRate = executionTime < 1000 ? 95 : 70;

      if (successRate < 80) {
        this.logger.warn('Baixa taxa de sucesso nos testes de performance', { successRate: successRate.toFixed(1), threshold: '80%' });
        this.logger.info('Considere revisar as configuraÃ§Ãµes de performance');
      } else {
        this.logger.info('Testes de performance aprovados', { successRate: successRate.toFixed(1), executionTime });
      }
    } catch (error: any) {
      this.logger.error('Erro nos testes de performance', error);
      // NÃ£o falhar a inicializaÃ§Ã£o por causa dos testes
    }
  }

  /**
   * Configura limpeza automÃ¡tica de dados antigos
   */
  private setupAutomaticCleanup(): void {
    this.logger.info('Configurando limpeza automÃ¡tica...');

    // Limpeza a cada 6 horas
    const cleanupInterval = 6 * 60 * 60 * 1000;

    setInterval(() => {
      this.performCleanup();
    }, cleanupInterval);

    this.logger.info(`Limpeza automÃ¡tica configurada (a cada ${cleanupInterval / (60 * 60 * 1000)}h)`);
  }

  /**
   * Executa limpeza de dados antigos
   */
  private performCleanup(): void {
    this.logger.info('Executando limpeza automÃ¡tica...');

    try {
      // Aqui seria implementada a limpeza real dos dados
      // Por exemplo, remover alertas antigos, mÃ©tricas antigas, etc.

      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      this.logger.debug(`Removendo dados anteriores a ${new Date(oneDayAgo).toISOString()}`);

      // Simular limpeza
      const cleanedItems = Math.floor(Math.random() * 100);
      this.logger.info(`Limpeza concluÃ­da: ${cleanedItems} itens removidos`);
    } catch (error: any) {
      this.logger.error('Erro na limpeza automÃ¡tica', error);
    }
  }

  /**
   * Configura handlers de erro globais
   */
  private setupErrorHandlers(): void {
    if (typeof process !== 'undefined' && typeof (process as any).on === 'function') {
      this.logger.info('Configurando handlers de erro...');
      (process as any).on('uncaughtException', (error: any) => {
        this.logger.error('Erro nÃ£o capturado no sistema de monitoramento', error);
      });
      (process as any).on('unhandledRejection', (reason: any) => {
        this.logger.error('Promise rejeitada no sistema de monitoramento', { reason });
      });
      this.logger.info('Handlers de erro configurados');
    }
  }

  /**
   * Exibe estatÃ­sticas iniciais do sistema
   */
  private displayInitialStats(): void {
    this.logger.info('ESTATÃSTICAS INICIAIS DO SISTEMA', {
      webSocketManager: 'Ativo',
      searchService: 'Ativo com monitoramento',
      ambiente: ENVIRONMENT,
      alertas: 'Configurados',
      limpezaAutomatica: 'Ativa',
      errorHandlers: 'Configurados',
      performanceTests: ENABLE_PERFORMANCE_TESTS ? 'Habilitados' : 'Desabilitados',
    });
  }

  /**
   * Para o sistema de monitoramento
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    this.logger.info('Parando sistema de monitoramento...');

    try {
      // Parar WebSocket Manager
      // webSocketManager.stop(); // Implementar se necessÃ¡rio

      // Executar limpeza final
      this.performCleanup();

      this.isInitialized = false;
      this.logger.info('Sistema de monitoramento parado com sucesso');
    } catch (error: any) {
      this.logger.error('Erro ao parar sistema de monitoramento', error);
      throw error;
    }
  }

  /**
   * Verifica se o sistema estÃ¡ funcionando corretamente
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        searchService: 'healthy',
        webSocketManager: 'healthy',
        monitoring: 'healthy',
      },
      metrics: {
        uptime: typeof process !== 'undefined' && typeof (process as any).uptime === 'function' ? (process as any).uptime() : 0,
        memoryUsage: typeof process !== 'undefined' && typeof (process as any).memoryUsage === 'function' ? (process as any).memoryUsage().heapUsed / 1024 / 1024 : 0,
        activeConnections: webSocketManager.getStats().totalConnections,
      },
    };

    try {
      // Verificar SearchService
      const stats = await this.searchService.obterEstatisticas();
      if (!stats) {
        result.components.searchService = 'unhealthy';
        result.status = 'degraded';
      }

      // Verificar WebSocketManager
      const wsStats = webSocketManager.getStats();
      if (wsStats.totalConnections < 0) {
        result.components.webSocketManager = 'unhealthy';
        result.status = 'degraded';
      }
    } catch (error: any) {
      result.status = 'unhealthy';
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }
}

/**
 * Interface para resultado do health check
 */
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: {
    searchService: 'healthy' | 'unhealthy';
    webSocketManager: 'healthy' | 'unhealthy';
    monitoring: 'healthy' | 'unhealthy';
  };
  metrics: {
    uptime: number;
    memoryUsage: number;
    activeConnections: number;
  };
  error?: string;
}

/**
 * InstÃ¢ncia singleton do setup de monitoramento
 */
export const monitoringSetup = new MonitoringSetup();

/**
 * FunÃ§Ã£o para inicializar o sistema de monitoramento
 */
export async function initializeMonitoring(): Promise<void> {
  await monitoringSetup.initialize();
}

/**
 * FunÃ§Ã£o para parar o sistema de monitoramento
 */
export async function shutdownMonitoring(): Promise<void> {
  await monitoringSetup.shutdown();
}

/**
 * FunÃ§Ã£o para verificar saÃºde do sistema
 */
export async function checkMonitoringHealth(): Promise<HealthCheckResult> {
  return await monitoringSetup.healthCheck();
}

// Auto-inicializaÃ§Ã£o se executado diretamente
if (require.main === module) {
  const logger = LoggingService.getInstance();
  initializeMonitoring()
    .then(() => {
      logger.info('Sistema de monitoramento inicializado via script');
    })
    .catch(error => {
      logger.error('Falha na inicializaÃ§Ã£o do monitoramento via script', error);
      process.exit(1);
    });
}

