import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export class PerformanceOptimizer {
  static async clearImageCache() {
    if (Platform.OS === 'ios') {
      const cacheDir = FileSystem.cacheDirectory;
      await FileSystem.deleteAsync(cacheDir, { idempotent: true });
    }
  }

  static enableImageLazyLoading(imageRef) {
    return {
      ...imageRef,
      loading: 'lazy',
      placeholder: 'blur',
    };
  }
}
