import { useRef, useEffect } from 'react';
import { loggingService } from '../services/LoggingService';

export function usePrevious<T>(value: T): T | undefined {
  // Initialize with undefined to satisfy useRef's required initial value
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
    loggingService.debug('Valor anterior atualizado', {
      previous: ref.current,
      current: value,
    });
  }, [value]);

  return ref.current;
}
