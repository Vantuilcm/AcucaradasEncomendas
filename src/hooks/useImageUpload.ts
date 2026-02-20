import { useState, useCallback, useRef } from 'react';
import { File } from '../utils/fs-shim';
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadImage = useCallback(async (imageUri: string, options: UploadOptions = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const finalOptions = { ...DEFAULT_OPTIONS, ...options };

      // Verifica o tamanho do arquivo (novo API)
      const file = new File(imageUri);
      if (!file.exists) {
        throw new Error('Arquivo não encontrado');
      }

      const fileSize = file.size || 0;
      const maxSizeMb = (finalOptions.maxSize ?? DEFAULT_OPTIONS.maxSize)!;
      const maxSize = maxSizeMb * 1024 * 1024; // Converte para bytes

      if (fileSize > maxSize) {
        if (!finalOptions.compress) {
          throw new Error(`Arquivo muito grande. Tamanho máximo: ${finalOptions.maxSize}MB`);
        }

        // Comprime a imagem se necessário
        const quality = (finalOptions.compressQuality ?? DEFAULT_OPTIONS.compressQuality)!;
        const compressedUri = await compressImage(imageUri, quality);
        imageUri = compressedUri;
      }

      const startTime = Date.now();
      const uploadUrl = 'https://api.exemplo.com/upload'; // Substitua pela sua URL de upload

      // Preparar FormData para upload multipart
      const formData = new FormData();
      // Inferir nome do arquivo a partir da URI
      const uriParts = imageUri.split(/[\\/]/);
      const lastPart = uriParts[uriParts.length - 1] || '';
      const fileName = lastPart.length > 0 ? lastPart : 'image.jpg';
      formData.append('timestamp', Date.now().toString());
      formData.append(
        'image',
        {
          uri: imageUri,
          name: fileName,
          type: 'image/jpeg',
        } as any // React Native FormData file object
      );

      // Abortar se necessário
      abortControllerRef.current = new AbortController();
      // Iniciar upload (sem progresso nativo)
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Falha no upload: ${response.status}`);
      }
      const data = await response.json();

      const endTime = Date.now();
      const durationSec = (endTime - startTime) / 1000;
      const speed = durationSec > 0 ? fileSize / durationSec : 0;

      setState(prev => ({
        ...prev,
        loading: false,
        uploadProgress: 1,
        uploadSpeed: speed,
        uploadTime: durationSec,
        uploadSize: fileSize,
      }));

      if (options.onProgress) options.onProgress(1);
      if (options.onSpeed) options.onSpeed(speed);

      setState(prev => ({
        ...prev,
        loading: false,
      }));

      loggingService.info('Imagem enviada com sucesso', {
        originalSize: fileSize,
        uploadSize: fileSize,
        uploadTime: durationSec,
        uploadSpeed: speed,
      });

      return data.url;
    } catch (err) {
      const errorObj = err as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorObj,
      }));
      loggingService.error('Erro ao enviar imagem', errorObj);
      throw errorObj;
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
        });

        return results;
      } catch (err) {
        const errorObj = err as Error;
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorObj,
        }));
        loggingService.error('Erro ao enviar imagens', errorObj);
        throw errorObj;
      }
    },
    [uploadImage]
  );

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      loading: false,
      error: new Error('Upload cancelado'),
    }));
    loggingService.info('Upload cancelado');
  }, []);

  // Função auxiliar para comprimir imagem
  const compressImage = async (imageUri: string, quality: number): Promise<string> => {
    // Placeholder: implement real compression via expo-image-manipulator if needed
    const originalFile = new File(imageUri);
    const compressedUri = `${imageUri}_compressed.jpg`;
    const compressedFile = new File(compressedUri);
    originalFile.copy(compressedFile);
    return compressedFile.uri;
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
