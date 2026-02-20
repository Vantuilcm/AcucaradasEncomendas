import { useState, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { loggingService } from '../services/LoggingService';

interface ImageGalleryState {
  images: MediaLibrary.Asset[];
  totalCount: number;
  hasNextPage: boolean;
  loading: boolean;
  error: Error | null;
}

interface ImageGalleryHandlers {
  loadImages: (first?: number, after?: string) => Promise<void>;
  refreshImages: () => Promise<void>;
  saveImageToGallery: (imageUri: string) => Promise<void>;
  deleteImage: (asset: MediaLibrary.Asset) => Promise<void>;
  createAlbum: (albumName: string, assetIds: string[]) => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 20;

export function useImageGallery(): [ImageGalleryState, ImageGalleryHandlers] {
  const [state, setState] = useState<ImageGalleryState>({
    images: [],
    totalCount: 0,
    hasNextPage: false,
    loading: false,
    error: null,
  });

  const requestPermissions = useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão da galeria negada');
    }
    loggingService.info('Permissão da galeria concedida');
  }, []);

  const loadImages = useCallback(
    async (first: number = DEFAULT_PAGE_SIZE, after?: string) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        await requestPermissions();

        const { assets, endCursor, hasNextPage, totalCount } = await MediaLibrary.getAssetsAsync({
          first,
          after,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        setState(prev => ({
          ...prev,
          images: after ? [...prev.images, ...assets] : assets,
          hasNextPage: hasNextPage || false,
          totalCount,
          loading: false,
        }));

        loggingService.info('Imagens carregadas com sucesso', {
          count: assets.length,
          totalCount,
          hasNextPage,
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao carregar imagens', { error: err });
      }
    },
    [requestPermissions]
  );

  const refreshImages = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await loadImages();
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao atualizar imagens', { error: err });
    }
  }, [loadImages]);

  const saveImageToGallery = useCallback(
    async (imageUri: string) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        await requestPermissions();

        const asset = await MediaLibrary.createAssetAsync(imageUri);

        setState(prev => ({
          ...prev,
          loading: false,
        }));

        loggingService.info('Imagem salva na galeria com sucesso', { asset });
        await refreshImages();
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao salvar imagem na galeria', { error: err });
      }
    },
    [requestPermissions, refreshImages]
  );

  const deleteImage = useCallback(
    async (asset: MediaLibrary.Asset) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        await requestPermissions();

        await MediaLibrary.deleteAssetsAsync([asset]);

        setState(prev => ({
          ...prev,
          images: prev.images.filter(img => img.id !== asset.id),
          totalCount: prev.totalCount - 1,
          loading: false,
        }));

        loggingService.info('Imagem deletada com sucesso', { assetId: asset.id });
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao deletar imagem', { error: err });
      }
    },
    [requestPermissions]
  );

  const createAlbum = useCallback(
    async (albumName: string, assetIds: string[]) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        await requestPermissions();

        const album = await MediaLibrary.createAlbumAsync(albumName, assetIds[0], false);

        if (assetIds.length > 1) {
          await MediaLibrary.addAssetsToAlbumAsync(assetIds.slice(1), album, false);
        }

        setState(prev => ({
          ...prev,
          loading: false,
        }));

        loggingService.info('Álbum criado com sucesso', { albumName, assetCount: assetIds.length });
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao criar álbum', { error: err });
      }
    },
    [requestPermissions]
  );

  return [
    state,
    {
      loadImages,
      refreshImages,
      saveImageToGallery,
      deleteImage,
      createAlbum,
    },
  ];
}
