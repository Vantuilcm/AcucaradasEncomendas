// 📡 src/core/monitoring/transports/MockRemoteTransport.ts
// Transportador simulado para destino remoto (Etapa 4).

import { LogEntry } from '../logger';
import { LogTransport } from './LogTransport';

export class MockRemoteTransport implements LogTransport {
  name = 'Remote (Mock)';

  async send(logs: LogEntry[]): Promise<void> {
    // Simula envio remoto com atraso
    return new Promise((resolve, reject) => {
      console.log(`📡 [TRANSPORT:${this.name}] Enviando lote de ${logs.length} logs para destino remoto...`);
      
      setTimeout(() => {
        // Simula 10% de chance de falha
        if (Math.random() < 0.1) {
          console.error(`❌ [TRANSPORT:${this.name}] Falha no envio remoto.`);
          reject(new Error('Falha no transporte remoto'));
        } else {
          console.log(`✅ [TRANSPORT:${this.name}] Lote de ${logs.length} logs enviado com sucesso.`);
          resolve();
        }
      }, 1500);
    });
  }
}
