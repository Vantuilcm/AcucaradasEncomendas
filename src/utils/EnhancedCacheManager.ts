import AsyncStorage from '@react-native-async-storage/async-storage';
import { LRUCache } from './LRUCache';
import { loggingService } from '../services/LoggingService';

/**
 * Interface para itens armazenados no cache
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expirationMinutes: number;
}

/**
 * Gerenciador de cache aprimorado que combina cache em memÃ³ria (LRU) e persistÃªncia (AsyncStorage)
 * para otimizar o desempenho e reduzir chamadas de rede
 */
export class EnhancedCacheManager {
  // Cache em memÃ³ria para acesso rÃ¡pido
  private static memoryCache = new LRUCache<string, any>(100);

  // Prefixo para chaves de cache persistente
  private static readonly STORAGE_PREFIX = 'cache_';

  // Intervalo para limpeza automÃ¡tica de itens expirados (em ms)
  private static readonly CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutos

  // ID do timer de limpeza
  private static cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Inicializa o gerenciador de cache e configura a limpeza automÃ¡tica
   */
  static initialize(): void {
    // Iniciar timer de limpeza automÃ¡tica
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => {
        this.purgeExpiredItems();
      }, this.CLEANUP_INTERVAL);
    }
  }

  /**
   * Finaliza o gerenciador de cache e limpa recursos
   */
  static shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Armazena dados no cache (memÃ³ria e persistente)
   * @param key Chave do item
   * @param data Dados a serem armazenados
   * @param expirationMinutes Tempo de expiraÃ§Ã£o em minutos (padrÃ£o: 60)
   */
  static async setData<T>(key: string, data: T, expirationMinutes: number = 60): Promise<void> {
    try {
      // Armazenar no cache em memÃ³ria
      this.memoryCache.set(key, data, expirationMinutes);

      // Armazenar no AsyncStorage
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expirationMinutes,
      };

      await AsyncStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(item));
    } catch (error) {
      loggingService.error('Erro ao armazenar dados no cache', { key, error });
    }
  }

  /**
   * ObtÃ©m dados do cache (primeiro verifica memÃ³ria, depois persistente)
   * @param key Chave do item
   * @returns Dados armazenados ou null se nÃ£o existirem ou estiverem expirados
   */
  static async getData<T>(key: string): Promise<T | null> {
    try {
      // Verificar primeiro no cache em memÃ³ria
      const memoryData = this.memoryCache.get(key) as T | undefined;
      if (memoryData !== undefined) {
        return memoryData;
      }

      // Se nÃ£o estiver na memÃ³ria, verificar no AsyncStorage
      const storedItem = await AsyncStorage.getItem(this.STORAGE_PREFIX + key);
      if (!storedItem) {
        return null;
      }

      const parsedItem = JSON.parse(storedItem) as CacheItem<T>;
      const now = Date.now();
      const expirationTime = parsedItem.timestamp + parsedItem.expirationMinutes * 60 * 1000;

      // Verificar se o item expirou
      if (now > expirationTime) {
        await this.removeData(key);
        return null;
      }

      // Armazenar no cache em memÃ³ria para acessos futuros
      this.memoryCache.set(key, parsedItem.data, parsedItem.expirationMinutes);

      return parsedItem.data;
    } catch (error) {
      loggingService.error('Erro ao obter dados do cache', { key, error });
      return null;
    }
  }

  /**
   * Remove um item do cache (memÃ³ria e persistente)
   * @param key Chave do item a ser removido
   */
  static async removeData(key: string): Promise<void> {
    try {
      // Remover do cache em memÃ³ria
      this.memoryCache.delete(key);

      // Remover do AsyncStorage
      await AsyncStorage.removeItem(this.STORAGE_PREFIX + key);
    } catch (error) {
      loggingService.error('Erro ao remover dados do cache', { key, error });
    }
  }

  /**
   * Limpa todo o cache (memÃ³ria e persistente)
   */
  static async clearAll(): Promise<void> {
    try {
      // Limpar cache em memÃ³ria
      this.memoryCache.clear();

      // Obter todas as chaves do AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();

      // Filtrar apenas as chaves de cache
      const cacheKeys = allKeys.filter(key => key.startsWith(this.STORAGE_PREFIX));

      // Remover todas as chaves de cache
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      loggingService.error('Erro ao limpar todo o cache', { error });
    }
  }

  /**
   * Remove todos os itens expirados do cache
   */
  static async purgeExpiredItems(): Promise<void> {
    try {
      // Limpar itens expirados do cache em memÃ³ria
      const memoryPurged = this.memoryCache.purgeExpired();

      // Limpar itens expirados do AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.STORAGE_PREFIX));

      let storagePurged = 0;
      const now = Date.now();

      for (const fullKey of cacheKeys) {
        const storedItem = await AsyncStorage.getItem(fullKey);
        if (storedItem) {
          try {
            const parsedItem = JSON.parse(storedItem) as CacheItem<any>;
            const expirationTime = parsedItem.timestamp + parsedItem.expirationMinutes * 60 * 1000;

            if (now > expirationTime) {
              await AsyncStorage.removeItem(fullKey);
              storagePurged++;
            }
          } catch (parseError) {
            // Se nÃ£o for possÃ­vel analisar o item, removÃª-lo
            await AsyncStorage.removeItem(fullKey);
            storagePurged++;
          }
        }
      }

      loggingService.info('Limpeza de cache concluÃ­da', {
        memoryPurged,
        storagePurged,
      });
    } catch (error) {
      loggingService.error('Erro ao limpar itens expirados do cache', { error });
    }
  }
}

// Inicializar o gerenciador de cache\n
// Inicializar o gerenciador de cache somente fora de ambiente de teste
if (process.env.NODE_ENV !== 'test') {
  EnhancedCacheManager.initialize();
}

