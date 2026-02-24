import { useCallback, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('system');

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
