import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { loggingService } from '../services/LoggingService';

interface ImageMetadata {
  uri: string;
  width: number;
  height: number;
  type: string;
  size: number;
  creationTime: number;
  modificationTime: number;
  exif?: any;
}

interface ImageMetadataState {
  metadata: ImageMetadata | null;
  loading: boolean;
  error: Error | null;
}

interface ImageMetadataHandlers {
  loadMetadata: (imageUri: string) => Promise<void>;
  loadAssetMetadata: (asset: MediaLibrary.Asset) => Promise<void>;
  clearMetadata: () => void;
}

export function useImageMetadata(): [ImageMetadataState, ImageMetadataHandlers] {
  const [state, setState] = useState<ImageMetadataState>({
    metadata: null,
    loading: false,
    error: null,
  });

  const loadMetadata = useCallback(async (imageUri: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const info = await FileSystem.getInfoAsync(imageUri, { size: true });

      if (!info.exists) {
        throw new Error('Imagem não encontrada');
      }

      const metadata: ImageMetadata = {
        uri: imageUri,
        width: 0,
        height: 0,
        type: imageUri.split('.').pop()?.toLowerCase() || 'unknown',
        size: info.size || 0,
        creationTime: info.creationTime || Date.now(),
        modificationTime: info.modificationTime || Date.now(),
      };

      // Tenta carregar dados EXIF se disponível
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onload = e => {
          if (e.target?.result) {
            // Aqui você pode implementar um parser EXIF
            // Por enquanto vamos apenas registrar que temos os dados binários
            loggingService.info('Dados binários da imagem carregados');
          }
        };

        reader.readAsArrayBuffer(blob);
      } catch (exifErr) {
        loggingService.warn('Não foi possível carregar dados EXIF', { error: exifErr });
      }

      setState(prev => ({
        ...prev,
        metadata,
        loading: false,
      }));

      loggingService.info('Metadados da imagem carregados com sucesso', { metadata });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao carregar metadados da imagem', { error: err });
    }
  }, []);

  const loadAssetMetadata = useCallback(async (asset: MediaLibrary.Asset) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const metadata: ImageMetadata = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.mediaType === 'photo' ? 'image' : 'video',
        size: 0, // MediaLibrary não fornece o tamanho diretamente
        creationTime: asset.creationTime,
        modificationTime: asset.modificationTime,
        exif: asset.exif,
      };

      // Tenta obter o tamanho do arquivo
      try {
        const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
        if (info.exists) {
          metadata.size = info.size || 0;
        }
      } catch (sizeErr) {
        loggingService.warn('Não foi possível obter o tamanho do arquivo', { error: sizeErr });
      }

      setState(prev => ({
        ...prev,
        metadata,
        loading: false,
      }));

      loggingService.info('Metadados do asset carregados com sucesso', { metadata });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao carregar metadados do asset', { error: err });
    }
  }, []);

  const clearMetadata = useCallback(() => {
    setState({
      metadata: null,
      loading: false,
      error: null,
    });
    loggingService.info('Metadados limpos');
  }, []);

  return [
    state,
    {
      loadMetadata,
      loadAssetMetadata,
      clearMetadata,
    },
  ];
}
