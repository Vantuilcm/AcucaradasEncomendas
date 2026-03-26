import React from 'react';
import { LogBox, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import { ThemeProvider, useAppTheme } from './components/ThemeProvider';
import { initSentry } from './config/sentry';

// Inicializar Sentry (protegido por variáveis de ambiente)
initSentry();

// Ignorar warnings específicos durante desenvolvimento
if (LogBox) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
  ]);
}

function ThemedApp() {
  const { isDark, theme } = useAppTheme();
  
  // Mesclar o tema do Paper com o nosso tema customizado
  const paperTheme = isDark 
    ? { 
        ...MD3DarkTheme, 
        colors: { 
          ...MD3DarkTheme.colors, 
          primary: theme.colors.primary, 
          secondary: theme.colors.secondary, 
          tertiary: theme.colors.tertiary,
          background: theme.colors.background, 
          surface: theme.colors.surface, 
          error: theme.colors.error, 
          onSurface: theme.colors.text.primary, 
          onBackground: theme.colors.text.primary,
          surfaceVariant: theme.colors.surfaceVariant,
          outline: theme.colors.outline,
        },
        roundness: 3.5, // 3.5 * 4 = 14px (md borderRadius)
      } 
    : { 
        ...MD3LightTheme, 
        colors: { 
          ...MD3LightTheme.colors, 
          primary: theme.colors.primary, 
          secondary: theme.colors.secondary, 
          tertiary: theme.colors.tertiary,
          background: theme.colors.background, 
          surface: theme.colors.surface, 
          error: theme.colors.error, 
          onSurface: theme.colors.text.primary, 
          onBackground: theme.colors.text.primary,
          surfaceVariant: theme.colors.surfaceVariant,
          outline: theme.colors.outline,
        },
        roundness: 3.5,
      };

  return (
    <PaperProvider theme={paperTheme}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="app-container">
        <StatusBar style={isDark ? "light" : "dark"} />
        <AppNavigator />
      </View>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              <ThemedApp />
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

