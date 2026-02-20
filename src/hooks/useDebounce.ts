import { useCallback, useRef } from 'react';
import { loggingService } from '../services/LoggingService';

export function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        loggingService.debug('Debounce timeout limpo');
      }

      timeoutRef.current = setTimeout(() => {
        try {
          callback(...args);
          loggingService.debug('FunÃ§Ã£o debounced executada com sucesso');
        } catch (err) {
          loggingService.error('Erro ao executar funÃ§Ã£o debounced', { error: err });
        }
      }, delay);
    },
    [callback, delay]
  );

  return debouncedCallback as T;
}

