import React, { memo, useState, useEffect } from 'react';
import { Image, View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { File, Directory, Paths } from '../utils/fs-shim';
import { SHA1 } from 'crypto-js';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

interface OptimizedImageProps {
  source: { uri: string } | number;
  style: any;
  placeholder?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  priority?: 'low' | 'normal' | 'high';
  cacheTimeout?: number; // tempo em ms (padrão: 7 dias)
}

const IMAGE_CACHE_DIR = new Directory(Paths.cache, 'optimized-images');
const ONE_DAY_IN_MS = 86400000;
const DEFAULT_CACHE_TIMEOUT = ONE_DAY_IN_MS * 7; // 7 dias

export const OptimizedImage = memo(
  ({
    source,
    style,
    placeholder,
    resizeMode = 'cover',
    priority = 'normal',
    cacheTimeout = DEFAULT_CACHE_TIMEOUT,
  }: OptimizedImageProps) => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);

    // Se for uma imagem local, não precisamos fazer cache
    const isRemoteImage = typeof source !== 'number' && source.uri && source.uri.startsWith('http');

    useEffect(() => {
      if (!isRemoteImage) {
        setImageUri(typeof source === 'number' ? null : source.uri);
        setLoading(false);
        return;
      }

      const remoteUri = (source as { uri: string }).uri;
      const filename = `${SHA1(remoteUri)}.jpg`;
      const destinationFile = new File(IMAGE_CACHE_DIR, filename);

      const setupCache = async () => {
        try {
          // Verifica se o diretório de cache existe, senão cria
          if (!IMAGE_CACHE_DIR.exists) {
            IMAGE_CACHE_DIR.create({ intermediates: true, idempotent: true });
          }

          // Verifica se a imagem está em cache e não está expirada
          if (destinationFile.exists) {
            const fileTimestamp = destinationFile.modificationTime || 0;
            const now = Date.now();
            const isExpired = now - fileTimestamp > cacheTimeout;

            if (!isExpired) {
              setImageUri(destinationFile.uri);
              setLoading(false);
              return;
            }
          }

          // Download e cache da imagem
          setLoading(true);
          await File.downloadFileAsync(remoteUri, destinationFile, { idempotent: true });
          setImageUri(destinationFile.uri);
          setLoading(false);
        } catch (e) {
          logger.error('Erro ao processar o cache da imagem:', e instanceof Error ? e : new Error(String(e)));
          setImageUri(remoteUri); // Fallback para URL remota em caso de erro
          setError(true);
          setLoading(false);
        }
      };

      setupCache();
    }, [isRemoteImage, source, cacheTimeout]);

    if (loading) {
      return (
        <View style={[styles.placeholder, style, { backgroundColor: theme.colors.surfaceVariant }]}>
          {placeholder || <ActivityIndicator color={theme.colors.primary} size="small" />}
        </View>
      );
    }

    if (error || !imageUri) {
      // Fallback para imagem original em caso de erro
      return (
        <Image
          source={typeof source === 'number' ? source : { uri: (source as { uri: string }).uri }}
          style={style}
          resizeMode={resizeMode}
        />
      );
    }

    return (
      <Image
        source={{ uri: imageUri }}
        style={style}
        resizeMode={resizeMode}
        fadeDuration={Platform.OS === 'ios' ? 300 : 700}
        progressiveRenderingEnabled={true}
        defaultSource={typeof source === 'number' ? source : undefined}
      />
    );
  }
);

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
