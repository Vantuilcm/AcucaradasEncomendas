import { useCallback, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@app_theme';
type ThemeMode = 'light' | 'dark' | 'system';
type ThemeState = { mode: ThemeMode; isDark: boolean };
type ThemeActions = { setMode: (newMode: ThemeMode) => Promise<void>; toggleTheme: (newIsDark: boolean) => void };

// Função para obter estilos do tema baseado no modo escuro/claro
export function getThemeStyles(isDark: boolean) {
  return {
    colors: {
      primary: '#5B21B6', // Roxo profundo mais premium (Violet 800)
      secondary: '#7C3AED', // Roxo vibrante (Violet 600)
      accent: '#8B5CF6', // Violet 500
      tertiary: '#4C1D95', // Violet 900 para contrastes fortes
      success: '#059669', // Verde esmeralda premium (Emerald 600)
      warning: '#D97706', // Amber 600
      error: '#DC2626', // Red 600
      info: '#4F46E5', // Indigo 600
      background: isDark ? '#0F0F1A' : '#F5F3FF', // Fundo levemente mais frio/roxo
      card: isDark ? '#1A1A2E' : '#FFFFFF',
      surface: isDark ? '#1F1F35' : '#FFFFFF',
      outline: isDark ? '#3F3F5A' : '#DDD6FE', // Outline com tom de violeta claro
      disabled: isDark ? '#4B4B6A' : '#E5E7EB',
      text: {
        primary: isDark ? '#F9FAFB' : '#1E1B4B', // Texto primário azul escuro profundo
        secondary: isDark ? '#D1D5DB' : '#475569', // Slate 600
        disabled: isDark ? '#9CA3AF' : '#94A3B8',
      },
      border: isDark ? '#2D2D44' : '#E5E7EB',
      notification: '#7C3AED',
      surfaceVariant: isDark ? '#2D2D44' : '#F3F4F6',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 8, // Bordas levemente mais arredondadas
      md: 14, // Look premium
      lg: 22,
      xl: 32,
    },
    shadows: {
      light: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      },
      medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
      },
    }
  };
}

export function useTheme(): [ThemeState, ThemeActions] {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [mode, setMode] = useState<ThemeMode>('system');

  // Efeito para carregar o tema salvo ao inicializar
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY + '_mode');
          setMode((savedMode as 'light' | 'dark' | 'system') || 'system');
          setIsDark(savedTheme === 'dark');
        } else {
          // Se não houver tema salvo, use o tema do sistema
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Erro ao carregar tema:', error);
      }
    };

    loadSavedTheme();
  }, [systemColorScheme]);

  // Efeito para atualizar o tema quando o modo do sistema mudar
  useEffect(() => {
    if (mode === 'system') {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, mode]);

  const toggleTheme = useCallback((newIsDark: boolean) => {
    setIsDark(newIsDark);
  }, []);

  const setThemeMode = useCallback(
    async (newMode: ThemeMode) => {
      setMode(newMode);

      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY + '_mode', newMode);

        if (newMode === 'light') {
          setIsDark(false);
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
        } else if (newMode === 'dark') {
          setIsDark(true);
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
        } else {
          // Modo sistema
          const newIsDark = systemColorScheme === 'dark';
          setIsDark(newIsDark);
          await AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Erro ao salvar tema:', error);
      }
    },
    [systemColorScheme]
  );

  return [
    { mode, isDark },
    { setMode: setThemeMode, toggleTheme },
  ];
}
