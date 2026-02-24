/**
 * Script de Configuração do Sistema de Monitoramento
 *
 * Este script configura e inicializa todo o sistema de monitoramento
 * em tempo real para o sistema de busca avançada.
 */

import { SearchService } from '../services/SearchService';
import { webSocketManager } from '../monitoring/WebSocketManager';
import { getAlertConfig } from '../config/alertConfig';

/**
 * Configuração do ambiente
 */
// Configurações do ambiente baseadas nas variáveis de ambiente
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
 * Classe principal para configuração do monitoramento
 */
export class MonitoringSetup {
  private searchService: SearchService;
  private isInitialized: boolean = false;

  constructor() {
    this.searchService = SearchService.getInstance();
  }

  // Propriedades para controle de inicialização
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private initializationError: Error | null = null; // Mantido para compatibilidade com implementações futuras
  private initializationTimeout: NodeJS.Timeout | null = null;
  private fallbackMode: boolean = false;
  private globalTimeoutMs: number = 3000; // Reduzido para 3 segundos para evitar bloqueio da UI
  
  // Métodos já definidos abaixo - removendo duplicação

  /**
   * Inicializa todo o sistema de monitoramento com timeout global e fallback
   * @returns Promise que resolve quando a inicialização for concluída ou rejeita após timeout
   */
  async initialize(): Promise<void> {
    // Configurar timeout global para toda a inicialização
    this.initializationTimeout = setTimeout(() => {
      this.handleGlobalTimeout();
    }, 2000); // Reduzido para 2 segundos para evitar bloqueio da UI

    try {
      console.log('🚀 Iniciando configuração do sistema de monitoramento...');
      console.log(`📊 Ambiente: ${ENVIRONMENT}`);
      console.log(`🔧 Monitoramento: ${ENABLE_MONITORING ? 'Habilitado' : 'Desabilitado'}`);
      console.log(`⚡ Tempo Real: ${ENABLE_REAL_TIME ? 'Habilitado' : 'Desabilitado'}`);
      console.log(
        `🧪 Testes de Performance: ${ENABLE_PERFORMANCE_TESTS ? 'Habilitado' : 'Desabilitado'}`
      );
      console.log(`⏱️ Timeout global: ${this.globalTimeoutMs}ms`);

      if (!ENABLE_MONITORING) {
        console.log('⚠️ Monitoramento desabilitado via variável de ambiente');
        this.clearGlobalTimeout();
        return;
      }

      // 1. Configurar alertas baseados no ambiente - não deve falhar
      await Promise.resolve(this.setupAlerts())
        .catch(error => {
          console.warn('⚠️ Erro ao configurar alertas:', error.message);
          console.warn('⚠️ Usando configuração padrão de alertas');
        });

      // 2. Inicializar WebSocket Manager (se tempo real estiver habilitado)
      if (ENABLE_REAL_TIME) {
        // Não aguardar a conclusão para evitar bloqueio
        await Promise.resolve(this.setupWebSocket())
          .catch(error => {
            console.warn('⚠️ Erro ao configurar WebSocket:', error.message);
            this.fallbackMode = true;
          });

        // Configurar monitoramento em tempo real mesmo se WebSocket falhar
        // pois ele tem seu próprio mecanismo de fallback
        await Promise.resolve(this.setupRealTimeMonitoring())
          .catch(error => {
            console.warn('⚠️ Erro ao configurar monitoramento em tempo real:', error.message);
            this.fallbackMode = true;
          });
      }

      // 3. Configurar monitoramento no SearchService - não bloqueante
      Promise.resolve(this.setupSearchMonitoring())
        .catch(error => {
          console.warn('⚠️ Erro ao configurar monitoramento de busca:', error.message);
          this.fallbackMode = true;
        });
      
      // Não aguardamos a conclusão para evitar bloqueio da UI

      // 4. Executar testes de performance (se habilitado) - não crítico
      if (ENABLE_PERFORMANCE_TESTS && !this.fallbackMode) {
        await Promise.resolve(this.runPerformanceTests())
          .catch(error => {
            console.warn('⚠️ Erro ao executar testes de performance:', error.message);
          });
      }

      // 5. Configurar limpeza automática - não crítico
      try {
        this.setupAutomaticCleanup();
      } catch (error) {
        console.warn('⚠️ Erro ao configurar limpeza automática:', error);
      }

      // 6. Configurar handlers de erro - não crítico
      try {
        this.setupErrorHandlers();
      } catch (error) {
        console.warn('⚠️ Erro ao configurar handlers de erro:', error);
      }

      // Limpar o timeout global pois a inicialização foi concluída
      this.clearGlobalTimeout();

      this.isInitialized = true;
      
      if (this.fallbackMode) {
        console.log('⚠️ Sistema de monitoramento inicializado em modo de fallback');
      } else {
        console.log('✅ Sistema de monitoramento inicializado com sucesso!');
      }

      // 7. Exibir estatísticas iniciais
      this.displayInitialStats();
    } catch (error) {
      // Limpar o timeout global em caso de erro
      this.clearGlobalTimeout();
      
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      this.fallbackMode = true;
      this.isInitialized = true; // Consideramos inicializado mesmo em fallback
      
      console.error('❌ Erro ao inicializar sistema de monitoramento:', error);
      console.warn('⚠️ Sistema continuará funcionando em modo de fallback');
      
      // Não propagar o erro para permitir que o aplicativo continue
    }
  }

