import { EnhancedCacheManager } from './EnhancedCacheManager';

export const CacheManager = {
  async getData<T>(key: string): Promise<T | null> {
    return EnhancedCacheManager.getData<T>(key);
  },

  async setData<T>(key: string, value: T, expirationMinutes?: number): Promise<void> {
    await EnhancedCacheManager.setData(key, value, expirationMinutes);
  },

  async removeData(key: string): Promise<void> {
    await EnhancedCacheManager.removeData(key);
  },

  async clearAll(): Promise<void> {
    await EnhancedCacheManager.clearAll();
  },
};
