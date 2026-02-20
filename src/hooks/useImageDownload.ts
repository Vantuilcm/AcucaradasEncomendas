import { useState, useCallback, useRef } from 'react';
import { File, Directory, Paths } from '../utils/fs-shim';
import { loggingService } from '../services/LoggingService';

interface ImageDownloadState {
  downloadedUri: string | null;
  progress: number;
  loading: boolean;
  error: Error | null;
}

interface ImageDownloadHandlers {
  downloadImage: (imageUrl: string, filename?: string) => Promise<void>;
  cancelDownload: () => void;
}

// New FileSystem API: use Directory and Paths
const DOWNLOADS_DIRECTORY = new Directory(Paths.document, 'downloads');

export function useImageDownload(): [ImageDownloadState, ImageDownloadHandlers] {
  const [state, setState] = useState<ImageDownloadState>({
    downloadedUri: null,
    progress: 0,
    loading: false,
    error: null,
  });

  // Using new API does not support resumable downloads yet; use a cancel flag
  const cancelFlagRef = useRef(false);

  const ensureDownloadsDirectory = useCallback(async () => {
    try {
      if (!DOWNLOADS_DIRECTORY.exists) {
        DOWNLOADS_DIRECTORY.create({ intermediates: true, idempotent: true });
        loggingService.info('Diretório de downloads criado');
      }
    } catch (err) {
      loggingService.error('Falha ao garantir diretório de downloads', err as Error);
      throw err;
    }
  }, []);

  const getUniqueFilename = useCallback((originalFilename: string): string => {
    const timestamp = new Date().getTime();
    const extension = originalFilename.split('.').pop() || 'jpg';
    return `${timestamp}.${extension}`;
  }, []);

  const downloadImage = useCallback(
    async (imageUrl: string, filename?: string) => {
      try {
        setState(prev => ({
          ...prev,
          loading: true,
          error: null,
          progress: 0,
          downloadedUri: null,
        }));

        await ensureDownloadsDirectory();

        const downloadFilename = filename || getUniqueFilename(imageUrl);
        const destinationFile = new File(DOWNLOADS_DIRECTORY, downloadFilename);

        // New API does not provide progress callback; update progress at start/end
        cancelFlagRef.current = false;
        // Start download
        const downloadedFile = await File.downloadFileAsync(imageUrl, destinationFile, {
          idempotent: true,
        });

        if (!cancelFlagRef.current && downloadedFile?.uri) {
          setState(prev => ({
            ...prev,
            downloadedUri: downloadedFile.uri,
            loading: false,
            progress: 100,
          }));
          loggingService.info('Download da imagem concluído com sucesso', {
            uri: downloadedFile.uri,
            filename: downloadFilename,
          });
        } else {
          throw new Error('Download falhou - URI não recebida');
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro no download da imagem', err as Error);
      } finally {
        cancelFlagRef.current = false;
      }
    },
    [ensureDownloadsDirectory, getUniqueFilename]
  );

  const cancelDownload = useCallback(() => {
    // New API does not support cancelling ongoing downloads directly.
    // Use a cancel flag to skip state updates; user may need to clear partial files manually.
    if (state.loading) {
      cancelFlagRef.current = true;
      setState(prev => ({
        ...prev,
        loading: false,
        progress: 0,
      }));
      loggingService.warn('Cancelamento de download solicitado (sem suporte a cancelamento nativo)');
    }
  }, [state.loading]);

  return [
    state,
    {
      downloadImage,
      cancelDownload,
    },
  ];
}
