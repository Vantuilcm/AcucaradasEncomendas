import React, { createContext, useContext } from 'react';
import { useTheme } from '../hooks/useTheme';

// Definindo a interface do tema para garantir compatibilidade com os componentes existentes
interface ThemeType {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    card: string;
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

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        mode,
        setMode,
        toggleTheme,
      }}
    >
      {children}
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
