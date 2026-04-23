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
      primary: '#FF4FD8',
      secondary: '#8A5CFF',
      tertiary: '#3B82F6',
      success: '#2DD4BF',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      background: isDark ? '#0F0B1A' : '#F9F7FF',
      card: isDark ? '#1A1526' : '#FFFFFF',
      surface: isDark ? '#1F1A2E' : '#FFFFFF',
      outline: isDark ? '#3A304D' : '#D4CCE8',
      disabled: isDark ? '#514A68' : '#C9C4D8',
      text: {
        primary: isDark ? '#F6F3FF' : '#1B1230',
        secondary: isDark ? '#C8C2DD' : '#5D5475',
        disabled: isDark ? '#7B7393' : '#B5ADC9',
      },
      border: isDark ? '#2C243B' : '#E6E0F2',
      notification: '#FF3D9A',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
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
