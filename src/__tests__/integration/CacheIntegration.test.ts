import cacheServiceDefault, { CacheService } from '../../services/cacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoggingService } from '../../services/LoggingService';

describe('CacheService Integration Tests', () => {
  let cacheService: any;
  let logger: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    cacheService = CacheService.getInstance?.() ?? cacheServiceDefault;
    logger = LoggingService.getInstance();
    await (AsyncStorage as any).clear();
    await cacheService.clear();
  });

  test('should store and retrieve data from cache', async () => {
    const key = 'product-123';
    const data = { name: 'Bolo de Chocolate', price: 45.9 };

    await cacheService.setItem(key, data);

    expect((AsyncStorage as any).setItem).toHaveBeenCalledWith(
      '@cache:product-123',
      expect.any(String)
    );

    const storedRaw = ((AsyncStorage as any).setItem as jest.Mock).mock.calls[0][1];
    const stored = JSON.parse(storedRaw);
    expect(stored).toEqual(
      expect.objectContaining({
        value: data,
        expiration: expect.any(Number),
        lastAccessed: expect.any(Number),
      })
    );

    const cachedData = await cacheService.getItem(key);
    expect(cachedData).toEqual(data);
  });

  test('should handle cache miss correctly', async () => {
    const cachedData = await cacheService.getItem('non-existent-key');
    expect(cachedData).toBeNull();
  });

  test('should remove item from cache', async () => {
    const key = 'product-123';
    await cacheService.setItem(key, { name: 'Bolo', price: 10 });

    await cacheService.removeItem(key);
    expect((AsyncStorage as any).removeItem).toHaveBeenCalledWith('@cache:product-123');
  });

  test('should clear all cache', async () => {
    await cacheService.setItem('k1', { a: 1 });
    await cacheService.setItem('k2', { a: 2 });

    await cacheService.clear();
    expect((AsyncStorage as any).multiRemove).toHaveBeenCalledWith(
      expect.arrayContaining(['@cache:k1', '@cache:k2'])
    );
    expect(await cacheService.getItem('k1')).toBeNull();
  });

  test('should handle expired cache items', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    const key = 'product-expired';
    await cacheService.setItem(key, { name: 'Bolo', price: 10 }, { expiration: 1 });

    jest.advanceTimersByTime(10);

    const cachedData = await cacheService.getItem(key);
    expect(cachedData).toBeNull();
    expect((AsyncStorage as any).removeItem).toHaveBeenCalledWith('@cache:product-expired');

    jest.useRealTimers();
  });

  test('should handle errors when persisting data', async () => {
    const mockError = new Error('Storage error');
    ((AsyncStorage as any).setItem as jest.Mock).mockRejectedValueOnce(mockError);

    await cacheService.setItem('product-123', { name: 'Bolo', price: 10 });
    expect(logger.error).toHaveBeenCalled();
  });

  test('should get multiple items from cache', async () => {
    await cacheService.setItem('product-123', { name: 'Bolo de Chocolate', price: 45.9 });
    await cacheService.setItem('product-456', { name: 'Bolo de Morango', price: 50.9 });

    const keys = ['product-123', 'product-456', 'product-789'];
    const results = await cacheService.multiGet(keys);

    expect(results).toEqual([
      { name: 'Bolo de Chocolate', price: 45.9 },
      { name: 'Bolo de Morango', price: 50.9 },
      null,
    ]);
  });
});
