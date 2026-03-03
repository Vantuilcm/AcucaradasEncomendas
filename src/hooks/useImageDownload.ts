import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
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

const DOWNLOADS_DIRECTORY = `${FileSystem.documentDirectory}downloads/`;

export function useImageDownload(): [ImageDownloadState, ImageDownloadHandlers] {
  const [state, setState] = useState<ImageDownloadState>({
    downloadedUri: null,
    progress: 0,
    loading: false,
    error: null,
  });

  const [downloadTask, setDownloadTask] = useState<FileSystem.DownloadResumable | null>(null);

  const ensureDownloadsDirectory = useCallback(async () => {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIRECTORY, { intermediates: true });
      loggingService.info('Diretório de downloads criado');
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
        const fileUri = `${DOWNLOADS_DIRECTORY}${downloadFilename}`;

        const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
          const progress =
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
          setState(prev => ({
            ...prev,
            progress,
          }));
          loggingService.debug('Progresso do download', { progress });
        };

        const downloadResumable = FileSystem.createDownloadResumable(
          imageUrl,
          fileUri,
          {},
          callback
        );

        setDownloadTask(downloadResumable);

        const { uri } = await downloadResumable.downloadAsync();

        if (uri) {
          setState(prev => ({
            ...prev,
            downloadedUri: uri,
            loading: false,
            progress: 100,
          }));
          loggingService.info('Download da imagem concluído com sucesso', { uri });
        } else {
          throw new Error('Download falhou - URI não recebida');
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro no download da imagem', { error: err });
      } finally {
        setDownloadTask(null);
      }
    },
    [ensureDownloadsDirectory, getUniqueFilename]
  );

  const cancelDownload = useCallback(() => {
    if (downloadTask) {
      downloadTask.cancelAsync();
      setDownloadTask(null);
      setState(prev => ({
        ...prev,
        loading: false,
        progress: 0,
      }));
      loggingService.info('Download cancelado');
    }
  }, [downloadTask]);

  return [
    state,
    {
      downloadImage,
      cancelDownload,
    },
  ];
}
