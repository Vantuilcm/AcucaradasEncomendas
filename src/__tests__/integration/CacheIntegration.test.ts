import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import CacheService from '../../services/cacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the actual implementation of CacheService
jest.mock('../../services/cacheService', () => jest.requireActual('../../services/cacheService'));

// Mock dependencies
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn<any>().mockResolvedValue({ isConnected: true }),
}));

// Mock para o AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
}));

describe('CacheService Integration Tests', () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    jest.clearAllMocks();
    cacheService = CacheService.getInstance();
    await cacheService.clearAll();
  });

  test('should store and retrieve data from cache', async () => {
    // Configurar mock para simular armazenamento bem-sucedido
    (AsyncStorage.setItem as jest.Mock<any>).mockResolvedValue(undefined);

    // Configurar mock para simular recuperação de dados
    const mockData = JSON.stringify({
      value: { name: 'Bolo de Chocolate', price: 45.9 },
      expiration: Date.now() + 10000,
      lastAccessed: Date.now()
    });
    (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValue(mockData);

    // Armazenar dados no cache
    const key = 'product-123';
    const data = { name: 'Bolo de Chocolate', price: 45.9 };
    await cacheService.setItem(key, data);

    // Verificar se AsyncStorage.setItem foi chamado
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining(key),
      expect.stringContaining('Bolo de Chocolate'),
    );

    // Recuperar dados do cache
    const cachedData = await cacheService.getItem(key);

    // Verificar se os dados recuperados correspondem aos dados originais
    expect(cachedData).toEqual(data);
  });

  test('should handle cache miss correctly', async () => {
    // Configurar mock para simular cache miss
    (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValue(null);

    // Tentar recuperar dados inexistentes
    const key = 'non-existent-key';
    const cachedData = await cacheService.getItem(key);

    // Verificar se o resultado é null para cache miss
    expect(cachedData).toBeNull();
  });

  test('should remove item from cache', async () => {
    // Configurar mock para simular remoção bem-sucedida
    (AsyncStorage.removeItem as jest.Mock<any>).mockResolvedValue(undefined);

    // Remover item do cache
    const key = 'product-123';
    await cacheService.removeItem(key);

    // Verificar se AsyncStorage.removeItem foi chamado
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(expect.stringContaining(key));
  });

  test('should clear all cache', async () => {
    // Configurar mock para simular limpeza bem-sucedida
    (AsyncStorage.getAllKeys as jest.Mock<any>).mockResolvedValue(['app_cache_key1']);
    (AsyncStorage.multiRemove as jest.Mock<any>).mockResolvedValue(undefined);

    // Limpar todo o cache
    await cacheService.clearAll();

    // Verificar se AsyncStorage.multiRemove foi chamado (já que clearAll usa multiRemove se houver chaves)
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });

  test('should handle expired cache items', async () => {
    // Configurar mock para simular item expirado
    const expiredData = JSON.stringify({
      value: { name: 'Bolo de Morango', price: 50.9 },
      expiration: Date.now() - 1000, // Expirado (1 segundo atrás)
      lastAccessed: Date.now()
    });
    (AsyncStorage.getItem as jest.Mock<any>).mockResolvedValue(expiredData);

    // Tentar recuperar item expirado
    const key = 'product-456';
    const cachedData = await cacheService.getItem(key);

    // Verificar se o resultado é null para item expirado
    expect(cachedData).toBeNull();
  });

  test('should handle errors when storing data', async () => {
    // Configurar mock para simular erro
    const mockError = new Error('Storage error');
    (AsyncStorage.setItem as jest.Mock<any>).mockRejectedValue(mockError);

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

    // Tentar armazenar dados
    const key = 'product-123';
    const data = { name: 'Bolo de Chocolate', price: 45.9 };

    // A operação não deve lançar exceção
    await cacheService.setItem(key, data);

    // Verificar se o erro foi registrado com a mensagem correta (em português)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao armazenar item de cache'),
      mockError
    );

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should handle errors when retrieving data', async () => {
    // Configurar mock para simular erro
    const mockError = new Error('Storage error');
    (AsyncStorage.getItem as jest.Mock<any>).mockRejectedValue(mockError);

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((() => {}) as any);

    // Tentar recuperar dados
    const key = 'product-123';

    // A operação deve retornar null em caso de erro
    const result = await cacheService.getItem(key);
    expect(result).toBeNull();

    // Verificar se o erro foi registrado com a mensagem correta (em português)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao buscar item de cache'),
      mockError
    );

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });
});
