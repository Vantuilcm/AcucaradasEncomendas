import { useState, useCallback } from 'react';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { loggingService } from '../services/LoggingService';

interface ShareState {
  isAvailable: boolean;
  isSharing: boolean;
  error: Error | null;
}

interface ShareHandlers {
  share: (options: ShareOptions) => Promise<void>;
  shareUrl: (url: string) => Promise<void>;
  shareFile: (fileUri: string, options?: ShareFileOptions) => Promise<void>;
  openUrl: (url: string, options?: OpenUrlOptions) => Promise<void>;
}

interface ShareOptions {
  message: string;
  title?: string;
  url?: string;
}

interface ShareFileOptions {
  mimeType?: string;
  dialogTitle?: string;
  UTI?: string;
}

interface OpenUrlOptions {
  showTitleRecipient?: boolean;
  enableBarCollapsing?: boolean;
  enableDefaultShare?: boolean;
  readerMode?: boolean;
  controlsColor?: string;
  backgroundColor?: string;
}

export function useShare(): [ShareState, ShareHandlers] {
  const [state, setState] = useState<ShareState>({
    isAvailable: false,
    isSharing: false,
    error: null,
  });

  // Verifica se o compartilhamento está disponível
  const checkAvailability = useCallback(async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      setState(prev => ({ ...prev, isAvailable }));
      loggingService.info('Disponibilidade do compartilhamento verificada', { isAvailable });
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err as Error,
      }));
      loggingService.error('Erro ao verificar disponibilidade do compartilhamento', { error: err });
    }
  }, []);

  const share = useCallback(
    async (options: ShareOptions) => {
      try {
        setState(prev => ({ ...prev, isSharing: true, error: null }));

        if (!state.isAvailable) {
          await checkAvailability();
        }

        if (!state.isAvailable) {
          throw new Error('Compartilhamento não disponível neste dispositivo');
        }

        // Implementa a lógica de compartilhamento específica da plataforma
        // Por exemplo, usando o Share API do React Native
        const result = await Sharing.shareAsync(options.message, {
          dialogTitle: options.title,
          mimeType: 'text/plain',
        });

        setState(prev => ({ ...prev, isSharing: false }));

        loggingService.info('Conteúdo compartilhado com sucesso', {
          message: options.message.substring(0, 50) + (options.message.length > 50 ? '...' : ''),
          title: options.title,
          url: options.url,
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          isSharing: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao compartilhar conteúdo', { error: err });
        throw err;
      }
    },
    [state.isAvailable, checkAvailability]
  );

  const shareUrl = useCallback(
    async (url: string) => {
      try {
        setState(prev => ({ ...prev, isSharing: true, error: null }));

        if (!state.isAvailable) {
          await checkAvailability();
        }

        if (!state.isAvailable) {
          throw new Error('Compartilhamento não disponível neste dispositivo');
        }

        const result = await Sharing.shareAsync(url, {
          dialogTitle: 'Compartilhar URL',
          mimeType: 'text/plain',
        });

        setState(prev => ({ ...prev, isSharing: false }));

        loggingService.info('URL compartilhada com sucesso', { url });
      } catch (err) {
        setState(prev => ({
          ...prev,
          isSharing: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao compartilhar URL', { error: err });
        throw err;
      }
    },
    [state.isAvailable, checkAvailability]
  );

  const shareFile = useCallback(
    async (fileUri: string, options: ShareFileOptions = {}) => {
      try {
        setState(prev => ({ ...prev, isSharing: true, error: null }));

        if (!state.isAvailable) {
          await checkAvailability();
        }

        if (!state.isAvailable) {
          throw new Error('Compartilhamento não disponível neste dispositivo');
        }

        const result = await Sharing.shareAsync(fileUri, {
          dialogTitle: options.dialogTitle || 'Compartilhar arquivo',
          mimeType: options.mimeType,
          UTI: options.UTI,
        });

        setState(prev => ({ ...prev, isSharing: false }));

        loggingService.info('Arquivo compartilhado com sucesso', {
          uri: fileUri,
          mimeType: options.mimeType,
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          isSharing: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao compartilhar arquivo', { error: err });
        throw err;
      }
    },
    [state.isAvailable, checkAvailability]
  );

  const openUrl = useCallback(async (url: string, options: OpenUrlOptions = {}) => {
    try {
      setState(prev => ({ ...prev, isSharing: true, error: null }));

      const result = await WebBrowser.openBrowserAsync(url, {
        showTitleRecipient: options.showTitleRecipient,
        enableBarCollapsing: options.enableBarCollapsing,
        enableDefaultShare: options.enableDefaultShare,
        readerMode: options.readerMode,
        controlsColor: options.controlsColor,
        backgroundColor: options.backgroundColor,
      });

      setState(prev => ({ ...prev, isSharing: false }));

      loggingService.info('URL aberta com sucesso', { url });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isSharing: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao abrir URL', { error: err });
      throw err;
    }
  }, []);

  return [
    state,
    {
      share,
      shareUrl,
      shareFile,
      openUrl,
    },
  ];
}
