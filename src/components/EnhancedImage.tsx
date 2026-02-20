import React, { memo, useState, useEffect, useRef } from 'react';
import {
  Image,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  ViewStyle,
  ImageStyle,
  ImageProps,
  StyleProp,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { File, Directory, Paths } from '../utils/fs-shim';
import { SHA1 } from 'crypto-js';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

// Removido BlurView não utilizado

// Tipos de placeholder
export enum PlaceholderType {
  ACTIVITY_INDICATOR = 'activity_indicator',
  BLUR = 'blur',
  SKELETON = 'skeleton',
  NONE = 'none',
}

// Props do componente
interface EnhancedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  style?: StyleProp<ImageStyle>;
  placeholderType?: PlaceholderType;
  placeholderColor?: string;
  thumbnailSource?: { uri: string } | number;
  cacheTimeout?: number; // tempo em ms (padrão: 7 dias)
  onLoad?: () => void;
  onError?: () => void;
  lowResFirst?: boolean; // carregar primeiro uma versão de baixa resolução
  containerStyle?: StyleProp<ViewStyle>;
  priority?: 'low' | 'normal' | 'high';
  lazy?: boolean; // habilitar lazy loading
}

// Configurações de cache usando a nova API
const IMAGE_CACHE_DIR = new Directory(Paths.cache, 'enhanced-images');
const ONE_DAY_IN_MS = 86400000;
const DEFAULT_CACHE_TIMEOUT = ONE_DAY_IN_MS * 7; // 7 dias

export const EnhancedImage = memo((props: EnhancedImageProps) => {
  const {
    source,
    style,
    placeholderType = PlaceholderType.ACTIVITY_INDICATOR,
    placeholderColor,
    thumbnailSource,
    cacheTimeout = DEFAULT_CACHE_TIMEOUT,
    onLoad,
    onError,
    lowResFirst = false,
    containerStyle,
    priority = 'normal',
    lazy = true,
    ...otherProps
  } = props;

  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  // Removido estado não utilizado
  const mainImageOpacity = useRef(new Animated.Value(0)).current;
  const thumbnailOpacity = useRef(new Animated.Value(0)).current;
  const [isInView, setIsInView] = useState(!lazy); // se não for lazy, já está em view

  // Se for uma imagem local, não precisamos fazer cache
  const isRemoteImage = typeof source !== 'number' && source.uri && source.uri.startsWith('http');

  // Função para animação de fade in
  const fadeIn = (animatedValue: Animated.Value) => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Observar quando o componente entra na tela
  useEffect(() => {
    if (!lazy) {
      setIsInView(true);
      return;
    }

    // Aqui poderia ser implementado o IntersectionObserver,
    // mas como estamos no React Native, gerenciamos isso de outra forma
    // Usando ViewabilityConfig do FlatList ou uma solução personalizada

    // Para simplificar, vamos assumir que o componente está visível após 100ms
    const timer = setTimeout(() => {
      setIsInView(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [lazy]);

  // Carregar e cachear a imagem
  useEffect(() => {
    if (!isInView) return; // Não carregar se não estiver visível (lazy loading)

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
            if (onLoad) onLoad();
            fadeIn(mainImageOpacity);
            return;
          }
        }

        // Download e cache da imagem
        setLoading(true);
        await File.downloadFileAsync(remoteUri, destinationFile, { idempotent: true });
        setImageUri(destinationFile.uri);
        setLoading(false);
        if (onLoad) onLoad();
        fadeIn(mainImageOpacity);
      } catch (e) {
        logger.error('Erro ao processar o cache da imagem:', e instanceof Error ? e : new Error(String(e)));
        setImageUri(remoteUri); // Fallback para URL remota em caso de erro
        setError(true);
        setLoading(false);
        if (onError) onError();
      }
    };

    setupCache();
  }, [isRemoteImage, source, cacheTimeout, isInView, onLoad, onError, mainImageOpacity]);

  // Renderizar o placeholder enquanto carrega
  const renderPlaceholder = () => {
    if (!loading) return null;

    switch (placeholderType) {
      case PlaceholderType.ACTIVITY_INDICATOR:
        return (
          <View
            style={[
              styles.placeholder,
              { backgroundColor: placeholderColor || theme.colors.surfaceVariant },
            ]}
          >
            <ActivityIndicator color={theme.colors.primary} size="small" />
          </View>
        );

      case PlaceholderType.SKELETON:
        return (
          <View
            style={[
              styles.placeholder,
              { backgroundColor: placeholderColor || theme.colors.surfaceVariant },
            ]}
          >
            <Animated.View
              style={[
                styles.skeletonAnimation,
                {
                  backgroundColor: theme.colors.background,
                  opacity: new Animated.Value(0.3), // Começar com baixa opacidade
                },
              ]}
            />
          </View>
        );

      case PlaceholderType.BLUR:
        return thumbnailSource ? (
          <Image
            source={thumbnailSource}
            style={[StyleSheet.absoluteFill, style]}
            blurRadius={Platform.OS === 'ios' ? 10 : 5}
            onLoad={() => {
              // Anima a thumbnail quando carregada
              fadeIn(thumbnailOpacity);
            }}
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              { backgroundColor: placeholderColor || theme.colors.surfaceVariant },
            ]}
          />
        );

      default:
        return null;
    }
  };

  // Renderizar mensagem de erro
  if (error) {
    // Fallback para imagem original em caso de erro
    return (
      <Image
        source={typeof source === 'number' ? source : { uri: (source as { uri: string }).uri }}
        style={style}
        resizeMode={otherProps.resizeMode || 'cover'}
        {...otherProps}
      />
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Placeholder ou thumbnail */}
      {renderPlaceholder()}

      {/* Thumbnail com blur para carregamento progressivo (opcional) */}
      {thumbnailSource && placeholderType === PlaceholderType.BLUR && (
        <Animated.Image
          source={thumbnailSource}
          style={[StyleSheet.absoluteFill, style, { opacity: thumbnailOpacity }]}
          blurRadius={Platform.OS === 'ios' ? 15 : 5}
        />
      )}

      {/* Imagem principal */}
      {imageUri && (
        <Animated.Image
          source={{ uri: imageUri }}
          style={[style, { opacity: mainImageOpacity }]}
          resizeMode={otherProps.resizeMode || 'cover'}
          fadeDuration={0} // Controlamos o fade com Animated
          progressiveRenderingEnabled={Platform.OS === 'android'}
          defaultSource={typeof source === 'number' ? source : undefined}
          {...otherProps}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonAnimation: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3, // Iniciar com baixa opacidade
  },
});
