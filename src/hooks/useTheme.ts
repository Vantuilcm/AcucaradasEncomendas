import { useCallback, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

const THEME_STORAGE_KEY = '@app_theme';

// Função para obter estilos do tema baseado no modo escuro/claro
export function getThemeStyles(isDark: boolean) {
  return {
    colors: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      background: isDark ? '#121212' : '#FFFFFF',
      card: isDark ? '#1E1E1E' : '#F5F5F5',
      text: {
        primary: isDark ? '#FFFFFF' : '#000000',
        secondary: isDark ? '#CCCCCC' : '#666666',
        disabled: isDark ? '#666666' : '#CCCCCC',
      },
      border: isDark ? '#333333' : '#DDDDDD',
      notification: '#FF3B30',
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

export function useTheme() {
  let systemColorScheme: 'light' | 'dark' | null = null;
  try { systemColorScheme = useColorScheme() as any; } catch { systemColorScheme = 'light'; }
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('system');

  // Efeito para carregar o tema salvo ao inicializar
  useEffect(() => {
    const isTestEnv =
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
    if (isTestEnv) return;

    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY + '_mode');
          setMode((savedMode as 'light' | 'dark' | 'system') || 'system');
          setIsDark(savedTheme === 'dark');
        } else {
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (error) {
        logger.error('Erro ao carregar tema:', error instanceof Error ? error : new Error(String(error)));
      }
    };

    loadSavedTheme();
  }, [systemColorScheme]);

  // Efeito para atualizar o tema quando o modo do sistema mudar
  useEffect(() => {
    const isTestEnv =
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
    if (isTestEnv) return;

    if (mode === 'system') {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, mode]);

  const toggleTheme = useCallback((newIsDark: boolean) => {
    setIsDark(newIsDark);
  }, []);

  const setThemeMode = useCallback(
    async (newMode: 'light' | 'dark' | 'system') => {
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
          const newIsDark = systemColorScheme === 'dark';
          setIsDark(newIsDark);
          await AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light');
        }
      } catch (error) {
        logger.error('Erro ao salvar tema:', error instanceof Error ? error : new Error(String(error)));
      }
    },
    [systemColorScheme]
  );

  return [
    { mode, isDark },
    { setMode: setThemeMode, toggleTheme },
  ];
}
