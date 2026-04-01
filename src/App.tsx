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
try {
  initSentry();
} catch (error) {
  console.error('Erro ao inicializar Sentry:', error);
}

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
          primary: theme?.colors?.primary || '#000000', 
          secondary: theme?.colors?.secondary || '#000000', 
          tertiary: theme?.colors?.tertiary || '#000000',
          background: theme?.colors?.background || '#000000', 
          surface: theme?.colors?.surface || '#000000', 
          error: theme?.colors?.error || '#FF0000', 
          onSurface: theme?.colors?.text?.primary || '#FFFFFF', 
          onBackground: theme?.colors?.text?.primary || '#FFFFFF',
          surfaceVariant: theme?.colors?.surfaceVariant || '#000000',
          outline: theme?.colors?.outline || '#000000',
        },
        roundness: 3.5, // 3.5 * 4 = 14px (md borderRadius)
      } 
    : { 
        ...MD3LightTheme, 
        colors: { 
          ...MD3LightTheme.colors, 
          primary: theme?.colors?.primary || '#000000', 
          secondary: theme?.colors?.secondary || '#000000', 
          tertiary: theme?.colors?.tertiary || '#000000',
          background: theme?.colors?.background || '#FFFFFF', 
          surface: theme?.colors?.surface || '#FFFFFF', 
          error: theme?.colors?.error || '#B00020', 
          onSurface: theme?.colors?.text?.primary || '#000000', 
          onBackground: theme?.colors?.text?.primary || '#000000',
          surfaceVariant: theme?.colors?.surfaceVariant || '#EEEEEE',
          outline: theme?.colors?.outline || '#79747E',
        },
        roundness: 3.5,
      };

  return (
    <PaperProvider theme={paperTheme}>
      <View style={{ flex: 1, backgroundColor: theme?.colors?.background || (isDark ? '#000000' : '#FFFFFF') }} testID="app-container">
        <StatusBar style={isDark ? "light" : "dark"} />
        <AppNavigator />
      </View>
    </PaperProvider>
  );
}

export default function App() {
  console.log('App: Renderizando árvore completa de Providers com Proteção 440');
  
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
