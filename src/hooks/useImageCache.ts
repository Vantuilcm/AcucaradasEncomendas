import { useState, useCallback, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { loggingService } from '../services/LoggingService';

interface ImageCacheState {
  cacheSize: number;
  cacheCount: number;
  loading: boolean;
  error: Error | null;
}

interface ImageCacheHandlers {
  cacheImage: (imageUrl: string, options?: CacheOptions) => Promise<string>;
  getCachedImage: (imageUrl: string) => Promise<string | null>;
  clearCache: () => Promise<void>;
  clearOldCache: (maxAgeInDays: number) => Promise<void>;
}

interface CacheOptions {
  maxAge?: number; // em dias
  forceRefresh?: boolean;
}

const DEFAULT_OPTIONS: CacheOptions = {
  maxAge: 7, // 7 dias
  forceRefresh: false,
};

const CACHE_DIRECTORY = `${FileSystem.cacheDirectory}image_cache/`;

export function useImageCache(): [ImageCacheState, ImageCacheHandlers] {
  const [state, setState] = useState<ImageCacheState>({
    cacheSize: 0,
    cacheCount: 0,
    loading: false,
    error: null,
  });

  // Inicializa o diretório de cache
  useEffect(() => {
    initializeCache();
  }, []);

  const initializeCache = useCallback(async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
        loggingService.info('Diretório de cache criado');
      }

      await updateCacheStats();
    } catch (err) {
      loggingService.error('Erro ao inicializar cache', { error: err });
    }
  }, []);

  const updateCacheStats = useCallback(async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIRECTORY}${file}`, { size: true });
        if (fileInfo.exists) {
          totalSize += fileInfo.size || 0;
        }
      }

      setState(prev => ({
        ...prev,
        cacheSize: totalSize,
        cacheCount: files.length,
      }));

      loggingService.info('Estatísticas do cache atualizadas', {
        size: totalSize,
        count: files.length,
      });
    } catch (err) {
      loggingService.error('Erro ao atualizar estatísticas do cache', { error: err });
    }
  }, []);

  const getCacheKey = useCallback((url: string): string => {
    // Cria uma chave única baseada na URL
    return url.split('/').pop() || url;
  }, []);

  const isCacheValid = useCallback(async (filePath: string, maxAge: number): Promise<boolean> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return false;
      }

      const fileAge = (Date.now() - (fileInfo.modificationTime || 0)) / (1000 * 60 * 60 * 24);
      return fileAge <= maxAge;
    } catch (err) {
      loggingService.error('Erro ao verificar validade do cache', { error: err });
      return false;
    }
  }, []);

  const cacheImage = useCallback(
    async (imageUrl: string, options: CacheOptions = {}) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const finalOptions = { ...DEFAULT_OPTIONS, ...options };

        const cacheKey = getCacheKey(imageUrl);
        const filePath = `${CACHE_DIRECTORY}${cacheKey}`;

        // Verifica se o arquivo já está em cache e é válido
        if (!finalOptions.forceRefresh && (await isCacheValid(filePath, finalOptions.maxAge))) {
          loggingService.info('Imagem encontrada em cache válido', { url: imageUrl });
          return filePath;
        }

        // Faz download da imagem
        const downloadResult = await FileSystem.downloadAsync(imageUrl, filePath);
        if (!downloadResult.status === 200) {
          throw new Error('Falha ao baixar imagem');
        }

        await updateCacheStats();

        loggingService.info('Imagem adicionada ao cache', { url: imageUrl });
        return filePath;
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao adicionar imagem ao cache', { error: err });
        throw err;
      }
    },
    [getCacheKey, isCacheValid, updateCacheStats]
  );

  const getCachedImage = useCallback(
    async (imageUrl: string): Promise<string | null> => {
      try {
        const cacheKey = getCacheKey(imageUrl);
        const filePath = `${CACHE_DIRECTORY}${cacheKey}`;

        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (!fileInfo.exists) {
          return null;
        }

        if (await isCacheValid(filePath, DEFAULT_OPTIONS.maxAge)) {
          return filePath;
        }

        // Remove arquivo expirado
        await FileSystem.deleteAsync(filePath);
        await updateCacheStats();

        return null;
      } catch (err) {
        loggingService.error('Erro ao obter imagem do cache', { error: err });
        return null;
      }
    },
    [getCacheKey, isCacheValid, updateCacheStats]
  );

  const clearCache = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
      for (const file of files) {
        await FileSystem.deleteAsync(`${CACHE_DIRECTORY}${file}`);
      }

      await updateCacheStats();

      loggingService.info('Cache limpo com sucesso');
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao limpar cache', { error: err });
      throw err;
    }
  }, [updateCacheStats]);

  const clearOldCache = useCallback(
    async (maxAgeInDays: number) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
        let clearedCount = 0;

        for (const file of files) {
          const filePath = `${CACHE_DIRECTORY}${file}`;
          if (!(await isCacheValid(filePath, maxAgeInDays))) {
            await FileSystem.deleteAsync(filePath);
            clearedCount++;
          }
        }

        await updateCacheStats();

        loggingService.info('Cache antigo limpo com sucesso', { clearedCount });
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao limpar cache antigo', { error: err });
        throw err;
      }
    },
    [isCacheValid, updateCacheStats]
  );

  return [
    state,
    {
      cacheImage,
      getCachedImage,
      clearCache,
      clearOldCache,
    },
  ];
}
