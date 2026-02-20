import { useEffect, useRef } from 'react';
import { loggingService } from '../services/LoggingService';

export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      loggingService.debug('Timeout cancelado');
      return;
    }

    const id = setTimeout(() => {
      try {
        savedCallback.current();
        loggingService.debug('Função do timeout executada com sucesso');
      } catch (err) {
        loggingService.error('Erro ao executar função do timeout', { error: err });
      }
    }, delay);

    loggingService.debug('Timeout iniciado', { delay });

    return () => {
      clearTimeout(id);
      loggingService.debug('Timeout limpo');
    };
  }, [delay]);
}
