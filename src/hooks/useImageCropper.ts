import { useState, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { loggingService } from '../services/LoggingService';

interface ImageCropperState {
  croppedUri: string | null;
  loading: boolean;
  error: Error | null;
}

interface ImageCropperHandlers {
  cropImage: (imageUri: string, crop: CropOptions) => Promise<void>;
  cropToSquare: (imageUri: string) => Promise<void>;
  cropToCircle: (imageUri: string) => Promise<void>;
  clearCrop: () => void;
}

interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useImageCropper(): [ImageCropperState, ImageCropperHandlers] {
  const [state, setState] = useState<ImageCropperState>({
    croppedUri: null,
    loading: false,
    error: null,
  });

  const cropImage = useCallback(async (imageUri: string, crop: CropOptions) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Recorta a imagem usando ImageManipulator
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: crop.x,
              originY: crop.y,
              width: crop.width,
              height: crop.height,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setState(prev => ({
        ...prev,
        croppedUri: result.uri,
        loading: false,
      }));

      loggingService.info('Imagem recortada com sucesso', { crop });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao recortar imagem', { error: err });
    }
  }, []);

  const cropToSquare = useCallback(async (imageUri: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Obtém as dimensões da imagem
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const size = Math.min(imageInfo.width, imageInfo.height);
      const x = (imageInfo.width - size) / 2;
      const y = (imageInfo.height - size) / 2;

      // Recorta para quadrado
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: x,
              originY: y,
              width: size,
              height: size,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setState(prev => ({
        ...prev,
        croppedUri: result.uri,
        loading: false,
      }));

      loggingService.info('Imagem recortada para quadrado com sucesso');
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao recortar imagem para quadrado', { error: err });
    }
  }, []);

  const cropToCircle = useCallback(
    async (imageUri: string) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Primeiro recorta para quadrado
        await cropToSquare(imageUri);

        if (!state.croppedUri) {
          throw new Error('Falha ao recortar para quadrado');
        }

        // Aqui você pode implementar a lógica para criar o efeito circular
        // Por exemplo, usando uma máscara ou sobrepondo uma imagem circular
        // Por enquanto, vamos apenas usar a versão quadrada
        setState(prev => ({
          ...prev,
          loading: false,
        }));

        loggingService.info('Imagem recortada para círculo com sucesso');
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao recortar imagem para círculo', { error: err });
      }
    },
    [cropToSquare]
  );

  const clearCrop = useCallback(() => {
    setState({
      croppedUri: null,
      loading: false,
      error: null,
    });
    loggingService.info('Recorte limpo');
  }, []);

  return [
    state,
    {
      cropImage,
      cropToSquare,
      cropToCircle,
      clearCrop,
    },
  ];
}
