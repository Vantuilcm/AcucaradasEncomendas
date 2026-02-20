import { useEffect, useRef } from 'react';
import { loggingService } from '../services/LoggingService';

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      loggingService.debug('Intervalo pausado');
      return;
    }

    const id = setInterval(() => {
      try {
        savedCallback.current();
        loggingService.debug('Função do intervalo executada com sucesso');
      } catch (err) {
        loggingService.error('Erro ao executar função do intervalo', { error: err });
      }
    }, delay);

    loggingService.debug('Intervalo iniciado', { delay });

    return () => {
      clearInterval(id);
      loggingService.debug('Intervalo limpo');
    };
  }, [delay]);
}
