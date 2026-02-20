import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { loggingService } from '../services/LoggingService';

interface SelectedAsset {
  uri: string;
  width: number;
  height: number;
  type: string;
  fileName?: string;
  fileSize?: number;
}

interface ImagePickerState {
  selectedImage: SelectedAsset | null;
  loading: boolean;
  error: Error | null;
}

interface ImagePickerHandlers {
  pickImage: (options?: PickOptions) => Promise<void>;
  pickMultipleImages: (options?: PickOptions) => Promise<void>;
  clearSelection: () => void;
}

interface PickOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  mediaTypes?: any;
  allowsMultipleSelection?: boolean;
  maxImages?: number;
}

const DEFAULT_OPTIONS: PickOptions = {
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
  mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? 'Images',
  allowsMultipleSelection: false,
  maxImages: 1,
};

export function useImagePicker(): [ImagePickerState, ImagePickerHandlers] {
  const [state, setState] = useState<ImagePickerState>({
    selectedImage: null,
    loading: false,
    error: null,
  });

  const requestPermissions = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão da galeria negada');
    }
    loggingService.info('Permissão da galeria concedida');
  }, []);

  const pickImage = useCallback(
    async (options: PickOptions = {}) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        await requestPermissions();

        const finalOptions = { ...DEFAULT_OPTIONS, ...options };
        const result = await ImagePicker.launchImageLibraryAsync(finalOptions);

        if (!result.canceled) {
          setState(prev => ({
            ...prev,
            selectedImage: {
              uri: result.assets[0].uri,
              width: result.assets[0].width,
              height: result.assets[0].height,
              type: result.assets[0].type as string,
              fileName: (result.assets[0] as any).fileName,
              fileSize: (result.assets[0] as any).fileSize,
            },
            loading: false,
          }));

          loggingService.info('Imagem selecionada com sucesso', {
            uri: result.assets[0].uri,
            width: result.assets[0].width,
            height: result.assets[0].height,
            type: result.assets[0].type,
          });
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
          }));
          loggingService.info('Seleção de imagem cancelada');
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao selecionar imagem', { error: err });
      }
    },
    [requestPermissions]
  );

  const pickMultipleImages = useCallback(
    async (options: PickOptions = {}) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        await requestPermissions();

        const finalOptions = {
          ...DEFAULT_OPTIONS,
          ...options,
          allowsMultipleSelection: true,
        };

        const result = await ImagePicker.launchImageLibraryAsync(finalOptions);

        if (!result.canceled) {
          setState(prev => ({
            ...prev,
            selectedImage: {
              uri: result.assets[0].uri,
              width: result.assets[0].width,
              height: result.assets[0].height,
              type: result.assets[0].type as string,
              fileName: (result.assets[0] as any).fileName,
              fileSize: (result.assets[0] as any).fileSize,
            },
            loading: false,
          }));

          loggingService.info('Imagens selecionadas com sucesso', {
            count: result.assets.length,
            assets: result.assets.map((asset: any) => ({
              uri: asset.uri,
              width: asset.width,
              height: asset.height,
              type: asset.type as string,
            })),
          });
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
          }));
          loggingService.info('Seleção de imagens cancelada');
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao selecionar imagens', { error: err });
      }
    },
    [requestPermissions]
  );

  const clearSelection = useCallback(() => {
    setState({
      selectedImage: null,
      loading: false,
      error: null,
    });
    loggingService.info('Seleção de imagem limpa');
  }, []);

  return [
    state,
    {
      pickImage,
      pickMultipleImages,
      clearSelection,
    },
  ];
}
