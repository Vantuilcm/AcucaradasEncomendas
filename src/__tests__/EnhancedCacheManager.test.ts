import { EnhancedCacheManager } from '../utils/EnhancedCacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock do AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock do loggingService
jest.mock('../services/loggingService', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe('EnhancedCacheManager', () => {
  let cacheManager: EnhancedCacheManager;

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Criar uma nova instância do cache manager
    cacheManager = EnhancedCacheManager.getInstance();

    // Limpar o cache para garantir testes isolados
    cacheManager.clearAll();
  });

  test('deve ser uma instância singleton', () => {
    const instance1 = EnhancedCacheManager.getInstance();
    const instance2 = EnhancedCacheManager.getInstance();

    expect(instance1).toBe(instance2);
  });

  test('deve armazenar e recuperar dados do cache', async () => {
    const key = 'testKey';
    const data = { id: 1, name: 'Test Data' };

    // Configurar mock do AsyncStorage.getItem para retornar null (não encontrado)
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    // Armazenar dados no cache
    await cacheManager.setData(key, data);

    // Verificar se os dados foram armazenados no AsyncStorage
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining(key),
      expect.any(String)
    );

    // Recuperar dados do cache
    const cachedData = await cacheManager.getData(key);

    // Verificar se os dados recuperados são iguais aos armazenados
    expect(cachedData).toEqual(data);
  });

  test('deve recuperar dados do AsyncStorage quando não estão no cache em memória', async () => {
    const key = 'testKey';
    const data = { id: 1, name: 'Test Data' };

    // Configurar mock do AsyncStorage.getItem para retornar dados
    const storedData = {
      data,
      timestamp: Date.now(),
      expiresIn: null,
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedData));

    // Recuperar dados (deve vir do AsyncStorage)
    const cachedData = await cacheManager.getData(key);

    // Verificar se os dados recuperados são iguais aos armazenados
    expect(cachedData).toEqual(data);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(expect.stringContaining(key));
  });

  test('deve retornar null para dados expirados', async () => {
    jest.useFakeTimers();

    const key = 'testKey';
    const data = { id: 1, name: 'Test Data' };

    // Armazenar dados com expiração de 1 minuto
    await cacheManager.setData(key, data, 1);

    // Avançar o tempo em 2 minutos
    jest.advanceTimersByTime(2 * 60 * 1000);

    // Configurar mock do AsyncStorage.getItem para retornar null
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    // Recuperar dados (deve retornar null porque expirou)
    const cachedData = await cacheManager.getData(key);

    // Verificar se retornou null
    expect(cachedData).toBeNull();

    jest.useRealTimers();
  });

  test('deve remover dados do cache', async () => {
    const key = 'testKey';
    const data = { id: 1, name: 'Test Data' };

    // Armazenar dados no cache
    await cacheManager.setData(key, data);

    // Remover dados do cache
    await cacheManager.removeData(key);

    // Verificar se os dados foram removidos do AsyncStorage
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(expect.stringContaining(key));

    // Configurar mock do AsyncStorage.getItem para retornar null
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    // Tentar recuperar dados (deve retornar null)
    const cachedData = await cacheManager.getData(key);
    expect(cachedData).toBeNull();
  });

  test('deve limpar todo o cache', async () => {
    // Configurar mock do AsyncStorage.getAllKeys para retornar algumas chaves
    const keys = ['cache:key1', 'cache:key2', 'other:key'];
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(keys);

    // Limpar todo o cache
    await cacheManager.clearAll();

    // Verificar se multiRemove foi chamado com as chaves de cache corretas
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['cache:key1', 'cache:key2']);
  });

  test('deve remover itens expirados durante a limpeza automática', async () => {
    jest.useFakeTimers();

    // Configurar mock do AsyncStorage.getAllKeys para retornar algumas chaves
    const keys = ['cache:key1', 'cache:key2'];
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(keys);

    // Configurar mock do AsyncStorage.getItem para retornar dados expirados para key1
    // e dados válidos para key2
    const expiredData = {
      data: { id: 1 },
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 horas atrás
      expiresIn: 60, // 1 minuto
    };

    const validData = {
      data: { id: 2 },
      timestamp: Date.now(),
      expiresIn: 60, // 1 minuto
    };

    (AsyncStorage.getItem as jest.Mock).mockImplementation(key => {
      if (key === 'cache:key1') return Promise.resolve(JSON.stringify(expiredData));
      if (key === 'cache:key2') return Promise.resolve(JSON.stringify(validData));
      return Promise.resolve(null);
    });

    // Executar limpeza de itens expirados
    await cacheManager.purgeExpiredItems();

    // Verificar se removeItem foi chamado apenas para a chave expirada
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cache:key1');
    expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('cache:key2');

    jest.useRealTimers();
  });
});
