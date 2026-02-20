import { useState, useCallback, useEffect } from 'react';
import { File, Directory, Paths } from '../utils/fs-shim';
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

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  maxAge: 7, // 7 dias
  forceRefresh: false,
};

const CACHE_DIRECTORY = new Directory(Paths.cache, 'image_cache');

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
      if (!CACHE_DIRECTORY.exists) {
        CACHE_DIRECTORY.create({ intermediates: true, idempotent: true });
        loggingService.info('Diretório de cache criado');
      }

      await updateCacheStats();
    } catch (err) {
      loggingService.error(
        'Erro ao inicializar cache',
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }, []);

  const updateCacheStats = useCallback(async () => {
    try {
      const entries = CACHE_DIRECTORY.list();
      let totalSize = 0;
      let fileCount = 0;

      for (const entry of entries) {
        if (entry instanceof File) {
          totalSize += entry.size || 0;
          fileCount += 1;
        }
      }

      setState(prev => ({
        ...prev,
        cacheSize: totalSize,
        cacheCount: fileCount,
      }));

      loggingService.info('Estatísticas do cache atualizadas', {
        size: totalSize,
        count: fileCount,
      });
    } catch (err) {
      loggingService.error(
        'Erro ao atualizar estatísticas do cache',
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }, []);

  const getCacheKey = useCallback((url: string): string => {
    // Cria uma chave única baseada na URL
    return url.split('/').pop() || url;
  }, []);

  const isCacheValid = useCallback(async (filePath: string, maxAge: number): Promise<boolean> => {
    try {
      const f = new File(filePath);
      if (!f.exists) {
        return false;
      }

      const modified = f.modificationTime ?? 0;
      const fileAge = (Date.now() - modified) / (1000 * 60 * 60 * 24);
      return modified > 0 && fileAge <= maxAge;
    } catch (err) {
      loggingService.error(
        'Erro ao verificar validade do cache',
        err instanceof Error ? err : new Error(String(err))
      );
      return false;
    }
  }, []);

  const cacheImage = useCallback(
    async (imageUrl: string, options: CacheOptions = {}) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const finalOptions = { ...DEFAULT_OPTIONS, ...options };

        const cacheKey = getCacheKey(imageUrl);
        const destinationFile = new File(CACHE_DIRECTORY, cacheKey);

        // Verifica se o arquivo já está em cache e é válido
        if (!finalOptions.forceRefresh && (await isCacheValid(destinationFile.uri, finalOptions.maxAge))) {
          loggingService.info('Imagem encontrada em cache válido', { url: imageUrl });
          return destinationFile.uri;
        }

        // Faz download da imagem (novo API)
        await File.downloadFileAsync(imageUrl, destinationFile, { idempotent: true });

        await updateCacheStats();

        loggingService.info('Imagem adicionada ao cache', { url: imageUrl });
        return destinationFile.uri;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorObj,
        }));
        loggingService.error('Erro ao adicionar imagem ao cache', errorObj);
        throw errorObj;
      }
    },
    [getCacheKey, isCacheValid, updateCacheStats]
  );

  const getCachedImage = useCallback(
    async (imageUrl: string): Promise<string | null> => {
      try {
        const cacheKey = getCacheKey(imageUrl);
        const destinationFile = new File(CACHE_DIRECTORY, cacheKey);

        if (!destinationFile.exists) {
          return null;
        }

        if (await isCacheValid(destinationFile.uri, DEFAULT_OPTIONS.maxAge)) {
          return destinationFile.uri;
        }

        // Remove arquivo expirado
        destinationFile.delete();
        await updateCacheStats();

        return null;
      } catch (err) {
        loggingService.error(
          'Erro ao obter imagem do cache',
          err instanceof Error ? err : new Error(String(err))
        );
        return null;
      }
    },
    [getCacheKey, isCacheValid, updateCacheStats]
  );

  const clearCache = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const entries = CACHE_DIRECTORY.list();
      for (const entry of entries) {
        if (entry instanceof File) {
          entry.delete();
        } else {
          // If any subdirectories exist, delete them to ensure full cleanup
          (entry as Directory).delete();
        }
      }

      await updateCacheStats();

      loggingService.info('Cache limpo com sucesso');
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorObj,
      }));
      loggingService.error('Erro ao limpar cache', errorObj);
      throw errorObj;
    }
  }, [updateCacheStats]);

  const clearOldCache = useCallback(
    async (maxAgeInDays: number) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const entries = CACHE_DIRECTORY.list();
        let clearedCount = 0;

        for (const entry of entries) {
          if (entry instanceof File) {
            if (!(await isCacheValid(entry.uri, maxAgeInDays))) {
              entry.delete();
              clearedCount++;
            }
          }
        }

        await updateCacheStats();

        loggingService.info('Cache antigo limpo com sucesso', { clearedCount });
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorObj,
        }));
        loggingService.error('Erro ao limpar cache antigo', errorObj);
        throw errorObj;
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
