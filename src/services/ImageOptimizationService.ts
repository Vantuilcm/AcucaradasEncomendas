import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

/**
 * Configurações de otimização de imagem para diferentes cenários
 */
export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  compressionQuality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  base64?: boolean;
}

/**
 * Configurações padrão para diferentes tipos de imagens
 */
export const ImageOptimizationDefaults = {
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    compressionQuality: 0.7,
    format: 'jpeg',
  },
  medium: {
    maxWidth: 800,
    maxHeight: 800,
    compressionQuality: 0.8,
    format: 'jpeg',
  },
  profile: {
    maxWidth: 400,
    maxHeight: 400,
    compressionQuality: 0.85,
    format: 'jpeg',
  },
  product: {
    maxWidth: 1200,
    maxHeight: 1200,
    compressionQuality: 0.85,
    format: 'jpeg',
  },
};

class ImageOptimizationService {
  private static instance: ImageOptimizationService;

  private constructor() {}

  /**
   * Retorna a instância singleton do serviço
   */
  public static getInstance(): ImageOptimizationService {
    if (!ImageOptimizationService.instance) {
      ImageOptimizationService.instance = new ImageOptimizationService();
    }
    return ImageOptimizationService.instance;
  }

  /**
   * Otimiza uma imagem a partir de sua URI
   * @param imageUri URI da imagem a ser otimizada
   * @param options Opções de otimização
   * @returns URI da imagem otimizada
   */
  public async optimizeImage(
    imageUri: string,
    options: ImageOptimizationOptions = ImageOptimizationDefaults.medium
  ): Promise<string> {
    try {
      // Normalizar a URI para que funcione tanto em iOS quanto em Android
      const normalizedUri = this.normalizeUri(imageUri);

      // Verificar se a imagem existe
      const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
      if (!fileInfo.exists) {
        throw new Error('Imagem não encontrada: ' + normalizedUri);
      }

      // Ajustar tamanho da imagem e comprimir
      const actions: ImageManipulator.Action[] = [];

      // Adicionar ação de redimensionamento se maxWidth ou maxHeight estiverem definidos
      if (options.maxWidth || options.maxHeight) {
        actions.push({
          resize: {
            width: options.maxWidth,
            height: options.maxHeight,
          },
        });
      }

      // Realizar a manipulação da imagem
      const manipResult = await ImageManipulator.manipulateAsync(normalizedUri, actions, {
        compress: options.compressionQuality || 0.8,
        format: options.format || ImageManipulator.SaveFormat.JPEG,
        base64: options.base64 || false,
      });

      // Retornar a URI da imagem otimizada
      return manipResult.uri;
    } catch (error) {
      console.error('Erro ao otimizar imagem:', error);
      // Em caso de erro, retorna a URI original
      return imageUri;
    }
  }

  /**
   * Otimiza uma imagem para upload, retornando os dados como base64
   * @param imageUri URI da imagem
   * @param options Opções de otimização
   * @returns Dados da imagem em base64
   */
  public async optimizeForUpload(
    imageUri: string,
    options: ImageOptimizationOptions = ImageOptimizationDefaults.medium
  ): Promise<{ uri: string; base64?: string; fileSize: number }> {
    try {
      // Garantir que a opção base64 esteja habilitada
      const uploadOptions = {
        ...options,
        base64: true,
      };

      // Otimizar a imagem
      const optimizedUri = await this.optimizeImage(imageUri, uploadOptions);

      // Obter informações do arquivo
      const fileInfo = await FileSystem.getInfoAsync(optimizedUri);

      // Obter dados em base64 se necessário
      let base64: string | undefined;

      if (uploadOptions.base64) {
        // Se o resultado já contiver base64, usar; caso contrário, ler o arquivo
        if (optimizedUri.includes('base64,')) {
          base64 = optimizedUri.split('base64,')[1];
        } else {
          base64 = await FileSystem.readAsStringAsync(optimizedUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      }

      return {
        uri: optimizedUri,
        base64,
        fileSize: fileInfo.size || 0,
      };
    } catch (error) {
      console.error('Erro ao otimizar imagem para upload:', error);
      throw error;
    }
  }

  /**
   * Preparar imagem para exibição em alta resolução
   * @param imageUri URI da imagem
   * @returns URI da imagem otimizada para exibição
   */
  public async prepareForDisplay(imageUri: string): Promise<string> {
    // Utilizar configurações otimizadas para exibição
    return this.optimizeImage(imageUri, {
      ...ImageOptimizationDefaults.medium,
      compressionQuality: 0.9, // Maior qualidade para exibição
    });
  }

  /**
   * Preparar imagem como miniatura para listas e grids
   * @param imageUri URI da imagem
   * @returns URI da imagem miniatura
   */
  public async createThumbnail(imageUri: string): Promise<string> {
    // Utilizar configurações para miniatura
    return this.optimizeImage(imageUri, ImageOptimizationDefaults.thumbnail);
  }

  /**
   * Normaliza a URI da imagem para garantir compatibilidade
   * @param uri URI da imagem
   * @returns URI normalizada
   */
  private normalizeUri(uri: string): string {
    // Tratar URIs de diferentes fontes
    if (uri.startsWith('ph://')) {
      // URIs do tipo ph:// são específicas do iOS para Photos Library
      return uri;
    }

    // Tratar file:// URIs
    if (uri.startsWith('file://')) {
      return uri;
    }

    // Adicionar prefixo file:// para URIs locais sem prefixo
    if (!uri.includes('://')) {
      return `file://${uri}`;
    }

    // Tratar URIs de content:// (Android content provider)
    if (uri.startsWith('content://')) {
      return uri;
    }

    // Outros tipos de URIs
    return uri;
  }

  /**
   * Estima o tamanho da imagem após a otimização
   * @param originalFileSize Tamanho original do arquivo em bytes
   * @param compressionQuality Qualidade da compressão (0-1)
   * @returns Tamanho estimado em bytes
   */
  public estimateOptimizedSize(originalFileSize: number, compressionQuality: number = 0.8): number {
    // Estimativa simplificada baseada na qualidade de compressão
    // Nota: Isto é apenas uma aproximação
    return Math.round(originalFileSize * compressionQuality);
  }
}

export default ImageOptimizationService.getInstance();
