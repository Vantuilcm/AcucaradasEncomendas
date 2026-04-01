// 📦 src/core/monitoring/logQueue.ts
// Gerenciamento de fila local para envio de logs em lote com retry.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogEntry } from './logger';

const QUEUE_STORAGE_KEY = '@app_log_queue';
const MAX_QUEUE_SIZE = 100;
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

export interface QueuedLog extends LogEntry {
  retryCount: number;
  lastAttempt?: string;
}

/**
 * Adiciona um log à fila de envio.
 */
export async function enqueueLog(entry: LogEntry) {
  try {
    const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    let queue: QueuedLog[] = storedQueue ? JSON.parse(storedQueue) : [];

    const queuedEntry: QueuedLog = {
      ...entry,
      retryCount: 0,
    };

    queue.push(queuedEntry);

    // Limitar tamanho da fila (descarta os mais antigos)
    if (queue.length > MAX_QUEUE_SIZE) {
      queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
    }

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('❌ [LOG-QUEUE] Erro ao enfileirar log:', error);
  }
}

/**
 * Recupera um lote de logs para envio.
 */
export async function getLogBatch(): Promise<QueuedLog[]> {
  try {
    const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!storedQueue) return [];
    
    const queue: QueuedLog[] = JSON.parse(storedQueue);
    return queue.slice(0, BATCH_SIZE);
  } catch (error) {
    return [];
  }
}

/**
 * Remove logs enviados com sucesso ou que excederam o limite de retries.
 */
export async function updateQueueAfterAttempt(sentIds: string[], failedIds: string[]) {
  try {
    const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!storedQueue) return;

    let queue: QueuedLog[] = JSON.parse(storedQueue);

    // 1. Remover os que foram enviados com sucesso
    queue = queue.filter(item => !sentIds.includes(item.id));

    // 2. Incrementar retryCount dos que falharam
    queue = queue.map(item => {
      if (failedIds.includes(item.id)) {
        return {
          ...item,
          retryCount: item.retryCount + 1,
          lastAttempt: new Date().toISOString(),
        };
      }
      return item;
    });

    // 3. Remover os que excederam o limite de retries
    queue = queue.filter(item => item.retryCount < MAX_RETRIES);

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('❌ [LOG-QUEUE] Erro ao atualizar fila:', error);
  }
}

/**
 * Recupera toda a fila para diagnóstico (Etapa 11).
 */
export async function getFullQueue(): Promise<QueuedLog[]> {
  try {
    const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return storedQueue ? JSON.parse(storedQueue) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Limpa toda a fila (útil para debug ou reset).
 */
export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
}
