import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Product } from '../types/Product';

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
 * Serviço de cache para armazenamento persistente de dados
 * Implementa política LRU (Least Recently Used) para gerenciamento de espaço
 */
class CacheService {
  private static instance: CacheService;
  private config: CacheConfig;
  private memoryCache: Map<string, CacheItem<any>>;
  private isNetworkAvailable = true;

  private constructor() {
    this.config = {
      maxSize: 100,
      defaultExpiration: 24 * 60 * 60 * 1000, // 24 horas
      storageKey: 'app_cache_',
    };
    this.memoryCache = new Map();
    
    // Monitorar conectividade de rede
    NetInfo.addEventListener(state => {
      this.isNetworkAvailable = state.isConnected ?? false;
    });
    
    // Carregar cache do armazenamento persistente
    this.loadFromStorage();
  }

  /**
   * Obtém a instância singleton do serviço
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Carrega o cache do AsyncStorage para a memória
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (!keys) return;
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storageKey));
      
      if (cacheKeys.length > 0) {
        const storedItems = await AsyncStorage.multiGet(cacheKeys);
        
        for (const [key, value] of storedItems) {
          if (value) {
            const cacheKey = key.replace(this.config.storageKey, '');
            const cacheItem = JSON.parse(value) as CacheItem<any>;
            
            // Verificar se o item ainda é válido
            if (cacheItem.expiration > Date.now()) {
              this.memoryCache.set(cacheKey, cacheItem);
            } else {
              // Remover itens expirados
              AsyncStorage.removeItem(key).catch(console.error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar cache do armazenamento:', error);
    }
  }

  /**
   * Gerencia o tamanho do cache usando política LRU
   */
  private async enforceSizeLimit(): Promise<void> {
    if (this.memoryCache.size <= this.config.maxSize) return;

    // Ordenar itens por último acesso (mais antigos primeiro)
    const sortedItems = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remover os itens mais antigos
    const itemsToRemove = sortedItems.slice(0, sortedItems.length - this.config.maxSize);
    
    for (const [key] of itemsToRemove) {
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(`${this.config.storageKey}${key}`);
    }
  }

  /**
   * Armazena um item no cache
   * @param key Chave do item
   * @param value Valor a ser armazenado
   * @param expirationTime Tempo de expiração em milissegundos (opcional)
   */
  public async set<T>(key: string, value: T, expirationTime?: number): Promise<void> {
    const now = Date.now();
    const cacheItem: CacheItem<T> = {
      value,
      expiration: now + (expirationTime || this.config.defaultExpiration),
      lastAccessed: now,
    };

    try {
      // Armazenar em memória
      this.memoryCache.set(key, cacheItem);
      
      // Armazenar no AsyncStorage
      await AsyncStorage.setItem(
        `${this.config.storageKey}${key}`,
        JSON.stringify(cacheItem)
      );
      
      // Verificar limite de tamanho do cache
      await this.enforceSizeLimit();
    } catch (error) {
      console.error(`Erro ao armazenar item de cache: ${key}`, error);
    }
  }

  /**
   * Obtém um item do cache
   * @param key Chave do item
   * @returns O valor armazenado ou null se não encontrado/expirado
   */
  public async get<T>(key: string): Promise<T | null> {
    // Verificar cache em memória primeiro
    const memoryItem = this.memoryCache.get(key) as CacheItem<T> | undefined;
    
    if (memoryItem) {
      const now = Date.now();
      
      // Verificar expiração
      if (memoryItem.expiration > now) {
        // Atualizar timestamp de último acesso
        memoryItem.lastAccessed = now;
        this.memoryCache.set(key, memoryItem);
        
        // Atualizar no AsyncStorage
        AsyncStorage.setItem(
          `${this.config.storageKey}${key}`,
          JSON.stringify(memoryItem)
        ).catch(console.error);
        
        return memoryItem.value;
      } else {
        // Remover item expirado
        this.memoryCache.delete(key);
        AsyncStorage.removeItem(`${this.config.storageKey}${key}`).catch(console.error);
      }
    }
    
    // Verificar AsyncStorage como fallback
    try {
      const storedItem = await AsyncStorage.getItem(`${this.config.storageKey}${key}`);
      
      if (storedItem) {
        const cacheItem = JSON.parse(storedItem) as CacheItem<T>;
        const now = Date.now();
        
        if (cacheItem.expiration > now) {
          // Atualizar timestamp de último acesso
          cacheItem.lastAccessed = now;
          
          // Armazenar em memória e atualizar no AsyncStorage
          this.memoryCache.set(key, cacheItem);
          AsyncStorage.setItem(
            `${this.config.storageKey}${key}`,
            JSON.stringify(cacheItem)
          ).catch(console.error);
          
          return cacheItem.value;
        } else {
          // Remover item expirado
          AsyncStorage.removeItem(`${this.config.storageKey}${key}`).catch(console.error);
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar item de cache: ${key}`, error);
    }
    
    return null;
  }

  /**
   * Verifica se um item existe no cache e não está expirado
   * @param key Chave do item
   * @returns true se o item existir e for válido
   */
  public async has(key: string): Promise<boolean> {
    const item = await this.get(key);
    return item !== null;
  }

  /**
   * Remove um item do cache
   * @param key Chave do item
   */
  public async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await AsyncStorage.removeItem(`${this.config.storageKey}${key}`);
  }

  /**
   * Limpa todo o cache
   */
  public async clearAll(): Promise<void> {
    try {
      this.memoryCache.clear();
      
      const keys = await AsyncStorage.getAllKeys();
      if (!keys) return;
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storageKey));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  /**
   * Retorna status de conectividade de rede
   */
  public isOnline(): boolean {
    return this.isNetworkAvailable;
  }

  /**
   * Obtém os produtos do cache
   * Esta função retorna produtos do cache ou null caso não existam
   */
  public async getProducts(): Promise<Product[] | null> {
    return this.get<Product[]>('products');
  }

  /**
   * Armazena produtos no cache
   * @param products Lista de produtos
   * @param expirationTime Tempo de expiração opcional
   */
  public async cacheProducts(products: Product[], expirationTime?: number): Promise<void> {
    await this.set('products', products, expirationTime);
  }

  /**
   * Obtém um produto específico do cache pelo ID
   * @param productId ID do produto
   */
  public async getProductById(productId: string): Promise<Product | null> {
    const cacheKey = `product_${productId}`;
    return this.get<Product>(cacheKey);
  }

  /**
   * Armazena um produto específico no cache
   * @param product Produto a ser armazenado
   * @param expirationTime Tempo de expiração opcional
   */
  public async cacheProduct(product: Product, expirationTime?: number): Promise<void> {
    const cacheKey = `product_${product.id}`;
    await this.set(cacheKey, product, expirationTime);
  }

  /**
   * Alias para compatibilidade com outros serviços (getItem)
   */
  public async getItem<T>(key: string): Promise<T | null> {
    return this.get<T>(key);
  }

  /**
   * Alias para compatibilidade com outros serviços (setItem)
   */
  public async setItem<T>(key: string, value: T, expirationTime?: number): Promise<void> {
    return this.set<T>(key, value, expirationTime);
  }

  /**
   * Alias para compatibilidade com outros serviços (removeItem)
   */
  public async removeItem(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await AsyncStorage.removeItem(`${this.config.storageKey}${key}`);
  }
}

export default CacheService;
