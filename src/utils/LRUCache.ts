/**
 * Implementação de um cache LRU (Least Recently Used) para otimizar o armazenamento em memória
 * e melhorar o desempenho do acesso a dados frequentemente utilizados.
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private keyTimestamps: Map<K, number>;
  private usageCounter: number = 0;
  private keyExpirations: Map<K, number>;

  /**
   * Cria uma nova instância do cache LRU
   * @param capacity Capacidade máxima do cache (número de itens)
   */
  constructor(capacity: number = 100) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
    this.keyTimestamps = new Map<K, number>();
    this.keyExpirations = new Map<K, number>();
    this.usageCounter = 0;
  }

  /**
   * Obtém um valor do cache
   * @param key Chave do item
   * @returns O valor associado à chave ou undefined se não existir ou estiver expirado
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Verificar expiração
    const expirationTime = this.keyExpirations.get(key);
    const now = Date.now();

    if (expirationTime && now > expirationTime) {
      this.delete(key);
      return undefined;
    }

    // Atualizar marcador de uso para LRU determinístico
    this.usageCounter++;
    this.keyTimestamps.set(key, this.usageCounter);
    return this.cache.get(key);
  }

  /**
   * Adiciona ou atualiza um item no cache
   * @param key Chave do item
   * @param value Valor a ser armazenado
   * @param expirationMinutes Tempo de expiração em minutos (opcional)
   */
  set(key: K, value: V, expirationMinutes?: number): void {
    // Se o cache estiver cheio e a chave não existir, remover o item menos recentemente usado
    if (this.cache.size >= this.capacity && !this.cache.has(key)) {
      this.evictLRU();
    }

    // Armazenar o valor e atualizar o timestamp
    this.cache.set(key, value);
    this.usageCounter++;
    this.keyTimestamps.set(key, this.usageCounter);

    // Definir expiração se fornecida
    if (expirationMinutes !== undefined) {
      const expirationTime = Date.now() + expirationMinutes * 60 * 1000;
      this.keyExpirations.set(key, expirationTime);
    } else {
      this.keyExpirations.delete(key); // Remover expiração se existir
    }
  }

  /**
   * Remove um item do cache
   * @param key Chave do item a ser removido
   */
  delete(key: K): void {
    this.cache.delete(key);
    this.keyTimestamps.delete(key);
    this.keyExpirations.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.keyTimestamps.clear();
    this.keyExpirations.clear();
  }

  /**
   * Verifica se uma chave existe no cache e não está expirada
   * @param key Chave a ser verificada
   * @returns true se a chave existir e não estiver expirada, false caso contrário
   */
  has(key: K): boolean {
    if (!this.cache.has(key)) {
      return false;
    }

    // Verificar expiração
    const expirationTime = this.keyExpirations.get(key);
    if (expirationTime && Date.now() > expirationTime) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Obtém o número de itens no cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Remove o item menos recentemente usado do cache
   * @private
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return;

    let oldestKey: K | null = null;
    let oldestTimestamp = Infinity;

    // Encontrar a chave com o timestamp mais antigo
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestKey = key;
      }
    }

    // Remover o item mais antigo
    if (oldestKey !== null) {
      this.delete(oldestKey);
    }
  }

  /**
   * Remove todos os itens expirados do cache
   * @returns Número de itens removidos
   */
  purgeExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, expirationTime] of this.keyExpirations.entries()) {
      if (now > expirationTime) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }
}
