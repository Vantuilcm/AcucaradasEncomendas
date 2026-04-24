import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { loggingService } from '../services/LoggingService';

interface CameraState {
  photo: ImagePicker.ImagePickerResult | null;
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

      const result = await ImagePicker.launchCameraAsync({
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
        loggingService.info('Foto tirada com sucesso', { uri: result.assets[0].uri });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
        }));
        loggingService.info('Captura de foto cancelada');
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao tirar foto', { error: err });
    }
  }, [requestPermissions]);

  const pickImage = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permissão da galeria negada');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
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
        loggingService.info('Imagem selecionada com sucesso', { uri: result.assets[0].uri });
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
