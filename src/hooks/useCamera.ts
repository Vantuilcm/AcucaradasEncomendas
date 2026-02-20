import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { loggingService } from '../services/LoggingService';

// Local result type to minimize dependency on expo-image-picker union types across versions
type PickerResult = {
  canceled: boolean;
  assets?: Array<{
    uri: string;
    width?: number;
    height?: number;
    type?: string;
    fileName?: string;
  }>;
};

interface CameraState {
  photo: PickerResult | null;
  loading: boolean;
  error: Error | null;
}

interface CameraHandlers {
  takePhoto: () => Promise<void>;
  pickImage: () => Promise<void>;
  clearPhoto: () => void;
}

export function useCamera(): [CameraState, CameraHandlers] {
  const [state, setState] = useState<CameraState>({
    photo: null,
    loading: false,
    error: null,
  });

  const requestPermissions = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão da câmera negada');
    }
    loggingService.info('Permissão da câmera concedida');
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await requestPermissions();

      const result: PickerResult = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setState(prev => ({
          ...prev,
          photo: result,
          loading: false,
        }));
        const firstAssetUri = result.assets?.[0]?.uri;
        if (firstAssetUri) {
          loggingService.info('Foto tirada com sucesso', { uri: firstAssetUri });
        } else {
          loggingService.info('Foto tirada com sucesso');
        }
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
        }));
        loggingService.info('Captura de foto cancelada');
      }
    } catch (err: unknown) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
      loggingService.error(
        'Erro ao tirar foto',
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }, [requestPermissions]);

  const pickImage = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permissão da galeria negada');
      }

      const result: PickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setState(prev => ({
          ...prev,
          photo: result,
          loading: false,
        }));
        const firstAssetUri = result.assets?.[0]?.uri;
        if (firstAssetUri) {
          loggingService.info('Imagem selecionada com sucesso', { uri: firstAssetUri });
        } else {
          loggingService.info('Imagem selecionada com sucesso');
        }
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
        }));
        loggingService.info('Seleção de imagem cancelada');
      }
    } catch (err: unknown) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
      loggingService.error(
        'Erro ao selecionar imagem',
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }, []);

  const clearPhoto = useCallback(() => {
    setState(prev => ({
      ...prev,
      photo: null,
      error: null,
    }));
    loggingService.info('Foto limpa');
  }, []);

  return [
    state,
    {
      takePhoto,
      pickImage,
      clearPhoto,
    },
  ];
}
