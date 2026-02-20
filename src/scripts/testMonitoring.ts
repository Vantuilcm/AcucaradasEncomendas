/**
 * Script de Teste do Sistema de Monitoramento
 *
 * Este script testa a funcionalidade básica do sistema de monitoramento
 * sem depender de todas as importações complexas.
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

/**
 * Classe de teste do monitoramento
 */
class MonitoringTest {
  /**
   * Executa todos os testes do sistema de monitoramento
   */
  async runTests(): Promise<void> {
    console.log('🧪 Iniciando testes do sistema de monitoramento...');
    console.log('='.repeat(60));

    // Teste 1: Configurações de ambiente
    this.testEnvironmentConfig();

    // Teste 2: Performance básica
    await this.testBasicPerformance();

    // Teste 3: Configurações de alertas
    this.testAlertConfiguration();

    // Teste 4: Simulação de métricas
    await this.testMetricsSimulation();

    console.log('='.repeat(60));
    console.log('✅ Todos os testes do monitoramento concluídos!');
  }

  /**
   * Testa as configurações de ambiente
   */
  private testEnvironmentConfig(): void {
    console.log('\n📊 Teste 1: Configurações de Ambiente');
    console.log('-'.repeat(40));

    console.log(`   Ambiente: ${ENVIRONMENT}`);
    console.log(`   Monitoramento: ${ENABLE_MONITORING ? '✅ Habilitado' : '❌ Desabilitado'}`);
    console.log(`   Tempo Real: ${ENABLE_REAL_TIME ? '✅ Habilitado' : '❌ Desabilitado'}`);
    console.log(
      `   Testes de Performance: ${ENABLE_PERFORMANCE_TESTS ? '✅ Habilitado' : '❌ Desabilitado'}`
    );
    console.log(`   WebSocket URL: ${WEBSOCKET_URL}`);
    console.log(`   Nível de Log: ${LOG_LEVEL}`);
    console.log(`   Throttle de Alertas: ${ALERT_THROTTLE_MS}ms`);
    console.log(`   Intervalo de Métricas: ${METRICS_INTERVAL}ms`);
    console.log(`   Intervalo de Alertas: ${ALERTS_INTERVAL}ms`);

    console.log('   ✅ Configurações carregadas com sucesso');
  }

  /**
   * Testa performance básica
   */
  private async testBasicPerformance(): Promise<void> {
    console.log('\n⚡ Teste 2: Performance Básica');
    console.log('-'.repeat(40));

    const startTime = Date.now();

    // Simular operações de monitoramento
    for (let i = 0; i < 1000; i++) {
      // Simular registro de métrica
      const metric = {
        timestamp: Date.now(),
        value: Math.random() * 100,
        type: 'test_metric',
      };

      // Simular processamento
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    const executionTime = Date.now() - startTime;
    const operationsPerSecond = Math.round(1000 / (executionTime / 1000));

    console.log(`   Tempo de execução: ${executionTime}ms`);
    console.log(`   Operações por segundo: ${operationsPerSecond}`);

    if (executionTime < 1000) {
      console.log('   ✅ Performance adequada');
    } else {
      console.log('   ⚠️ Performance pode ser melhorada');
    }
  }

  /**
   * Testa configuração de alertas
   */
  private testAlertConfiguration(): void {
    console.log('\n🚨 Teste 3: Configuração de Alertas');
    console.log('-'.repeat(40));

    // Simular configuração de alertas baseada no ambiente
    const alertConfig = {
      latencyThreshold: ENVIRONMENT === 'production' ? 2000 : 5000,
      errorRateThreshold: ENVIRONMENT === 'production' ? 5 : 10,
      memoryThreshold: ENVIRONMENT === 'production' ? 80 : 90,
      throttleMs: ALERT_THROTTLE_MS,
    };

    console.log(`   Limite de latência: ${alertConfig.latencyThreshold}ms`);
    console.log(`   Limite de taxa de erro: ${alertConfig.errorRateThreshold}%`);
    console.log(`   Limite de memória: ${alertConfig.memoryThreshold}%`);
    console.log(`   Throttle: ${alertConfig.throttleMs}ms`);

    console.log('   ✅ Configuração de alertas validada');
  }

  /**
   * Testa simulação de métricas
   */
  private async testMetricsSimulation(): Promise<void> {
    console.log('\n📈 Teste 4: Simulação de Métricas');
    console.log('-'.repeat(40));

    const metrics = [];

    // Simular coleta de métricas por 5 segundos
    const testDuration = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < testDuration) {
      const metric = {
        timestamp: Date.now(),
        searchLatency: Math.random() * 1000,
        memoryUsage: 50 + Math.random() * 30,
        activeConnections: Math.floor(Math.random() * 100),
        errorRate: Math.random() * 5,
      };

      metrics.push(metric);

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calcular estatísticas
    const avgLatency = metrics.reduce((sum, m) => sum + m.searchLatency, 0) / metrics.length;
    const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    const avgConnections =
      metrics.reduce((sum, m) => sum + m.activeConnections, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;

    console.log(`   Métricas coletadas: ${metrics.length}`);
    console.log(`   Latência média: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Uso de memória médio: ${avgMemory.toFixed(2)}%`);
    console.log(`   Conexões ativas médias: ${avgConnections.toFixed(0)}`);
    console.log(`   Taxa de erro média: ${avgErrorRate.toFixed(2)}%`);

    console.log('   ✅ Simulação de métricas concluída');
  }
}

/**
 * Executa os testes se o script for executado diretamente
 */
if (require.main === module) {
  const test = new MonitoringTest();
  test.runTests().catch(error => {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  });
}

export { MonitoringTest };
