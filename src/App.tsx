import React, { useEffect } from 'react';
import { LogBox, View, AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import { ThemeProvider, useAppTheme } from './components/ThemeProvider';
import { initSentry } from './config/sentry';
import { initOneSignal } from './config/onesignal';
import { ENV } from './config/env';

// 🛡️ Monitoramento e Resiliência
import { initErrorGuard } from './core/monitoring/errorGuard';
import { logEvent, logInfo } from './core/monitoring/logger';
import { runHealthCheck } from './core/monitoring/healthCheck';
import { ErrorBoundary } from './core/monitoring/ErrorBoundary';
import { transportManager } from './core/monitoring/TransportManager';
import { DiagnosticScreen } from './core/monitoring/DiagnosticScreen';
import { TouchableOpacity, Text } from 'react-native';

// Inicializar Proteção Global de Erros
initErrorGuard();

// 🔍 Diagnóstico de Inicialização (Env Guardian)
logEvent('APP_START', '🚀 App Iniciado com Monitoramento Ativo');
const health = runHealthCheck(ENV);

if (__DEV__) {
  console.log('🧠 [HEALTH-CHECK]:', health);
}

// Inicializar Serviços Críticos
try {
  initSentry();
  initOneSignal();
} catch (error) {
  console.error('❌ Erro na inicialização de serviços:', error);
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

  // 🔄 Gerenciamento do Ciclo de Vida para Monitoramento (Etapa 7)
  useEffect(() => {
    // Tentar enviar logs pendentes na inicialização
    transportManager.flushLogs();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        logInfo('APP_START', '📱 App voltou para o foreground');
        transportManager.flushLogs();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
  
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
  const [showDiagnostic, setShowDiagnostic] = React.useState(false);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              <CartProvider>
                <ThemedApp />
                {__DEV__ && !showDiagnostic && (
                  <TouchableOpacity 
                    style={{ 
                      position: 'absolute', 
                      bottom: 20, 
                      right: 20, 
                      backgroundColor: 'rgba(0,0,0,0.5)', 
                      padding: 8, 
                      borderRadius: 20,
                      zIndex: 9999
                    }} 
                    onPress={() => setShowDiagnostic(true)}
                  >
                    <Text style={{ color: '#FFF', fontSize: 10 }}>🛠️ DIAG</Text>
                  </TouchableOpacity>
                )}
                {__DEV__ && showDiagnostic && (
                  <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 10000 }}>
                    <DiagnosticScreen onClose={() => setShowDiagnostic(false)} />
                  </View>
                )}
              </CartProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
