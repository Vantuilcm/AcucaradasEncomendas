import { useState, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { loggingService } from '../services/LoggingService';

interface ImageCompressionState {
  compressedUri: string | null;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  loading: boolean;
  error: Error | null;
}

interface ImageCompressionHandlers {
  compressImage: (imageUri: string, options?: CompressionOptions) => Promise<void>;
  compressToMaxSize: (imageUri: string, maxSizeInMB: number) => Promise<void>;
  clearCompression: () => void;
}

interface CompressionOptions {
  quality?: number; // 0 a 1
  maxWidth?: number;
  maxHeight?: number;
  format?: ImageManipulator.SaveFormat;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  quality: 0.7,
  format: ImageManipulator.SaveFormat.JPEG,
};

export function useImageCompression(): [ImageCompressionState, ImageCompressionHandlers] {
  const [state, setState] = useState<ImageCompressionState>({
    compressedUri: null,
    originalSize: 0,
    compressedSize: 0,
    compressionRatio: 0,
    loading: false,
    error: null,
  });

  const compressImage = useCallback(async (imageUri: string, options: CompressionOptions = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Obtém o tamanho original
      const originalInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const finalOptions = { ...DEFAULT_OPTIONS, ...options };
      const actions: ImageManipulator.Action[] = [];

      // Adiciona redimensionamento se necessário
      if (finalOptions.maxWidth || finalOptions.maxHeight) {
        actions.push({
          resize: {
            width: finalOptions.maxWidth,
            height: finalOptions.maxHeight,
          },
        });
      }

      // Comprime a imagem
      const result = await ImageManipulator.manipulateAsync(imageUri, actions, {
        compress: finalOptions.quality,
        format: finalOptions.format,
      });

      // Obtém o tamanho do arquivo comprimido
      const compressedInfo = await ImageManipulator.manipulateAsync(result.uri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const originalSize = originalInfo.width * originalInfo.height;
      const compressedSize = compressedInfo.width * compressedInfo.height;
      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      setState(prev => ({
        ...prev,
        compressedUri: result.uri,
        originalSize,
        compressedSize,
        compressionRatio,
        loading: false,
      }));

      loggingService.info('Imagem comprimida com sucesso', {
        originalSize,
        compressedSize,
        compressionRatio: `${compressionRatio.toFixed(2)}%`,
        options: finalOptions,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao comprimir imagem', { error: err });
    }
  }, []);

  const compressToMaxSize = useCallback(async (imageUri: string, maxSizeInMB: number) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      let quality = 0.7;
      let compressedUri = imageUri;
      let compressedSize = 0;
      const maxSize = maxSizeInMB * 1024 * 1024; // Converte para bytes

      // Obtém o tamanho original
      const originalInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const originalSize = originalInfo.width * originalInfo.height;

      // Tenta diferentes níveis de compressão até atingir o tamanho máximo
      while (quality > 0.1) {
        const result = await ImageManipulator.manipulateAsync(imageUri, [], {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        });

        const info = await ImageManipulator.manipulateAsync(result.uri, [], {
          format: ImageManipulator.SaveFormat.JPEG,
        });

        compressedSize = info.width * info.height;

        if (compressedSize <= maxSize) {
          compressedUri = result.uri;
          break;
        }

        quality -= 0.1;
      }

      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      setState(prev => ({
        ...prev,
        compressedUri,
        originalSize,
        compressedSize,
        compressionRatio,
        loading: false,
      }));

      loggingService.info('Imagem comprimida para tamanho máximo', {
        maxSizeInMB,
        originalSize,
        compressedSize,
        compressionRatio: `${compressionRatio.toFixed(2)}%`,
        finalQuality: quality,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao comprimir imagem para tamanho máximo', { error: err });
    }
  }, []);

  const clearCompression = useCallback(() => {
    setState({
      compressedUri: null,
      originalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      loading: false,
      error: null,
    });
    loggingService.info('Compressão limpa');
  }, []);

  return [
    state,
    {
      compressImage,
      compressToMaxSize,
      clearCompression,
    },
  ];
}
