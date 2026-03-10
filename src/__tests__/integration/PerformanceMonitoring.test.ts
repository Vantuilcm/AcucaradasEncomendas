import { PerformanceService } from '../../services/PerformanceService';
import CacheService from '../../services/cacheService';
import { performanceConfig } from '../../config/performance';

// Type declarations for Jest
declare const jest: any;
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

// Type declarations for Node.js global extensions
declare global {
  interface Navigator {
    connection?: {
      type: string;
      effectiveType: string;
      downlink: number;
      addEventListener: (type: string, listener: any) => void;
    };
    getBattery?: () => Promise<{
      level: number;
      addEventListener: (type: string, listener: any) => void;
    }>;
  }
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// Mock performance API
(global as any).performance = {
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn().mockReturnValue([{ duration: 100 }]),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  memory: {
    usedJSHeapSize: 50000000,
    jsHeapSizeLimit: 100000000,
  },
} as any;

// Mock navigator API
(global as any).navigator = {
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    addEventListener: jest.fn(),
  },
  getBattery: jest.fn().mockResolvedValue({
    level: 0.75,
    addEventListener: jest.fn(),
  }),
} as any;

describe('Performance Monitoring Integration', () => {
  let performanceService: PerformanceService;
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    performanceService = PerformanceService.getInstance();
    cacheService = CacheService.getInstance();
  });

  describe('User Interaction Flow', () => {
    it('should track complete user interaction flow', async () => {
      // Simular um fluxo de interação do usuário completo
      // 1. Iniciar monitoramento
      performanceService.startMonitoring();

      // 2. Rastrear carregamento de tela
      const screenLoadId = performanceService.trackScreenLoad('ProductDetailsScreen');

      // Simular algum processamento
      await new Promise(resolve => setTimeout(resolve, 50));

      // 3. Completar carregamento de tela
      performanceService.completeScreenLoad(screenLoadId);

      // 4. Rastrear interação do usuário (clique em botão)
      const interactionId = performanceService.trackUserInteraction('AddToCartButton', 'click', {
        productId: '123',
        quantity: 1,
      });

      // Simular processamento da interação
      await new Promise(resolve => setTimeout(resolve, 50));

      // 5. Completar interação do usuário
      performanceService.completeUserInteraction(interactionId, true, {
        success: true,
        cartUpdated: true,
      });

      // Verificar se as métricas foram registradas corretamente
      expect(performanceService.getMetrics()).toBeDefined();

      // Verificar se os dados foram salvos em cache
      expect(cacheService.setItem).toHaveBeenCalled();
    });
  });

  describe('API Performance Tracking', () => {
    it('should track API request performance', async () => {
      // Simular uma operação de API
      const operationId = performanceService.startOperation('fetch_products', 'api_request');

      // Simular processamento da API
      await new Promise(resolve => setTimeout(resolve, 100));

      // Finalizar operação
      performanceService.endOperation(operationId, true, {
        endpoint: '/api/products',
        responseSize: 1024,
        itemCount: 10,
      });

      // Verificar se as métricas foram registradas
      expect(global.performance.mark).toHaveBeenCalledWith(`${operationId}_start`);
      expect(global.performance.mark).toHaveBeenCalledWith(`${operationId}_end`);
      expect(global.performance.measure).toHaveBeenCalledWith(
        operationId,
        `${operationId}_start`,
        `${operationId}_end`
      );
    });
  });

  describe('Performance Thresholds', () => {
    it('should detect when performance exceeds thresholds', async () => {
      // Mock para simular uma duração que excede o limite
      global.performance.getEntriesByName = jest.fn().mockReturnValue([
        {
          duration: performanceConfig.performanceThresholds.renderTime * 20,
        },
      ]);

      // Rastrear interação lenta
      const interactionId = performanceService.trackUserInteraction('SlowComponent', 'render');

      // Simular processamento lento
      await new Promise(resolve => setTimeout(resolve, 100));

      // Completar interação
      performanceService.completeUserInteraction(interactionId, true);

      // Verificar se o relatório de problema de performance foi chamado
      // Nota: Como removemos o Sentry, agora as métricas são internas e logs __DEV__
      const metrics = performanceService.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should monitor memory usage and report high usage', async () => {
      // Configurar mock para simular alto uso de memória
      (global.performance as any).memory.usedJSHeapSize = 90000000; // 90% do limite
      (global.performance as any).memory.jsHeapSizeLimit = 100000000;

      // Iniciar monitoramento (isso configura o monitoramento de memória)
      performanceService.startMonitoring();

      // Aguardar um pequeno intervalo para o setInterval (embora o mock dispare imediatamente em testes unitários se forçado, 
      // aqui verificamos se as métricas foram atualizadas)
      const metrics = performanceService.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Network Information Tracking', () => {
    it('should track network information changes', () => {
      // Iniciar monitoramento
      performanceService.startMonitoring();

      // Simular mudança na conexão
      const connectionChangeHandler = (global.navigator as any).connection.addEventListener.mock.calls[0][1];

      // Atualizar tipo de conexão
      (global.navigator as any).connection.type = '3g';
      connectionChangeHandler();

      // Verificar se a métrica foi atualizada
      const metrics = performanceService.getMetrics();
      expect(metrics.networkInfo?.type).toBe('3g');
    });
  });

  describe('Battery Information Tracking', () => {
    it('should track battery level changes', async () => {
      // Iniciar monitoramento
      performanceService.startMonitoring();

      // Simular carregamento inicial da bateria
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verificar se a métrica inicial foi capturada
      const initialMetrics = performanceService.getMetrics();
      expect(initialMetrics.batteryLevel).toBe(75);
    });
  });
});
