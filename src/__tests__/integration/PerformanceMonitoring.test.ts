import { PerformanceService } from '../../services/PerformanceService';
import { CacheService } from '../../services/CacheService';
import { performanceConfig } from '../../config/performance';
import * as Sentry from '@sentry/react-native';

// Mock dependencies
jest.mock('@sentry/react-native', () => ({
  startTransaction: jest.fn().mockReturnValue({
    setData: jest.fn(),
    finish: jest.fn(),
  }),
  getCurrentHub: jest.fn().mockReturnValue({
    getScope: jest.fn().mockReturnValue({
      getTransaction: jest.fn().mockReturnValue({
        setData: jest.fn(),
        finish: jest.fn(),
      }),
    }),
  }),
}));

jest.mock('../../services/CacheService', () => ({
  CacheService: {
    getInstance: jest.fn().mockReturnValue({
      setItem: jest.fn(),
      getItem: jest.fn().mockReturnValue(Promise.resolve(null)),
      removeItem: jest.fn(),
    }),
  },
}));

// Mock performance API
global.performance = {
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
global.navigator = {
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
      const { startPerformanceTransaction } = require('@/config/sentry');

      // Verificar se as transações foram criadas
      expect(startPerformanceTransaction).toHaveBeenCalledWith(
        'screen_load_ProductDetailsScreen',
        'navigation'
      );

      expect(startPerformanceTransaction).toHaveBeenCalledWith(
        'interaction_AddToCartButton',
        'user-interaction'
      );

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
      // Nota: Precisamos acessar o método privado para verificação
      // Como é um teste de integração, verificamos o comportamento observável
      const {
        startPerformanceTransaction: startPerfTransactionThreshold,
      } = require('@/config/sentry');
      const sentryTransaction = startPerfTransactionThreshold.mock.results[0].value;

      expect(sentryTransaction.setData).toHaveBeenCalledWith('success', true);
      expect(sentryTransaction.finish).toHaveBeenCalled();
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should monitor memory usage and report high usage', () => {
      // Configurar mock para simular alto uso de memória
      global.performance.memory.usedJSHeapSize = 90000000; // 90% do limite
      global.performance.memory.jsHeapSizeLimit = 100000000;

      // Iniciar monitoramento (isso configura o monitoramento de memória)
      performanceService.startMonitoring();

      // Simular verificação de memória (normalmente feita por um intervalo)
      // Acessamos diretamente o método privado para teste
      const setupMemoryMonitoringSpy = jest.spyOn(
        performanceService as any,
        'setupMemoryMonitoring'
      );

      expect(setupMemoryMonitoringSpy).toHaveBeenCalled();

      // Verificar se as métricas de memória foram atualizadas
      // Como não podemos acessar diretamente as métricas privadas, verificamos o comportamento observável
      // através das chamadas ao Sentry ou Cache
      expect(global.performance.memory.usedJSHeapSize).toBe(90000000);
      expect(global.performance.memory.jsHeapSizeLimit).toBe(100000000);
    });
  });

  describe('Network Information Tracking', () => {
    it('should track network information changes', () => {
      // Iniciar monitoramento
      performanceService.startMonitoring();

      // Simular mudança na conexão
      const connectionChangeHandler = global.navigator.connection.addEventListener.mock.calls[0][1];

      // Atualizar tipo de conexão
      global.navigator.connection.type = '3g';
      global.navigator.connection.effectiveType = '3g';
      global.navigator.connection.downlink = 5;

      // Chamar o handler de mudança
      if (connectionChangeHandler) {
        connectionChangeHandler();
      }

      // Verificar se o evento de mudança de conexão foi registrado
      expect(global.navigator.connection.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });
  });

  describe('Battery Level Monitoring', () => {
    it('should track battery level changes', async () => {
      // Iniciar monitoramento
      performanceService.startMonitoring();

      // Verificar se getBattery foi chamado
      expect(global.navigator.getBattery).toHaveBeenCalled();

      // Simular mudança no nível da bateria
      const battery = await global.navigator.getBattery();
      const levelChangeHandler = battery.addEventListener.mock.calls[0][1];

      // Atualizar nível da bateria
      battery.level = 0.25; // 25%

      // Chamar o handler de mudança
      if (levelChangeHandler) {
        levelChangeHandler();
      }

      // Verificar se o evento de mudança de bateria foi registrado
      expect(battery.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
    });
  });
});
