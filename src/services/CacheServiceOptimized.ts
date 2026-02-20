import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Product } from '../types/Product';

// Interface para configuraÃ§Ã£o do cache
interface CacheConfig {
  maxSize: number; // Tamanho mÃ¡ximo do cache em nÃºmero de itens
  defaultExpiration: number; // Tempo padrÃ£o de expiraÃ§Ã£o em milissegundos
  storageKey: string; // Chave base para armazenamento no AsyncStorage
  compressionEnabled: boolean; // Habilitar compressÃ£o para itens grandes
  batchSize: number; // Tamanho do lote para operaÃ§Ãµes em massa
}

// Interface para um item de cache
interface CacheItem<T> {
  value: T; // Valor armazenado
  expiration: number; // Timestamp de expiraÃ§Ã£o
  lastAccessed: number; // Timestamp do Ãºltimo acesso
  size?: number; // Tamanho opcional do item (Ãºtil para imagens e objetos grandes)
  compressed?: boolean; // Indica se o item estÃ¡ comprimido
}

// Interface para estatÃ­sticas do cache
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  hitRate: number;
}

/**
 * ServiÃ§o de cache otimizado para armazenamento persistente de dados
 * Implementa polÃ­tica LRU (Least Recently Used) para gerenciamento de espaÃ§o
 * Inclui compressÃ£o, lazy loading e operaÃ§Ãµes em lote
 */
