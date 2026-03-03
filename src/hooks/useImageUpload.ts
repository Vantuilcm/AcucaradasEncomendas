import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { loggingService } from '../services/LoggingService';

interface ImageUploadState {
  uploadProgress: number;
  uploadSpeed: number;
  uploadTime: number;
  uploadSize: number;
  loading: boolean;
  error: Error | null;
}

interface ImageUploadHandlers {
  uploadImage: (imageUri: string, options?: UploadOptions) => Promise<string>;
  uploadMultipleImages: (imageUris: string[], options?: UploadOptions) => Promise<string[]>;
  cancelUpload: () => void;
}

interface UploadOptions {
  maxSize?: number; // em MB
  compress?: boolean;
  compressQuality?: number;
  onProgress?: (progress: number) => void;
  onSpeed?: (speed: number) => void;
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxSize: 5, // 5MB
  compress: true,
  compressQuality: 0.7,
};

export function useImageUpload(): [ImageUploadState, ImageUploadHandlers] {
  const [state, setState] = useState<ImageUploadState>({
    uploadProgress: 0,
    uploadSpeed: 0,
    uploadTime: 0,
    uploadSize: 0,
    loading: false,
    error: null,
  });

  const uploadImage = useCallback(async (imageUri: string, options: UploadOptions = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const finalOptions = { ...DEFAULT_OPTIONS, ...options };

      // Verifica o tamanho do arquivo
      const fileInfo = await FileSystem.getInfoAsync(imageUri, { size: true });
      if (!fileInfo.exists) {
        throw new Error('Arquivo não encontrado');
      }

      const fileSize = fileInfo.size || 0;
      const maxSize = finalOptions.maxSize * 1024 * 1024; // Converte para bytes

      if (fileSize > maxSize) {
        if (!finalOptions.compress) {
          throw new Error(`Arquivo muito grande. Tamanho máximo: ${finalOptions.maxSize}MB`);
        }

        // Comprime a imagem se necessário
        const compressedUri = await compressImage(imageUri, finalOptions.compressQuality);
        imageUri = compressedUri;
      }

      // Simula o upload com progresso
      const startTime = Date.now();
      let lastProgress = 0;
      let lastTime = startTime;

      const uploadUrl = 'https://api.exemplo.com/upload'; // Substitua pela sua URL de upload
      const uploadTask = FileSystem.createUploadTask(
        uploadUrl,
        imageUri,
        {
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'image',
          mimeType: 'image/jpeg',
          parameters: {
            timestamp: Date.now().toString(),
          },
        },
        uploadProgress => {
          const progress = uploadProgress.totalBytesSent / uploadProgress.totalBytesExpectedToSend;
          const currentTime = Date.now();
          const timeElapsed = (currentTime - lastTime) / 1000; // em segundos
          const bytesUploaded = uploadProgress.totalBytesSent - lastProgress;
          const speed = bytesUploaded / timeElapsed; // bytes por segundo

          setState(prev => ({
            ...prev,
            uploadProgress: progress,
            uploadSpeed: speed,
            uploadTime: (currentTime - startTime) / 1000,
            uploadSize: uploadProgress.totalBytesSent,
          }));

          if (options.onProgress) {
            options.onProgress(progress);
          }
          if (options.onSpeed) {
            options.onSpeed(speed);
          }

          lastProgress = uploadProgress.totalBytesSent;
          lastTime = currentTime;
        }
      );

      const result = await uploadTask.uploadAsync();
      const response = await fetch(result.uri);
      const data = await response.json();

      setState(prev => ({
        ...prev,
        loading: false,
      }));

      loggingService.info('Imagem enviada com sucesso', {
        originalSize: fileSize,
        uploadSize: state.uploadSize,
        uploadTime: state.uploadTime,
        uploadSpeed: state.uploadSpeed,
      });

      return data.url;
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao enviar imagem', { error: err });
      throw err;
    }
  }, []);

  const uploadMultipleImages = useCallback(
    async (imageUris: string[], options: UploadOptions = {}) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const uploadPromises = imageUris.map(uri => uploadImage(uri, options));
        const results = await Promise.all(uploadPromises);

        setState(prev => ({
          ...prev,
          loading: false,
        }));

        loggingService.info('Imagens enviadas com sucesso', {
          count: imageUris.length,
          uploadTime: state.uploadTime,
        });

        return results;
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao enviar imagens', { error: err });
        throw err;
      }
    },
    [uploadImage]
  );

  const cancelUpload = useCallback(() => {
    // Implementar cancelamento do upload se necessário
    setState(prev => ({
      ...prev,
      loading: false,
      error: new Error('Upload cancelado'),
    }));
    loggingService.info('Upload cancelado');
  }, []);

  // Função auxiliar para comprimir imagem
  const compressImage = async (imageUri: string, quality: number): Promise<string> => {
    const compressedUri = `${imageUri}_compressed.jpg`;
    await FileSystem.copyAsync({
      from: imageUri,
      to: compressedUri,
    });
    return compressedUri;
  };

  return [
    state,
    {
      uploadImage,
      uploadMultipleImages,
      cancelUpload,
    },
  ];
}
