// 📡 src/core/monitoring/transports/LogTransport.ts
// Interface padrão para transportes de logs (Etapa 4).

import { LogEntry } from '../logger';

export interface LogTransport {
  name: string;
  send(logs: LogEntry[]): Promise<void>;
}
