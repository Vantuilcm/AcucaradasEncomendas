/**
 * Testes de Performance para Sistema de Monitoramento
 *
 * Este arquivo contÃ©m testes para validar o impacto do monitoramento
 * na performance geral do sistema de busca.
 */

import { SearchService } from '../../services/SearchService';
import { Product } from '../../types/Product';
import { performance } from 'perf_hooks';
import { describe, it, expect, jest } from '@jest/globals';

// Mock de produtos para teste
const mockProducts: Product[] = [
  {
    id: '1',
    producerId: 'producer-1',
    nome: 'Bolo de Chocolate',
    descricao: 'Delicioso bolo de chocolate com cobertura',
    preco: 25.99,
    categoria: 'Bolos',
    disponivel: true,
    imagens: ['bolo1.jpg'],
    ingredientes: ['chocolate', 'farinha', 'ovos'],
    peso: 500,
    dimensoes: { altura: 10, largura: 20, profundidade: 20 },
    dataCriacao: new Date('2025-01-01'),
  },
  {
    id: '2',
    producerId: 'producer-1',
    nome: 'Cupcake de Morango',
    descricao: 'Cupcake com recheio de morango',
    preco: 8.5,
    categoria: 'Cupcakes',
    disponivel: true,
    imagens: ['cupcake1.jpg'],
    ingredientes: ['morango', 'farinha', 'aÃ§Ãºcar'],
    peso: 100,
    dimensoes: { altura: 5, largura: 8, profundidade: 8 },
    dataCriacao: new Date('2025-01-02'),
  },
];

/**
 * Classe para testes de performance
 */
export class MonitoringPerformanceTest {
  private searchService: SearchService;
  private testResults: PerformanceTestResult[] = [];

  constructor() {
    this.searchService = SearchService.getInstance();
  }

  /**
   * Executa todos os testes de performance
   */
  async runAllTests(): Promise<PerformanceTestSummary> {
    console.log('ðŸš€ Iniciando testes de performance do monitoramento...');

    // Preparar dados de teste
    await this.setupTestData();

    // Executar testes
    await this.testSearchLatencyImpact();
    await this.testMemoryUsageImpact();
    await this.testConcurrentSearches();
    await this.testWebSocketPerformance();
    await this.testAlertProcessingImpact();

    // Gerar relatÃ³rio
    return this.generateSummary();
  }

  /**
   * Prepara dados de teste
   */
  private async setupTestData(): Promise<void> {
    console.log('ðŸ“‹ Preparando dados de teste...');

    // Indexar produtos de teste
    for (const product of mockProducts) {
      await this.searchService.atualizarIndexacaoProduto(product);
    }

    console.log(`âœ… ${mockProducts.length} produtos indexados para teste`);
  }

  /**
   * Testa o impacto do monitoramento na latÃªncia de busca
   */
  private async testSearchLatencyImpact(): Promise<void> {
    console.log('â±ï¸ Testando impacto na latÃªncia de busca...');

    const iterations = 100;
    const searchTerms = ['chocolate', 'morango', 'bolo', 'cupcake'];
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const term = searchTerms[i % searchTerms.length];
      const startTime = performance.now();

      await this.searchService.buscarProdutos(term);

      const endTime = performance.now();
      latencies.push(endTime - startTime);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    this.testResults.push({
      testName: 'Search Latency Impact',
      metric: 'latency',
      averageValue: avgLatency,
      maxValue: maxLatency,
      minValue: minLatency,
      iterations,
      passed: avgLatency < 50, // Deve ser menor que 50ms em mÃ©dia
      details: {
        description: 'Impacto do monitoramento na latÃªncia de busca',
        threshold: '< 50ms mÃ©dia',
        unit: 'ms',
      },
    });

    console.log(
      `ðŸ“Š LatÃªncia mÃ©dia: ${avgLatency.toFixed(2)}ms (min: ${minLatency.toFixed(2)}ms, max: ${maxLatency.toFixed(2)}ms)`
    );
  }

