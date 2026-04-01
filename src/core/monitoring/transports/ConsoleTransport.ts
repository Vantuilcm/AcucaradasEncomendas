// 📡 src/core/monitoring/transports/ConsoleTransport.ts
// Transportador para o console em ambiente de desenvolvimento.

import { LogEntry } from '../logger';
import { LogTransport } from './LogTransport';

export class ConsoleTransport implements LogTransport {
  name = 'Console';

  async send(logs: LogEntry[]): Promise<void> {
    if (!__DEV__) return;

    logs.forEach(log => {
      const emoji = log.severity === 'CRITICAL' ? '🚨' : log.severity === 'HIGH' ? '🔥' : log.severity === 'MEDIUM' ? '⚠️' : '📊';
      console.log(`${emoji} [BATCH:${this.name}] ${log.message}`, log.metadata || '');
    });
  }
}
