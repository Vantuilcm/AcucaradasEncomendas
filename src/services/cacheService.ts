import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Product } from '../types/Product';
import { LoggingService } from './LoggingService';

// Interface para configuração do cache
interface CacheConfig {
  maxSize: number;  // Tamanho máximo do cache em número de itens
  defaultExpiration: number;  // Tempo padrão de expiração em milissegundos
  storageKey: string;  // Chave base para armazenamento no AsyncStorage
}

// Interface para um item de cache
interface CacheItem<T> {
  value: T;  // Valor armazenado
  expiration: number;  // Timestamp de expiração
  lastAccessed: number;  // Timestamp do último acesso
  size?: number;  // Tamanho opcional do item (útil para imagens e objetos grandes)
}

/**
 * Serviço de cache otimizado para React Native
 * Implementa cache em memória com persistência no AsyncStorage
 * Suporta expiração automática e limpeza de itens antigos
 */
export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem<any>> = new Map();
  private config: CacheConfig;
  private isOnline: boolean = true;
  private memoryOnlyKeys: Set<string> = new Set(); // Chaves que não devem ser persistidas
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.config = {
      maxSize: 100,  // Máximo 100 itens em memória
      defaultExpiration: 5 * 60 * 1000,  // 5 minutos padrão
      storageKey: '@cache:'
    };
    this.initialize();
  }

  /**
   * Obtém a instância única do serviço (Singleton)
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Inicializa o serviço de cache
   */
  private async initialize(): Promise<void> {
    try {
      // Verificar conectividade de rede
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? true;

      // Ouvir mudanças na conectividade
      NetInfo.addEventListener(state => {
        this.isOnline = state.isConnected ?? true;
      });

      // Carregar cache do AsyncStorage
      await this.loadFromStorage();

      // Limpar itens expirados periodicamente
      this.startCleanupTimer();

      // LoggingService.getInstance().debug('CacheService inicializado com sucesso');
    } catch (error: any) {
      LoggingService.getInstance().error('Erro ao inicializar CacheService', error);
    }
  }

  /**
   * Carrega o cache do AsyncStorage para a memória
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storageKey));
      
      if (cacheKeys.length > 0) {
        const storedItems = await AsyncStorage.multiGet(cacheKeys);
        
        for (const [key, value] of storedItems) {
          if (value) {
            try {
              const item: CacheItem<any> = JSON.parse(value);
              const cacheKey = key.replace(this.config.storageKey, '');
              
              // Verificar se não está expirado
              if (item.expiration > Date.now()) {
                this.cache.set(cacheKey, item);
              } else {
                // Remover item expirado do AsyncStorage
                await AsyncStorage.removeItem(key);
              }
            } catch (e) {
              // console.error('Erro ao processar item do cache', e);
            }
          }
        }

        // LoggingService.getInstance().debug(`Cache carregado: ${this.cache.size} itens`);
      }
    } catch (error: any) {
      LoggingService.getInstance().error('Erro ao carregar cache do storage', error);
    }
  }

  /**
   * Inicia timer para limpeza periódica de itens expirados
   */
  private startCleanupTimer(): void {
    const isTestEnv =
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
    if (isTestEnv) return;
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredItems();
    }, 30000);
  }

  /**
   * Remove itens expirados do cache
   */
  private async cleanupExpiredItems(): Promise<void> {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      for (const [key, item] of this.cache.entries()) {
        if (item.expiration <= now) {
          keysToRemove.push(key);
        }
      }
      
      // Remover itens expirados
      for (const key of keysToRemove) {
        this.cache.delete(key);
        
        // Remover do AsyncStorage se não for memory-only
        if (!this.memoryOnlyKeys.has(key)) {
          await AsyncStorage.removeItem(`${this.config.storageKey}${key}`).catch((error: any) => {
            LoggingService.getInstance().error('Erro ao remover item do AsyncStorage', error);
          });
        }
      }
      
      if (keysToRemove.length > 0) {
        // LoggingService.getInstance().debug(`Itens expirados removidos: ${keysToRemove.length}`);
      }
    } catch (error: any) {
      LoggingService.getInstance().error('Erro na limpeza do cache', error);
    }
  }

  /**
   * Define um item no cache
   */
  public async setItem<T>(
    key: string, 
    value: T, 
    options?: {
      expiration?: number;
      memoryOnly?: boolean;
      size?: number;
    }
  ): Promise<void> {
    try {
      const expiration = options?.expiration ?? this.config.defaultExpiration;
      const expiresAt = Date.now() + expiration;
      
      const item: CacheItem<T> = {
        value,
        expiration: expiresAt,
        lastAccessed: Date.now(),
        size: options?.size
      };

      // Adicionar ao cache em memória
      this.cache.set(key, item);

      // Gerenciar tamanho do cache
      await this.manageCacheSize();

      // Persistir no AsyncStorage se não for memory-only
      if (!options?.memoryOnly) {
        await AsyncStorage.setItem(
          `${this.config.storageKey}${key}`,
          JSON.stringify(item)
        ).catch((error: any) => {
          LoggingService.getInstance().error('Erro ao salvar item no AsyncStorage', error);
        });
      } else {
        this.memoryOnlyKeys.add(key);
      }

      // LoggingService.getInstance().debug(`Item adicionado ao cache: ${key}`);
    } catch (error: any) {
      LoggingService.getInstance().error('Erro ao adicionar item ao cache', { key, error });
    }
  }

  /**
   * Obtém um item do cache
   */
  public async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        return null;
      }

      // Verificar se o item expirou
      if (item.expiration <= Date.now()) {
        this.cache.delete(key);
        if (!this.memoryOnlyKeys.has(key)) {
          AsyncStorage.removeItem(`${this.config.storageKey}${key}`).catch((error: any) => {
            LoggingService.getInstance().error('Erro ao remover item expirado do storage', error);
          });
        }
        return null;
      }

      // Atualizar timestamp de acesso
      item.lastAccessed = Date.now();
      return item.value as T;
    } catch (error: any) {
      LoggingService.getInstance().error('Erro ao obter item do cache', { key, error });
      return null;
    }
  }

  public async multiGet<T>(keys: string[]): Promise<Array<T | null>> {
    const results: Array<T | null> = [];
    for (const key of keys) {
      results.push(await this.getItem<T>(key));
    }
    return results;
  }

  /**
   * Remove um item do cache
   */
  public async removeItem(key: string): Promise<void> {
    try {
      const isMemoryOnly = this.memoryOnlyKeys.has(key);
      this.cache.delete(key);
      this.memoryOnlyKeys.delete(key);
      
      // Remover do AsyncStorage se não for memory-only
      if (!isMemoryOnly) {
        await AsyncStorage.removeItem(`${this.config.storageKey}${key}`).catch((error: any) => {
          LoggingService.getInstance().error('Erro ao remover item do AsyncStorage', error);
        });
      }

      // LoggingService.getInstance().debug(`Item removido do cache: ${key}`);
    } catch (error: any) {
      LoggingService.getInstance().error('Erro ao remover item do cache', { key, error });
    }
  }

  public async removeByPrefix(prefix: string): Promise<number> {
    try {
      const keysToRemove: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        this.cache.delete(key);
        this.memoryOnlyKeys.delete(key);
      }

      const storageKeys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(`${this.config.storageKey}${prefix}`));
      if (storageKeys.length > 0) {
        await AsyncStorage.multiRemove(storageKeys);
      }

      return keysToRemove.length + storageKeys.length;
    } catch (error: any) {
      LoggingService.getInstance().error('Erro ao remover por prefixo', { prefix, error });
      return 0;
    }
  }

  /**
   * Limpa todo o cache
   */
  public async clear(): Promise<void> {
    try {
      // Limpar cache em memória
      this.cache.clear();
      this.memoryOnlyKeys.clear();
      
      // Remover todos os itens do storage que começam com a chave do cache
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storageKey));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      // LoggingService.getInstance().debug('Cache completamente limpo');
    } catch (error: any) {
      LoggingService.getInstance().error('Erro ao limpar cache completamente', error);
    }
  }

  /**
   * Gerencia o tamanho do cache (remove itens menos usados)
   */
  private async manageCacheSize(): Promise<void> {
    try {
      if (this.cache.size <= this.config.maxSize) {
        return;
      }

      // Converter para array e ordenar por último acesso
      const items = Array.from(this.cache.entries());
      items.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      // Remover itens até atingir o tamanho máximo
      const itemsToRemove = items.slice(0, items.length - this.config.maxSize + 1);
      
      for (const [key, item] of itemsToRemove) {
        this.cache.delete(key);
        
        // Remover do AsyncStorage se não for memory-only
        if (!this.memoryOnlyKeys.has(key)) {
          await AsyncStorage.removeItem(`${this.config.storageKey}${key}`);
        }
      }
      
      // LoggingService.getInstance().debug(`Itens removidos para gerenciar tamanho: ${itemsToRemove.length}`);
    } catch (error: any) {
      LoggingService.getInstance().error('Erro na gestão do tamanho do cache', error);
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  public async getStats(): Promise<{
    size: number;
    memorySize: number;
    storageSize: number;
    hitRate: number;
    online: boolean;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storageKey));
      
      return {
        size: this.cache.size,
        memorySize: this.cache.size,
        storageSize: cacheKeys.length,
        hitRate: 0, // TODO: Implementar contador de hits/misses
        online: this.isOnline
      };
    } catch (error: any) {
      LoggingService.getInstance().error('Erro ao obter estatísticas do cache', error);
      return {
        size: this.cache.size,
        memorySize: this.cache.size,
        storageSize: 0,
        hitRate: 0,
        online: this.isOnline
      };
    }
  }

  /**
   * Verifica se está online
   */
  public isOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Força sincronização com AsyncStorage
   */
  public async syncWithStorage(): Promise<void> {
    try {
      // Salvar todos os itens não-memory-only
      const promises: Promise<void>[] = [];
      
      for (const [key, item] of this.cache.entries()) {
        if (!this.memoryOnlyKeys.has(key)) {
          promises.push(
            AsyncStorage.setItem(
              `${this.config.storageKey}${key}`,
              JSON.stringify(item)
            )
          );
        }
      }
      
      await Promise.all(promises);
      // LoggingService.getInstance().debug('Cache sincronizado com AsyncStorage');
    } catch (error: any) {
      LoggingService.getInstance().error('Erro ao sincronizar cache', error);
    }
  }
}

// Exportar instância única
const cacheService = CacheService.getInstance();
(cacheService as any).getInstance = () => CacheService.getInstance();
export default cacheService;