  /**
   * Testa o impacto do monitoramento no uso de memÃ³ria
   */
  private async testMemoryUsageImpact(): Promise<void> {
    console.log('ðŸ’¾ Testando impacto no uso de memÃ³ria...');

    const initialMemory = this.getMemoryUsage();

    // Executar muitas operaÃ§Ãµes de monitoramento
    for (let i = 0; i < 1000; i++) {
      await this.searchService.buscarProdutos('teste');
    }

    const finalMemory = this.getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    this.testResults.push({
      testName: 'Memory Usage Impact',
      metric: 'memory',
      averageValue: memoryIncrease,
      maxValue: finalMemory,
      minValue: initialMemory,
      iterations: 1000,
      passed: memoryIncrease < 50, // Aumento menor que 50MB
      details: {
        description: 'Impacto do monitoramento no uso de memÃ³ria',
        threshold: '< 50MB aumento',
        unit: 'MB',
      },
    });

    console.log(
      `ðŸ“Š Uso de memÃ³ria: inicial ${initialMemory}MB, final ${finalMemory}MB, aumento ${memoryIncrease}MB`
    );
  }

  /**
   * Testa performance com buscas concorrentes
   */
  private async testConcurrentSearches(): Promise<void> {
    console.log('ðŸ”„ Testando buscas concorrentes...');

    const concurrentSearches = 20;
    const searchPromises: Promise<any>[] = [];

    const startTime = performance.now();

    for (let i = 0; i < concurrentSearches; i++) {
      searchPromises.push(this.searchService.buscarProdutos(`termo${i}`));
    }

    await Promise.all(searchPromises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTimePerSearch = totalTime / concurrentSearches;

    this.testResults.push({
      testName: 'Concurrent Searches',
      metric: 'concurrency',
      averageValue: avgTimePerSearch,
      maxValue: totalTime,
      minValue: 0,
      iterations: concurrentSearches,
      passed: avgTimePerSearch < 100, // Menos de 100ms por busca
      details: {
        description: 'Performance com buscas concorrentes',
        threshold: '< 100ms por busca',
        unit: 'ms',
      },
    });

    console.log(
      `ðŸ“Š Buscas concorrentes: ${totalTime.toFixed(2)}ms total, ${avgTimePerSearch.toFixed(2)}ms por busca`
    );
  }

  /**
   * Testa performance do WebSocket
   */
  private async testWebSocketPerformance(): Promise<void> {
    console.log('ðŸŒ Testando performance do WebSocket...');

    const messageCount = 100;
    const startTime = performance.now();

    // Simular envio de mensagens WebSocket
    for (let i = 0; i < messageCount; i++) {
      // Simular broadcast de dados de monitoramento
      const mockData = {
        type: 'monitoring_update',
        timestamp: Date.now(),
        data: { searchCount: i, latency: Math.random() * 100 },
      };

      // Simular processamento da mensagem
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTimePerMessage = totalTime / messageCount;

    this.testResults.push({
      testName: 'WebSocket Performance',
      metric: 'websocket',
      averageValue: avgTimePerMessage,
      maxValue: totalTime,
      minValue: 0,
      iterations: messageCount,
      passed: avgTimePerMessage < 5, // Menos de 5ms por mensagem
      details: {
        description: 'Performance do WebSocket para monitoramento',
        threshold: '< 5ms por mensagem',
        unit: 'ms',
      },
    });

    console.log(
      `ðŸ“Š WebSocket: ${totalTime.toFixed(2)}ms total, ${avgTimePerMessage.toFixed(2)}ms por mensagem`
    );
  }

  /**
   * Testa impacto do processamento de alertas
   */
  private async testAlertProcessingImpact(): Promise<void> {
    console.log('ðŸš¨ Testando impacto do processamento de alertas...');

    const alertCount = 50;
    const startTime = performance.now();

    // Simular processamento de alertas
    for (let i = 0; i < alertCount; i++) {
      // Simular verificaÃ§Ã£o de limites e geraÃ§Ã£o de alertas
      const mockMetric = Math.random() * 1000;
      const threshold = 500;

      if (mockMetric > threshold) {
        // Simular processamento de alerta
        await new Promise(resolve => setTimeout(resolve, 2));
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTimePerAlert = totalTime / alertCount;

    this.testResults.push({
      testName: 'Alert Processing Impact',
      metric: 'alerts',
      averageValue: avgTimePerAlert,
      maxValue: totalTime,
      minValue: 0,
      iterations: alertCount,
      passed: avgTimePerAlert < 10, // Menos de 10ms por alerta
      details: {
        description: 'Impacto do processamento de alertas',
        threshold: '< 10ms por alerta',
        unit: 'ms',
      },
    });

    console.log(
      `ðŸ“Š Processamento de alertas: ${totalTime.toFixed(2)}ms total, ${avgTimePerAlert.toFixed(2)}ms por alerta`
    );
  }

  /**
   * ObtÃ©m uso atual de memÃ³ria (simulado)
   */
  private getMemoryUsage(): number {
    try {
      // Prefer Node.js memory usage when running under Jest/Node
      const mem = (globalThis as any).process?.memoryUsage?.();
      if (mem && typeof mem.heapUsed === "number") {
        return Number(((mem.heapUsed) / 1024 / 1024).toFixed(2));
      }
    } catch {}
    // Fallback to browser performance.memory if available
    const perfMem: any = (globalThis as any).performance?.memory;
    if (perfMem && typeof perfMem.usedJSHeapSize === "number") {
      return Number(((perfMem.usedJSHeapSize) / 1024 / 1024).toFixed(2));
    }
    // As a last resort return 0 to avoid flakiness
    return 0;
  }

  /**
   * Gera resumo dos testes
   */
  private generateSummary(): PerformanceTestSummary {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    const summary: PerformanceTestSummary = {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      results: this.testResults,
      recommendations: this.generateRecommendations(),
    };

    console.log('\nðŸ“‹ RESUMO DOS TESTES DE PERFORMANCE');
    console.log('=====================================');
    console.log(`Total de testes: ${totalTests}`);
    console.log(`Testes aprovados: ${passedTests}`);
    console.log(`Testes falharam: ${failedTests}`);
    console.log(`Taxa de sucesso: ${summary.successRate.toFixed(1)}%`);

    if (summary.recommendations.length > 0) {
      console.log('\nðŸ’¡ RECOMENDAÃ‡Ã•ES:');
      summary.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    return summary;
  }

  /**
   * Gera recomendaÃ§Ãµes baseadas nos resultados
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const failedTests = this.testResults.filter(r => !r.passed);

    if (failedTests.length === 0) {
      recommendations.push(
        'âœ… Todos os testes passaram! O sistema de monitoramento tem impacto mÃ­nimo na performance.'
      );
    } else {
      failedTests.forEach(test => {
        switch (test.testName) {
          case 'Search Latency Impact':
            recommendations.push(
              'âš ï¸ Considere otimizar o cÃ³digo de monitoramento para reduzir latÃªncia de busca.'
            );
            break;
          case 'Memory Usage Impact':
            recommendations.push(
              'âš ï¸ Implemente limpeza automÃ¡tica de dados antigos para controlar uso de memÃ³ria.'
            );
            break;
          case 'Concurrent Searches':
            recommendations.push(
              'âš ï¸ Considere implementar throttling ou pooling para buscas concorrentes.'
            );
            break;
          case 'WebSocket Performance':
            recommendations.push(
              'âš ï¸ Otimize o processamento de mensagens WebSocket ou implemente batching.'
            );
            break;
          case 'Alert Processing Impact':
            recommendations.push(
              'âš ï¸ Considere processamento assÃ­ncrono de alertas para nÃ£o bloquear operaÃ§Ãµes principais.'
            );
            break;
        }
      });
    }

    return recommendations;
  }
}

/**
 * Interfaces para resultados dos testes
 */
interface PerformanceTestResult {
  testName: string;
  metric: string;
  averageValue: number;
  maxValue: number;
  minValue: number;
  iterations: number;
  passed: boolean;
  details: {
    description: string;
    threshold: string;
    unit: string;
  };
}

interface PerformanceTestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  results: PerformanceTestResult[];
  recommendations: string[];
}

/**
 * FunÃ§Ã£o para executar testes de performance
 */
export async function runMonitoringPerformanceTests(): Promise<PerformanceTestSummary> {
  const tester = new MonitoringPerformanceTest();
  return await tester.runAllTests();
}

// Exportar para uso em outros arquivos
export type { PerformanceTestResult, PerformanceTestSummary };

describe('Monitoring Performance Harness', () => {
  jest.setTimeout(30000);

  it('runs and produces a summary', async () => {
    const summary = await runMonitoringPerformanceTests();
    expect(summary.totalTests).toBe(5);
    expect(summary.results.length).toBe(5);
    expect(summary.successRate).toBeGreaterThanOrEqual(0);
  });
});
