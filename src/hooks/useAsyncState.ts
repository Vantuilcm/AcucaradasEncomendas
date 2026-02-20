import { useState, useCallback } from 'react';
import { loggingService } from '../services/LoggingService';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<void>;
  reset: () => void;
}

export function useAsyncState<T>(asyncFunction: () => Promise<T>, context: string): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();
      setData(result);
      loggingService.info(`${context} executado com sucesso`);
    } catch (err) {
      const errorMessage = `Erro ao executar ${context}`;
      setError(errorMessage);
      loggingService.error(errorMessage, err as Error);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, context]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}
