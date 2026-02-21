import { CacheService } from '../../services/CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PerformanceService } from '../../services/PerformanceService';

// Mock para o AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  clear: jest.fn(),
}));

// Mock para o PerformanceService
jest.mock('../../services/PerformanceService', () => ({
  PerformanceService: {
    getInstance: jest.fn().mockReturnValue({
      trackOperation: jest.fn().mockImplementation((name, callback) => callback()),
    }),
  },
}));

describe('CacheService Integration Tests', () => {
  let cacheService: CacheService;
  let performanceService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = CacheService.getInstance();
    performanceService = PerformanceService.getInstance();
  });

  test('should store and retrieve data from cache', async () => {
    // Configurar mock para simular armazenamento bem-sucedido
    AsyncStorage.setItem.mockResolvedValue(undefined);

    // Configurar mock para simular recuperação de dados
    const mockData = JSON.stringify({ name: 'Bolo de Chocolate', price: 45.9 });
    AsyncStorage.getItem.mockResolvedValue(mockData);

    // Armazenar dados no cache
    const key = 'product-123';
    const data = { name: 'Bolo de Chocolate', price: 45.9 };
    await cacheService.setItem(key, data);

    // Verificar se AsyncStorage.setItem foi chamado com os parâmetros corretos
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      key,
      JSON.stringify(data),
      expect.any(Object) // Opções de cache
    );

    // Recuperar dados do cache
    const cachedData = await cacheService.getItem(key);

    // Verificar se AsyncStorage.getItem foi chamado com a chave correta
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);

    // Verificar se os dados recuperados correspondem aos dados originais
    expect(cachedData).toEqual(data);
  });

  test('should handle cache miss correctly', async () => {
    // Configurar mock para simular cache miss
    AsyncStorage.getItem.mockResolvedValue(null);

    // Tentar recuperar dados inexistentes
    const key = 'non-existent-key';
    const cachedData = await cacheService.getItem(key);

    // Verificar se AsyncStorage.getItem foi chamado com a chave correta
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);

    // Verificar se o resultado é null para cache miss
    expect(cachedData).toBeNull();
  });

  test('should remove item from cache', async () => {
    // Configurar mock para simular remoção bem-sucedida
    AsyncStorage.removeItem.mockResolvedValue(undefined);

    // Remover item do cache
    const key = 'product-123';
    await cacheService.removeItem(key);

    // Verificar se AsyncStorage.removeItem foi chamado com a chave correta
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
  });

  test('should clear all cache', async () => {
    // Configurar mock para simular limpeza bem-sucedida
    AsyncStorage.clear.mockResolvedValue(undefined);

    // Limpar todo o cache
    await cacheService.clear();

    // Verificar se AsyncStorage.clear foi chamado
    expect(AsyncStorage.clear).toHaveBeenCalled();
  });

  test('should handle expired cache items', async () => {
    // Configurar mock para simular item expirado
    const expiredData = JSON.stringify({
      value: { name: 'Bolo de Morango', price: 50.9 },
      expiry: Date.now() - 1000, // Expirado (1 segundo atrás)
    });
    AsyncStorage.getItem.mockResolvedValue(expiredData);

    // Tentar recuperar item expirado
    const key = 'product-456';
    const cachedData = await cacheService.getItem(key);

    // Verificar se AsyncStorage.getItem foi chamado com a chave correta
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);

    // Verificar se o resultado é null para item expirado
    expect(cachedData).toBeNull();

    // Verificar se o item expirado foi removido
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
  });

  test('should integrate with PerformanceService for tracking', async () => {
    // Configurar mocks
    AsyncStorage.setItem.mockResolvedValue(undefined);
    const mockData = JSON.stringify({ name: 'Bolo de Cenoura', price: 40.9 });
    AsyncStorage.getItem.mockResolvedValue(mockData);

    // Armazenar dados no cache
    const key = 'product-789';
    const data = { name: 'Bolo de Cenoura', price: 40.9 };
    await cacheService.setItem(key, data);

    // Recuperar dados do cache
    await cacheService.getItem(key);

    // Verificar se o PerformanceService foi utilizado para rastrear as operações
    expect(performanceService.trackOperation).toHaveBeenCalledTimes(2);
    expect(performanceService.trackOperation).toHaveBeenCalledWith(
      'cache_set',
      expect.any(Function)
    );
    expect(performanceService.trackOperation).toHaveBeenCalledWith(
      'cache_get',
      expect.any(Function)
    );
  });

  test('should handle errors when storing data', async () => {
    // Configurar mock para simular erro
    const mockError = new Error('Storage error');
    AsyncStorage.setItem.mockRejectedValue(mockError);

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Tentar armazenar dados
    const key = 'product-123';
    const data = { name: 'Bolo de Chocolate', price: 45.9 };

    // A operação não deve lançar exceção
    await cacheService.setItem(key, data);

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error storing data in cache:', mockError);

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should handle errors when retrieving data', async () => {
    // Configurar mock para simular erro
    const mockError = new Error('Storage error');
    AsyncStorage.getItem.mockRejectedValue(mockError);

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Tentar recuperar dados
    const key = 'product-123';

    // A operação deve retornar null em caso de erro
    const result = await cacheService.getItem(key);
    expect(result).toBeNull();

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error retrieving data from cache:', mockError);

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should get multiple items from cache', async () => {
    // Configurar mock para simular recuperação de múltiplos itens
    AsyncStorage.multiGet.mockResolvedValue([
      ['product-123', JSON.stringify({ name: 'Bolo de Chocolate', price: 45.9 })],
      ['product-456', JSON.stringify({ name: 'Bolo de Morango', price: 50.9 })],
      ['product-789', null], // Item não encontrado
    ]);

    // Recuperar múltiplos itens
    const keys = ['product-123', 'product-456', 'product-789'];
    const results = await cacheService.multiGet(keys);

    // Verificar se AsyncStorage.multiGet foi chamado com as chaves corretas
    expect(AsyncStorage.multiGet).toHaveBeenCalledWith(keys);

    // Verificar se os resultados estão corretos
    expect(results).toEqual([
      { name: 'Bolo de Chocolate', price: 45.9 },
      { name: 'Bolo de Morango', price: 50.9 },
      null,
    ]);
  });
});
