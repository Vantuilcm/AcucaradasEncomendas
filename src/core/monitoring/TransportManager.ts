// 📦 src/core/monitoring/TransportManager.ts
// Gerenciador de transportes para envio de logs em lote (Etapa 4, 5, 6, 10).

import { getLogBatch, updateQueueAfterAttempt } from './logQueue';
import { LogTransport } from './transports/LogTransport';
import { ConsoleTransport } from './transports/ConsoleTransport';
import { MockRemoteTransport } from './transports/MockRemoteTransport';
import { ENV } from '../../config/env';

// Feature Flag: MONITORING_REMOTE_ENABLED (Etapa 10)
const MONITORING_REMOTE_ENABLED = ENV.EXPO_PUBLIC_MONITORING_REMOTE_ENABLED === 'true' || !__DEV__;

class TransportManager {
  private transports: LogTransport[] = [];
  private isFlushing = false;

  constructor() {
    this.transports.push(new ConsoleTransport());
    if (MONITORING_REMOTE_ENABLED) {
      this.transports.push(new MockRemoteTransport());
    }
  }

  /**
   * Dispara o envio dos logs em lote (Etapa 5).
   */
  async flushLogs(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      const batch = await getLogBatch();
      if (batch.length === 0) {
        this.isFlushing = false;
        return;
      }

      const allIds = batch.map(l => l.id);
      let failedIds: string[] = [];

      // Enviar para cada transportador cadastrado
      for (const transport of this.transports) {
        try {
          await transport.send(batch);
        } catch (error) {
          console.error(`❌ [TRANSPORT:${transport.name}] Falha no envio em lote.`, error);
          failedIds = [...new Set([...failedIds, ...allIds])];
        }
      }

      // Se nenhum transportador falhou, sucesso total
      const sentIds = allIds.filter(id => !failedIds.includes(id));
      await updateQueueAfterAttempt(sentIds, failedIds);

      // Continuar enviando se houver mais na fila
      if (sentIds.length > 0) {
        await this.flushLogs();
      }
    } catch (error) {
      console.error('❌ [TRANSPORT-MANAGER] Erro durante o flush:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Adiciona um novo transportador dinamicamente (para Sentry/Firebase futuramente).
   */
  addTransport(transport: LogTransport) {
    this.transports.push(transport);
  }
}

export const transportManager = new TransportManager();