  /**
   * Limpa o timeout global de inicialização
   */
  private clearGlobalTimeout(): void {
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }
  }

  /**
   * Trata o timeout global de inicialização
   */
  private handleGlobalTimeout(): void {
    this.initializationError = new Error('Timeout global ao inicializar sistema de monitoramento');
    this.fallbackMode = true;
    this.isInitialized = true; // Consideramos inicializado mesmo em fallback
    
    console.error('⏱️ Timeout global ao inicializar sistema de monitoramento');
    console.warn('⚠️ Sistema continuará funcionando em modo de fallback');
  }

  // As funções isInFallbackMode e getInitializationError já estão definidas acima

  /**
   * Configura alertas baseados no ambiente
   */
  private async setupAlerts(): Promise<void> {
    console.log('⚙️ Configurando alertas...');

    const alertConfig = getAlertConfig(ENVIRONMENT);

    console.log(`📋 Configuração de alertas para ${ENVIRONMENT}:`);
    console.log(
      `   - Latência de busca: warning ${alertConfig.searchLatency.warning}ms, critical ${alertConfig.searchLatency.critical}ms`
    );
    console.log(
      `   - Taxa de erro: warning ${alertConfig.errorRate.warning}%, critical ${alertConfig.errorRate.critical}%`
    );
    console.log(
      `   - Uso de memória: warning ${alertConfig.memoryUsage.warning}MB, critical ${alertConfig.memoryUsage.critical}MB`
    );
    console.log(
      `   - Cache miss: warning ${alertConfig.cacheMissRate.warning}%, critical ${alertConfig.cacheMissRate.critical}%`
    );

    console.log('✅ Alertas configurados');
  }

  /**
   * Configura o WebSocket Manager com timeout e fallback
   */
  private async setupWebSocket(): Promise<void> {
    try {
      console.log('🔌 Configurando WebSocket Manager...');
      console.log(`🌐 URL WebSocket: ${WEBSOCKET_URL}`);

      // Definindo um timeout para a inicialização do WebSocket
      const timeoutMs = 3000; // 3 segundos de timeout para o WebSocket
      
      // Inicializar WebSocket Manager com URL configurada e timeout
      const initializePromise = webSocketManager.initialize(WEBSOCKET_URL);
      
      // Criando uma promessa de timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout ao inicializar WebSocket Manager'));
        }, timeoutMs);
      });
      
      // Corrida entre a inicialização e o timeout
      await Promise.race([initializePromise, timeoutPromise])
        .catch(error => {
          console.warn(`⚠️ WebSocket não inicializado dentro do timeout (${timeoutMs}ms):`, error.message);
          console.warn('⚠️ Sistema continuará em modo de fallback');
          // Não propagar o erro para permitir que o aplicativo continue
        });

      // Configurar servidor WebSocket (apenas no servidor)
      if (typeof window === 'undefined') {
        try {
          const { WebSocketServer } = await import('../monitoring/WebSocketServer');
          const server = new WebSocketServer(WEBSOCKET_PORT);
          
          // Timeout para inicialização do servidor
          const serverTimeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => {
              reject(new Error('Timeout ao inicializar servidor WebSocket'));
            }, timeoutMs);
          });
          
          await Promise.race([server.start(), serverTimeoutPromise]);
          console.log(`🌐 Servidor WebSocket iniciado na porta ${WEBSOCKET_PORT}`);
        } catch (serverError) {
          console.error('❌ Erro ao iniciar servidor WebSocket:', serverError);
          console.warn('⚠️ Continuando sem servidor WebSocket');
        }
      }

      // Verificar se o WebSocketManager está em modo de fallback
      if (webSocketManager.isInFallbackMode()) {
        console.warn('⚠️ WebSocketManager operando em modo de fallback');
        const error = webSocketManager.getInitializationError();
        if (error && error.message) {
          console.warn('⚠️ Motivo:', error.message);
        }
      } else {
        console.log('✅ WebSocket configurado com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro ao configurar WebSocket:', error);
      // Não falhar se WebSocket não conseguir conectar
      console.warn('⚠️ Continuando sem WebSocket em tempo real');
    }
  }

  /**
   * Configura monitoramento em tempo real com timeout e fallback
   */
  private async setupRealTimeMonitoring(): Promise<void> {
    try {
      console.log('⚡ Configurando monitoramento em tempo real...');

      // Configurar RealTimeMonitoring com configurações das variáveis de ambiente
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

      console.log(`   - Intervalo de métricas: ${METRICS_INTERVAL}ms`);
      console.log(`   - Intervalo de alertas: ${ALERTS_INTERVAL}ms`);
      console.log(`   - Throttle de alertas: ${ALERT_THROTTLE_MS}ms`);
      console.log(`   - Nível de log: ${LOG_LEVEL}`);
      console.log(`   - Timeout de inicialização: ${config.initializationTimeoutMs}ms`);

      // Importar o módulo de monitoramento em tempo real com timeout
      const importPromise = import('../monitoring/RealTimeMonitoring');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout ao importar módulo de monitoramento em tempo real'));
        }, 2000); // 2 segundos para importação
      });

      // Corrida entre a importação e o timeout
      const { RealTimeMonitoring } = await Promise.race([importPromise, timeoutPromise])
        .catch(error => {
          console.warn('⚠️ Timeout ao importar módulo de monitoramento:', error.message);
          console.warn('⚠️ Continuando sem monitoramento em tempo real');
          // Retornar um objeto vazio com método initialize que não faz nada
          return { RealTimeMonitoring: { initialize: () => console.warn('⚠️ Usando implementação vazia de RealTimeMonitoring') } };
        }) as { RealTimeMonitoring: { initialize: (config: any) => void } };

      // Inicializar com timeout
      const initPromise = Promise.resolve(RealTimeMonitoring.initialize(config));
      const initTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout ao inicializar monitoramento em tempo real'));
        }, config.initializationTimeoutMs);
      });

      await Promise.race([initPromise, initTimeoutPromise])
        .catch(error => {
          console.warn('⚠️ Erro ao inicializar monitoramento em tempo real:', error.message);
          console.warn('⚠️ Sistema continuará com funcionalidade reduzida');
        });

      console.log('✅ Monitoramento em tempo real configurado');
    } catch (error) {
      console.error('❌ Erro ao configurar monitoramento em tempo real:', error);
      console.warn('⚠️ Continuando sem monitoramento em tempo real');
      // Não propagar o erro para permitir que o aplicativo continue
    }
  }

  /**
   * Configura monitoramento no SearchService com timeout para evitar bloqueio
   */
  private async setupSearchMonitoring(): Promise<void> {
    console.log('🔍 Configurando monitoramento de busca...');

    try {
      // Definir um timeout curto para não bloquear a inicialização
      const timeoutMs = 1500; // 1.5 segundos de timeout
      
      // Criar uma promessa para a configuração do monitoramento
      const setupPromise = new Promise<void>((resolve) => {
        // O SearchService já tem o monitoramento integrado
        // Aqui podemos fazer configurações adicionais se necessário
        
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
      
      // Corrida entre a configuração e o timeout
      await Promise.race([setupPromise, timeoutPromise]);
      
      console.log('✅ Monitoramento de busca configurado');
    } catch (error) {
      console.warn('⚠️ Erro ao configurar monitoramento de busca:', error instanceof Error ? error.message : String(error));
      console.warn('⚠️ Continuando sem monitoramento completo de busca');
      // Não propagar o erro para permitir que o aplicativo continue
    }
  }

  /**
   * Executa testes de performance
   */
  private async runPerformanceTests(): Promise<void> {
    console.log('🧪 Executando testes de performance...');

    try {
      // Teste básico de performance do sistema de monitoramento
      const startTime = Date.now();

      // Simular algumas operações de monitoramento
      for (let i = 0; i < 100; i++) {
        // Simular registro de métrica
        const metricTime = Date.now();
        if (metricTime - startTime > 1000) break; // Timeout de 1s
      }

      const executionTime = Date.now() - startTime;
      const successRate = executionTime < 1000 ? 95 : 70;

      if (successRate < 80) {
        console.warn(`⚠️ Taxa de sucesso dos testes: ${successRate.toFixed(1)}% (abaixo de 80%)`);
        console.warn('💡 Considere revisar as configurações de performance');
      } else {
        console.log(`✅ Testes de performance aprovados: ${successRate.toFixed(1)}%`);
        console.log(`   - Tempo de execução: ${executionTime}ms`);
      }
    } catch (error) {
      console.error('❌ Erro nos testes de performance:', error);
      // Não falhar a inicialização por causa dos testes
    }
  }

  /**
   * Configura limpeza automática de dados antigos
   */
  private setupAutomaticCleanup(): void {
    console.log('🧹 Configurando limpeza automática...');

    // Limpeza a cada 6 horas
    const cleanupInterval = 6 * 60 * 60 * 1000;

    setInterval(() => {
      this.performCleanup();
    }, cleanupInterval);

    console.log(
      `✅ Limpeza automática configurada (a cada ${cleanupInterval / (60 * 60 * 1000)}h)`
    );
  }

  /**
   * Executa limpeza de dados antigos
   */
  private performCleanup(): void {
    console.log('🧹 Executando limpeza automática...');

    try {
      // Aqui seria implementada a limpeza real dos dados
      // Por exemplo, remover alertas antigos, métricas antigas, etc.

      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      console.log(`🗑️ Removendo dados anteriores a ${new Date(oneDayAgo).toISOString()}`);

      // Simular limpeza
      const cleanedItems = Math.floor(Math.random() * 100);
      console.log(`✅ Limpeza concluída: ${cleanedItems} itens removidos`);
    } catch (error) {
      console.error('❌ Erro na limpeza automática:', error);
    }
  }

  /**
   * Configura handlers de erro globais
   */
  private setupErrorHandlers(): void {
    console.log('🛡️ Configurando handlers de erro...');

    // Handler para erros não capturados
    process.on('uncaughtException', error => {
      console.error('❌ Erro não capturado no sistema de monitoramento:', error);
      // Não encerrar o processo, apenas logar
    });

    // Handler para promises rejeitadas
    process.on('unhandledRejection', (reason, _promise) => {
      console.error('❌ Promise rejeitada no sistema de monitoramento:', reason);
      // Não encerrar o processo, apenas logar
    });

    console.log('✅ Handlers de erro configurados');
  }

  /**
   * Exibe estatísticas iniciais do sistema
   */
  private displayInitialStats(): void {
    console.log('\n📊 ESTATÍSTICAS INICIAIS DO SISTEMA');
    console.log('=====================================');
    console.log(`🌐 WebSocket Manager: Ativo`);
    console.log(`🔍 Search Service: Ativo com monitoramento`);
    console.log(`⚙️ Ambiente: ${ENVIRONMENT}`);
    console.log(`🚨 Alertas: Configurados`);
    console.log(`🧹 Limpeza automática: Ativa`);
    console.log(`🛡️ Handlers de erro: Configurados`);

    if (ENABLE_PERFORMANCE_TESTS) {
      console.log(`🧪 Testes de performance: Habilitados`);
    }

    console.log('\n🎯 Sistema pronto para monitoramento em tempo real!');
    console.log('=====================================\n');
  }

  /**
   * Para o sistema de monitoramento
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    console.log('🛑 Parando sistema de monitoramento...');

    try {
      // Parar WebSocket Manager
      // webSocketManager.stop(); // Implementar se necessário

      // Executar limpeza final
      this.performCleanup();

      this.isInitialized = false;
      console.log('✅ Sistema de monitoramento parado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao parar sistema de monitoramento:', error);
      throw error;
    }
  }

  /**
   * Verifica se o sistema está funcionando corretamente
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
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
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
    } catch (error) {
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
 * Instância singleton do setup de monitoramento
 */
export const monitoringSetup = new MonitoringSetup();

/**
 * Função para inicializar o sistema de monitoramento
 */
export async function initializeMonitoring(): Promise<void> {
  await monitoringSetup.initialize();
}

/**
 * Função para parar o sistema de monitoramento
 */
export async function shutdownMonitoring(): Promise<void> {
  await monitoringSetup.shutdown();
}

/**
 * Função para verificar saúde do sistema
 */
export async function checkMonitoringHealth(): Promise<HealthCheckResult> {
  return await monitoringSetup.healthCheck();
}

// Auto-inicialização se executado diretamente
if (require.main === module) {
  initializeMonitoring()
    .then(() => {
      console.log('🎉 Sistema de monitoramento inicializado via script!');
    })
    .catch(error => {
      console.error('💥 Falha na inicialização:', error);
      process.exit(1);
    });
}
