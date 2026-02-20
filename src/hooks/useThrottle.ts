import { useCallback, useRef } from 'react';
import { loggingService } from '../services/LoggingService';

export function useThrottle<T extends (...args: any[]) => any>(callback: T, limit: number): T {
  const lastRunRef = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRunRef.current >= limit) {
        try {
          callback(...args);
          lastRunRef.current = now;
          loggingService.debug('Função throttled executada com sucesso');
        } catch (err) {
          loggingService.error('Erro ao executar função throttled', { error: err });
        }
      } else {
        loggingService.debug('Função throttled ignorada - muito frequente');
      }
    },
    [callback, limit]
  );

  return throttledCallback as T;
}
