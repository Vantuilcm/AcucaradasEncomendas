import { useState, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { loggingService } from '../services/LoggingService';

interface ImageFilterState {
  filteredUri: string | null;
  loading: boolean;
  error: Error | null;
}

interface ImageFilterHandlers {
  applyFilter: (imageUri: string, filter: ImageFilter) => Promise<void>;
  applyMultipleFilters: (imageUri: string, filters: ImageFilter[]) => Promise<void>;
  clearFilter: () => void;
}

export type ImageFilter = {
  type: 'brightness' | 'contrast' | 'saturation' | 'blur' | 'grayscale' | 'sepia' | 'invert';
  value: number;
};

const DEFAULT_FILTERS: Record<ImageFilter['type'], number> = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
};

export function useImageFilters(): [ImageFilterState, ImageFilterHandlers] {
  const [state, setState] = useState<ImageFilterState>({
    filteredUri: null,
    loading: false,
    error: null,
  });

  const applyFilter = useCallback(async (imageUri: string, filter: ImageFilter) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Aplica o filtro usando ImageManipulator
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            filter: filter.type,
            value: filter.value,
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setState(prev => ({
        ...prev,
        filteredUri: result.uri,
        loading: false,
      }));

      loggingService.info('Filtro aplicado com sucesso', { filter });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao aplicar filtro', { error: err });
    }
  }, []);

  const applyMultipleFilters = useCallback(async (imageUri: string, filters: ImageFilter[]) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Aplica múltiplos filtros em sequência
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        filters.map(filter => ({
          filter: filter.type,
          value: filter.value,
        })),
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setState(prev => ({
        ...prev,
        filteredUri: result.uri,
        loading: false,
      }));

      loggingService.info('Filtros aplicados com sucesso', { filters });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao aplicar filtros', { error: err });
    }
  }, []);

  const clearFilter = useCallback(() => {
    setState({
      filteredUri: null,
      loading: false,
      error: null,
    });
    loggingService.info('Filtros limpos');
  }, []);

  return [
    state,
    {
      applyFilter,
      applyMultipleFilters,
      clearFilter,
    },
  ];
}
