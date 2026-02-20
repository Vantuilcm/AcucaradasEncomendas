import { Platform } from 'react-native';
import { File, Directory, Paths } from '../utils/fs-shim';

export class PerformanceOptimizer {
  static async clearImageCache() {
    if (Platform.OS === 'ios') {
      // Ajuste de construtor: Directory requer dois argumentos (base + nome)
      const cacheDir = new Directory(Paths.cache, '');
      if (cacheDir.exists) {
        // Alguns ambientes n�o exp�em 'delete' tipado em Directory; usar cast defensivo
        (cacheDir as any).delete?.();
      }
    }
  }

  static enableImageLazyLoading(imageRef: any) {
    return {
      ...imageRef,
      loading: 'lazy',
      placeholder: 'blur',
    };
  }
}
