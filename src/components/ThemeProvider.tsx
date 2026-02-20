import React, { createContext, useContext } from 'react';
import { useTheme } from '../hooks/useTheme';
import * as Paper from 'react-native-paper';

// Definindo a interface do tema para garantir compatibilidade com os componentes existentes
interface ThemeType {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    surface: string;
    error: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    border: string;
    notification: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  mode: 'light' | 'dark' | 'system';
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [{ mode, isDark }, { setMode, toggleTheme }] = useTheme();

  // Criando o objeto de tema diretamente no ThemeProvider
  const theme: ThemeType = {
    colors: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      background: isDark ? '#121212' : '#FFFFFF',
      card: isDark ? '#1E1E1E' : '#F5F5F5',
      surface: isDark ? '#1E1E1E' : '#FFFFFF',
      error: '#E53935',
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

  // Criar o tema do React Native Paper baseado no nosso tema
  const paperTheme = {
    ...(isDark ? Paper.MD3DarkTheme : Paper.MD3LightTheme),
    colors: {
      ...(isDark ? Paper.MD3DarkTheme.colors : Paper.MD3LightTheme.colors),
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      background: theme.colors.background,
      surface: theme.colors.surface,
      error: theme.colors.error,
    },
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: isDark ?? false,
        mode: (mode ?? 'system') as 'light' | 'dark' | 'system',
        setMode: (m: 'light' | 'dark' | 'system') => {
          if (setMode) setMode(m);
        },
        toggleTheme: (d: boolean) => {
          if (toggleTheme) toggleTheme(d);
        },
      }}
    >
      <Paper.Provider theme={paperTheme}>
        {children}
      </Paper.Provider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
