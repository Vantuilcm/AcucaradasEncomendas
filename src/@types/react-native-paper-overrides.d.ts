// Augment react-native-paper theme color types to include custom keys used across screens
import 'react-native-paper';

declare module 'react-native-paper' {
  export interface MD3Colors {
    success?: string;
    warning?: string;
    info?: string;
    disabled?: string;
    error?: string;
  }
}