class CacheServiceOptimized {
  private static instance: CacheServiceOptimized;
  private config: CacheConfig;
  private memoryCache: Map<string, CacheItem<any>>;
  private isNetworkAvailable: boolean = true;
  private stats: CacheStats;
  private pendingWrites: Map<string, Promise<void>>;
  private writeQueue: Array<{ key: string; item: CacheItem<any> }>;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this.config = {
      maxSize: 100,
      defaultExpiration: 24 * 60 * 60 * 1000, // 24 horas
      storageKey: 'app_cache_',
      compressionEnabled: true,
      batchSize: 10,
    };
    this.memoryCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      hitRate: 0,
    };
    this.pendingWrites = new Map();
    this.writeQueue = [];

    // Monitorar conectividade de rede
    NetInfo.addEventListener(state => {
      this.isNetworkAvailable = state.isConnected ?? false;
    });

    // Carregar cache do armazenamento persistente (lazy loading)
    this.initializeCache();
  }

  /**
   * ObtÃ©m a instÃ¢ncia singleton do serviÃ§o
   */
  public static getInstance(): CacheServiceOptimized {
    if (!CacheServiceOptimized.instance) {
      CacheServiceOptimized.instance = new CacheServiceOptimized();
    }
    return CacheServiceOptimized.instance;
  }

  /**
   * InicializaÃ§Ã£o lazy do cache
   */
  private async initializeCache(): Promise<void> {
    try {
      // Carregar apenas metadados inicialmente
      const metadataKey = `${this.config.storageKey}metadata`;
      const metadata = await AsyncStorage.getItem(metadataKey);

      if (metadata) {
        const { keys, totalSize } = JSON.parse(metadata);
        this.stats.totalSize = totalSize || 0;

        // Carregar apenas os itens mais recentemente acessados
        const recentKeys = keys.slice(0, Math.min(20, keys.length));
        await this.loadKeysFromStorage(recentKeys);
      }
    } catch (error) {
      // Silent fail - nÃ£o loggar em produÃ§Ã£o
    }
  }

  /**
   * Carrega chaves especÃ­ficas do armazenamento
   */
  private async loadKeysFromStorage(keys: string[]): Promise<void> {
    try {
      const storageKeys = keys.map(key => `${this.config.storageKey}${key}`);
      const storedItems = await AsyncStorage.multiGet(storageKeys);

      for (const [storageKey, value] of storedItems) {
        if (value) {
          const cacheKey = storageKey.replace(this.config.storageKey, '');
          const cacheItem = JSON.parse(value) as CacheItem<any>;

          // Verificar se o item ainda Ã© vÃ¡lido
          if (cacheItem.expiration > Date.now()) {
            this.memoryCache.set(cacheKey, cacheItem);
          } else {
            // Remover itens expirados silenciosamente
            AsyncStorage.removeItem(storageKey).catch(() => {});
          }
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Comprime dados grandes usando JSON.stringify otimizado
   */
  private compressData(data: any): string {
    if (!this.config.compressionEnabled) {
      return JSON.stringify(data);
    }

    // ImplementaÃ§Ã£o simples de compressÃ£o
    const jsonString = JSON.stringify(data);

    // Para dados pequenos, nÃ£o vale a pena comprimir
    if (jsonString.length < 1000) {
      return jsonString;
    }

    // CompressÃ£o bÃ¡sica removendo espaÃ§os desnecessÃ¡rios
    return jsonString.replace(/\s+/g, ' ').trim();
  }

  /**
   * Descomprime dados
   */
  private decompressData(compressedData: string): any {
    return JSON.parse(compressedData);
  }

  /**
   * Gerencia o tamanho do cache usando polÃ­tica LRU otimizada
   */
  private async enforceSizeLimitOptimized(): Promise<void> {
    if (this.memoryCache.size <= this.config.maxSize) return;

    // Ordenar itens por Ãºltimo acesso (mais antigos primeiro)
    const sortedItems = Array.from(this.memoryCache.entries()).sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );

    // Remover os itens mais antigos em lote
    const itemsToRemove = sortedItems.slice(0, sortedItems.length - this.config.maxSize);
    const keysToRemove = itemsToRemove.map(([key]) => `${this.config.storageKey}${key}`);

    // Remover da memÃ³ria
    for (const [key] of itemsToRemove) {
      this.memoryCache.delete(key);
      this.stats.evictions++;
    }

    // Remover do storage em lote
    try {
      await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Processa a fila de escrita em lotes
   */
  private async processWriteQueue(): Promise<void> {
    if (this.writeQueue.length === 0) return;

    const batch = this.writeQueue.splice(0, this.config.batchSize);
    const writeOperations: Array<[string, string]> = [];

    for (const { key, item } of batch) {
      const storageKey = `${this.config.storageKey}${key}`;
      const compressedData = this.compressData(item);
      writeOperations.push([storageKey, compressedData]);
    }

    try {
      await AsyncStorage.multiSet(writeOperations);
    } catch (error) {
      // Silent fail
    }

    // Processar prÃ³ximo lote se houver
    if (this.writeQueue.length > 0) {
      this.scheduleWriteQueue();
    }
  }

  /**
   * Agenda o processamento da fila de escrita
   */
  private scheduleWriteQueue(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }

    this.writeTimer = setTimeout(() => {
      this.processWriteQueue();
    }, 100); // Debounce de 100ms
  }

  /**
   * Armazena um item no cache com otimizaÃ§Ãµes
   */
  public async set<T>(key: string, value: T, expirationTime?: number): Promise<void> {
    const now = Date.now();
    const cacheItem: CacheItem<T> = {
      value,
      expiration: now + (expirationTime || this.config.defaultExpiration),
      lastAccessed: now,
      compressed: this.config.compressionEnabled,
    };

    try {
      // Armazenar em memÃ³ria imediatamente
      this.memoryCache.set(key, cacheItem);

      // Adicionar Ã  fila de escrita para processamento em lote
      this.writeQueue.push({ key, item: cacheItem });
      this.scheduleWriteQueue();

      // Verificar limite de tamanho do cache
      await this.enforceSizeLimitOptimized();
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * ObtÃ©m um item do cache com otimizaÃ§Ãµes
   */
  public async get<T>(key: string): Promise<T | null> {
    // Verificar cache em memÃ³ria primeiro
    const memoryItem = this.memoryCache.get(key) as CacheItem<T> | undefined;

    if (memoryItem) {
      const now = Date.now();

      // Verificar expiraÃ§Ã£o
      if (memoryItem.expiration > now) {
        // Atualizar timestamp de Ãºltimo acesso
        memoryItem.lastAccessed = now;
        this.memoryCache.set(key, memoryItem);

        this.stats.hits++;
        this.updateHitRate();

        return memoryItem.value;
      } else {
        // Remover item expirado
        this.memoryCache.delete(key);
        AsyncStorage.removeItem(`${this.config.storageKey}${key}`).catch(() => {});
      }
    }

    // Verificar AsyncStorage como fallback (lazy loading)
    try {
      const storedItem = await AsyncStorage.getItem(`${this.config.storageKey}${key}`);

      if (storedItem) {
        const cacheItem = this.decompressData(storedItem) as CacheItem<T>;
        const now = Date.now();

        if (cacheItem.expiration > now) {
          // Atualizar timestamp de Ãºltimo acesso
          cacheItem.lastAccessed = now;

          // Armazenar em memÃ³ria
          this.memoryCache.set(key, cacheItem);

          this.stats.hits++;
          this.updateHitRate();

          return cacheItem.value;
        } else {
          // Remover item expirado
          AsyncStorage.removeItem(`${this.config.storageKey}${key}`).catch(() => {});
        }
      }
    } catch (error) {
      // Silent fail
    }

    this.stats.misses++;
    this.updateHitRate();

    return null;
  }

  /**
   * Remove um item do cache
   */
  public async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(`${this.config.storageKey}${key}`);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Limpa todo o cache
   */
  public async clear(): Promise<void> {
    try {
      this.memoryCache.clear();

      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storageKey));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      // Resetar estatÃ­sticas
      this.stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalSize: 0,
        hitRate: 0,
      };
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Atualiza a taxa de acerto do cache
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * ObtÃ©m estatÃ­sticas do cache
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Verifica se uma chave existe no cache
   */
  public async has(key: string): Promise<boolean> {
    const item = await this.get(key);
    return item !== null;
  }

  /**
   * ObtÃ©m todas as chaves do cache
   */
  public getKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Configura o cache
   */
  public configure(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * ForÃ§a a sincronizaÃ§Ã£o da fila de escrita
   */
  public async flush(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }

    while (this.writeQueue.length > 0) {
      await this.processWriteQueue();
    }
  }
}

// Exportar instÃ¢ncia singleton
export const cacheService = CacheServiceOptimized.getInstance();
export default cacheService;
export type { CacheConfig, CacheItem, CacheStats };

