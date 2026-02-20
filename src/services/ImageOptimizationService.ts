import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import LoggingService from './LoggingService';

const logger = LoggingService.getInstance();

/**
 * Configurações de otimização de imagem para diferentes cenários
 */
export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  compressionQuality?: number;
  // Usar o tipo SaveFormat do ImageManipulator para evitar conflitos de tipos
  format?: ImageManipulator.SaveFormat;
  base64?: boolean;
}

/**
 * Configurações padrão para diferentes tipos de imagens
 */
export const ImageOptimizationDefaults: Record<string, ImageOptimizationOptions> = {
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    compressionQuality: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  },
  medium: {
    maxWidth: 800,
    maxHeight: 800,
    compressionQuality: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  },
  profile: {
    maxWidth: 400,
    maxHeight: 400,
    compressionQuality: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  },
  product: {
    maxWidth: 1200,
    maxHeight: 1200,
    compressionQuality: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
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
   * Constrói a lista de ações de manipulação de acordo com as opções
   */
  private buildActions(options: ImageOptimizationOptions): ImageManipulator.Action[] {
    const actions: ImageManipulator.Action[] = [];

    if (options.maxWidth || options.maxHeight) {
      actions.push({
        resize: {
          width: options.maxWidth,
          height: options.maxHeight,
        },
      });
    }

    return actions;
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
      const info = await FileSystem.getInfoAsync(normalizedUri);
      if (!info.exists) {
        throw new Error('Imagem não encontrada: ' + normalizedUri);
      }

      // Ajustar tamanho da imagem e comprimir
      const actions = this.buildActions(options);

      // Opções de salvamento
      const manipOptions: ImageManipulator.SaveOptions = {
        compress: typeof options.compressionQuality === 'number' ? options.compressionQuality : 0.8,
        format: options.format ?? ImageManipulator.SaveFormat.JPEG,
        base64: options.base64 ?? false,
      };

      // Realizar a manipulação da imagem
      const manipResult = await ImageManipulator.manipulateAsync(normalizedUri, actions, manipOptions);

      // Retornar a URI da imagem otimizada
      return manipResult.uri;
    } catch (error) {
      logger.error('Erro ao otimizar imagem:', error instanceof Error ? error : new Error(String(error)));
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
      // Normalizar a URI
      const normalizedUri = this.normalizeUri(imageUri);

      // Verificar existência do arquivo
      const info = await FileSystem.getInfoAsync(normalizedUri);
      if (!info.exists) {
        throw new Error('Imagem não encontrada: ' + normalizedUri);
      }

      // Ações e opções para upload (forçar base64)
      const actions = this.buildActions({ ...options });
      const manipOptions: ImageManipulator.SaveOptions = {
        compress: typeof options.compressionQuality === 'number' ? options.compressionQuality : 0.8,
        format: options.format ?? ImageManipulator.SaveFormat.JPEG,
        base64: true,
      };

      const manipResult = await ImageManipulator.manipulateAsync(normalizedUri, actions, manipOptions);

      // Obter tamanho do arquivo resultante
      const outInfo = await FileSystem.getInfoAsync(manipResult.uri);
      const fileSize = (outInfo && (outInfo as any).size && typeof (outInfo as any).size === 'number') ? (outInfo as any).size : 0;

      return {
        uri: manipResult.uri,
        base64: manipResult.base64 ?? undefined,
        fileSize,
      };
    } catch (error) {
      logger.error('Erro ao otimizar imagem para upload:', error instanceof Error ? error : new Error(String(error)));
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

