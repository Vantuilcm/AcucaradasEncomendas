import React, { createContext, useContext } from 'react';
import { getThemeStyles, useTheme } from '../hooks/useTheme';

// Definindo a interface do tema para garantir compatibilidade com os componentes existentes
interface ThemeType {
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    card: string;
    surface: string;
    outline: string;
    disabled: string;
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
  setMode: (mode: 'light' | 'dark' | 'system') => Promise<void>;
  toggleTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [{ mode, isDark }, { setMode, toggleTheme }] = useTheme();

  // Criando o objeto de tema diretamente no ThemeProvider
  const theme: ThemeType = getThemeStyles(isDark);

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
