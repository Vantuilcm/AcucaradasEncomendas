import { useState, useCallback } from 'react';
import { secureLoggingService } from '../services/SecureLoggingService';

interface LoadingState {
  loading: boolean;
  error: string | null;
}

interface LoadingHandlers {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  execute: <T>(operation: () => Promise<T>, context: string) => Promise<T>;
}

export function useLoadingState(): [LoadingState, LoadingHandlers] {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const execute = useCallback(
    async <T>(operation: () => Promise<T>, context: string): Promise<T> => {
      try {
        setLoading(true);
        setError(null);
        const result = await operation();
        secureLoggingService.info(`${context} completed successfully`, {
          timestamp: new Date().toISOString()
        });
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        secureLoggingService.security(`Erro em operação: ${context}`, {
          errorMessage: errorMessage,
          timestamp: new Date().toISOString(),
          severity: 'medium'
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return [
    { loading, error },
    { setLoading, setError, reset, execute },
  ];
}
