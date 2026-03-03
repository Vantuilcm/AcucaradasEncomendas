import { useRef, useEffect } from 'react';
import { loggingService } from '../services/LoggingService';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
    loggingService.debug('Valor anterior atualizado', {
      previous: ref.current,
      current: value,
    });
  }, [value]);

  return ref.current;
}
