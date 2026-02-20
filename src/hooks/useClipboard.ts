import { useState, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import { loggingService } from '../services/LoggingService';

interface ClipboardState {
  content: string | null;
  loading: boolean;
  error: Error | null;
}

interface ClipboardHandlers {
  copyToClipboard: (text: string) => Promise<void>;
  getClipboardContent: () => Promise<void>;
  clearClipboard: () => Promise<void>;
}

export function useClipboard(): [ClipboardState, ClipboardHandlers] {
  const [state, setState] = useState<ClipboardState>({
    content: null,
    loading: false,
    error: null,
  });

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await Clipboard.setStringAsync(text);
      setState(prev => ({
        ...prev,
        content: text,
        loading: false,
      }));
      loggingService.info('Texto copiado para a área de transferência');
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao copiar texto para a área de transferência', { error: err });
    }
  }, []);

  const getClipboardContent = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const content = await Clipboard.getStringAsync();
      setState(prev => ({
        ...prev,
        content,
        loading: false,
      }));
      loggingService.info('Conteúdo da área de transferência obtido');
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao obter conteúdo da área de transferência', { error: err });
    }
  }, []);

  const clearClipboard = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await Clipboard.setStringAsync('');
      setState(prev => ({
        ...prev,
        content: null,
        loading: false,
      }));
      loggingService.info('Área de transferência limpa');
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao limpar área de transferência', { error: err });
    }
  }, []);

  return [
    state,
    {
      copyToClipboard,
      getClipboardContent,
      clearClipboard,
    },
  ];
}
